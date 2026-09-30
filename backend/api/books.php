<?php
// backend/api/books.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = Auth::requireAuth();
$id     = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

if ($action === 'issue')          { issueBook($user);      return; }
if ($action === 'return')         { returnBook($user);     return; }
if ($action === 'issued')         { listIssued($user);     return; }
if ($action === 'my_issued')      { myIssued($user);       return; }
if ($action === 'stats')          { bookStats($user);      return; }
if ($action === 'extend')         { extendDue($user);      return; }
if ($action === 'mark_fine_paid') { markFinePaid($user);   return; }
if ($action === 'all_history')    { allHistory($user);     return; }
if ($action === 'my_history')     { myHistory($user);      return; }
if ($action === 'upload_pdf')     { uploadBookPdf($id, $user);   return; }
if ($action === 'remove_pdf')     { removeBookPdf($id, $user);   return; }
if ($action === 'request_book')   { requestBook($user);           return; }
if ($action === 'my_requests')    { myRequests($user);            return; }
if ($action === 'all_requests')   { allRequests($user);           return; }
if ($action === 'handle_request') { handleRequest($id, $user);   return; }

match ($method) {
    'GET'    => $id ? getBook($id) : listBooks(),
    'POST'   => addBook($user),
    'PUT'    => updateBook($id, $user),
    'DELETE' => deleteBook($id, $user),
    default  => jsonResponse(['error' => 'Method not allowed'], 405),
};

// ── Book CRUD ──────────────────────────────────────────────────────────────

function listBooks(): void {
    $db     = Database::getConnection();
    $search   = $_GET['search']   ?? null;
    $category = $_GET['category'] ?? null;

    $where = [];
    $params = [];
    if ($search) {
        $where[] = '(title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ?)';
        $s = "%$search%";
        $params = array_merge($params, [$s, $s, $s, $s]);
    }
    if ($category) {
        $where[] = 'category = ?';
        $params[] = $category;
    }
    $sql = 'SELECT * FROM books' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY title';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getBook(string $id): void {
    $db = Database::getConnection();
    $db->exec("UPDATE book_issues SET status='overdue' WHERE status='issued' AND due_date < CURDATE()");
    $stmt = $db->prepare('SELECT * FROM books WHERE id = ?');
    $stmt->execute([$id]);
    $book = $stmt->fetch();
    if (!$book) jsonResponse(['error' => 'Book not found'], 404);

    $iStmt = $db->prepare("
        SELECT bi.*, u.name as student_name, s.roll_number
        FROM book_issues bi
        JOIN students s ON bi.student_id = s.id
        JOIN users u ON s.user_id = u.id
        WHERE bi.book_id = ?
        ORDER BY bi.issue_date DESC LIMIT 20
    ");
    $iStmt->execute([$id]);
    $book['issue_history'] = $iStmt->fetchAll();
    jsonResponse($book);
}

function addBook(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $body = getBody();
    if (empty($body['title'])) jsonResponse(['error' => 'title is required'], 422);

    $db = Database::getConnection();
    $db->prepare('INSERT INTO books (title, author, isbn, category, quantity, available_qty, description, online_link) VALUES (?,?,?,?,?,?,?,?)')
       ->execute([
           $body['title'], $body['author'] ?? null, $body['isbn'] ?? null,
           $body['category'] ?? null,
           $body['quantity'] ?? 1, $body['quantity'] ?? 1,
           $body['description'] ?? null,
           $body['online_link'] ?? null,
       ]);
    jsonResponse(['message' => 'Book added', 'id' => $db->lastInsertId()], 201);
}

function updateBook(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $body = getBody();
    $db   = Database::getConnection();

    $curr = $db->prepare('SELECT quantity, available_qty FROM books WHERE id = ?');
    $curr->execute([$id]);
    $book = $curr->fetch();
    $diff = ($body['quantity'] ?? $book['quantity']) - $book['quantity'];
    $newAvail = max(0, $book['available_qty'] + $diff);

    $db->prepare('UPDATE books SET title=?, author=?, isbn=?, category=?, quantity=?, available_qty=?, description=?, online_link=? WHERE id=?')
       ->execute([
           $body['title'], $body['author'] ?? null, $body['isbn'] ?? null,
           $body['category'] ?? null, $body['quantity'] ?? 1,
           $newAvail, $body['description'] ?? null,
           $body['online_link'] ?? null, $id,
       ]);
    jsonResponse(['message' => 'Book updated']);
}

function deleteBook(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $db = Database::getConnection();
    $check = $db->prepare("SELECT COUNT(*) FROM book_issues WHERE book_id = ? AND status IN ('issued','overdue')");
    $check->execute([$id]);
    if ($check->fetchColumn() > 0) {
        jsonResponse(['error' => 'Cannot delete — book has active issues. Return all copies first.'], 409);
    }
    $db->prepare('DELETE FROM books WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Book deleted']);
}

// ── Issue & Return ─────────────────────────────────────────────────────────

function issueBook(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $body = getBody();
    foreach (['book_id','student_id','due_date'] as $f) {
        if (empty($body[$f])) jsonResponse(['error' => "$f required"], 422);
    }
    $db = Database::getConnection();

    $bStmt = $db->prepare('SELECT available_qty FROM books WHERE id = ?');
    $bStmt->execute([$body['book_id']]);
    $book = $bStmt->fetch();
    if (!$book || $book['available_qty'] < 1) jsonResponse(['error' => 'Book not available — all copies are issued'], 409);

    $dup = $db->prepare("SELECT id FROM book_issues WHERE book_id = ? AND student_id = ? AND status IN ('issued','overdue')");
    $dup->execute([$body['book_id'], $body['student_id']]);
    if ($dup->fetch()) jsonResponse(['error' => 'This student already has a copy of this book'], 409);

    $db->beginTransaction();
    try {
        $db->prepare('INSERT INTO book_issues (book_id, student_id, issued_by, issue_date, due_date) VALUES (?,?,?,CURDATE(),?)')
           ->execute([$body['book_id'], $body['student_id'], $auth['id'], $body['due_date']]);
        $db->prepare('UPDATE books SET available_qty = available_qty - 1 WHERE id = ?')->execute([$body['book_id']]);
        $db->commit();
        jsonResponse(['message' => 'Book issued successfully'], 201);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

function returnBook(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $issueId = $_GET['issue_id'] ?? null;
    if (!$issueId) jsonResponse(['error' => 'issue_id required'], 422);

    $db    = Database::getConnection();
    $iStmt = $db->prepare('SELECT * FROM book_issues WHERE id = ?');
    $iStmt->execute([$issueId]);
    $issue = $iStmt->fetch();
    if (!$issue)                         jsonResponse(['error' => 'Issue record not found'], 404);
    if ($issue['status'] === 'returned') jsonResponse(['error' => 'Already returned'], 409);

    $body      = getBody();
    $condition = $body['condition'] ?? 'good';
    $notes     = $body['notes']     ?? null;

    $overdueDays = max(0, (int) ((strtotime('today') - strtotime($issue['due_date'])) / 86400));
    $fine = $overdueDays * 10; // Rs 10/day overdue
    if ($condition === 'damaged') $fine += 200; // damage surcharge
    if ($condition === 'lost')    $fine += 500; // replacement charge

    $db->beginTransaction();
    try {
        $db->prepare('UPDATE book_issues SET return_date=CURDATE(), status="returned", fine_amount=?, return_condition=?, notes=? WHERE id=?')
           ->execute([$fine, $condition, $notes, $issueId]);
        $db->prepare('UPDATE books SET available_qty = available_qty + 1 WHERE id = ?')
           ->execute([$issue['book_id']]);
        $db->commit();
        jsonResponse(['message' => 'Book returned', 'fine_amount' => $fine, 'overdue_days' => $overdueDays, 'condition' => $condition]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// ── New actions ────────────────────────────────────────────────────────────

function bookStats(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $db = Database::getConnection();
    $db->exec("UPDATE book_issues SET status='overdue' WHERE status='issued' AND due_date < CURDATE()");

    $stats = [
        'total_titles'    => (int) $db->query('SELECT COUNT(*) FROM books')->fetchColumn(),
        'total_copies'    => (int) $db->query('SELECT COALESCE(SUM(quantity),0) FROM books')->fetchColumn(),
        'available_copies'=> (int) $db->query('SELECT COALESCE(SUM(available_qty),0) FROM books')->fetchColumn(),
        'issued_count'    => (int) $db->query("SELECT COUNT(*) FROM book_issues WHERE status IN ('issued','overdue')")->fetchColumn(),
        'overdue_count'   => (int) $db->query("SELECT COUNT(*) FROM book_issues WHERE status='overdue'")->fetchColumn(),
        'fine_pending'    => (float) $db->query("SELECT COALESCE(SUM(fine_amount),0) FROM book_issues WHERE status='overdue' AND fine_paid=0")->fetchColumn(),
        'fine_collected'  => (float) $db->query("SELECT COALESCE(SUM(fine_amount),0) FROM book_issues WHERE fine_paid=1")->fetchColumn(),
        'categories'      => $db->query("SELECT DISTINCT category FROM books WHERE category IS NOT NULL AND category != '' ORDER BY category")->fetchAll(PDO::FETCH_COLUMN),
    ];
    jsonResponse($stats);
}

function extendDue(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $issueId = $_GET['issue_id'] ?? null;
    $body    = getBody();
    if (!$issueId || empty($body['due_date'])) {
        jsonResponse(['error' => 'issue_id and due_date required'], 422);
    }
    $db = Database::getConnection();
    $newStatus = ($body['due_date'] >= date('Y-m-d')) ? 'issued' : 'overdue';
    $db->prepare("UPDATE book_issues SET due_date=?, status=? WHERE id=? AND status IN ('issued','overdue')")
       ->execute([$body['due_date'], $newStatus, $issueId]);
    jsonResponse(['message' => 'Due date extended successfully']);
}

function markFinePaid(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $issueId = $_GET['issue_id'] ?? null;
    if (!$issueId) jsonResponse(['error' => 'issue_id required'], 422);
    $db = Database::getConnection();
    $db->prepare('UPDATE book_issues SET fine_paid=1 WHERE id=?')->execute([$issueId]);
    jsonResponse(['message' => 'Fine marked as paid']);
}

function allHistory(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $db     = Database::getConnection();
    $search = $_GET['search'] ?? null;

    $where  = ["bi.status = 'returned'"];
    $params = [];
    if ($search) {
        $where[] = '(b.title LIKE ? OR u.name LIKE ? OR s.roll_number LIKE ?)';
        $s = "%$search%";
        array_push($params, $s, $s, $s);
    }

    $stmt = $db->prepare("
        SELECT bi.id as issue_id, bi.issue_date, bi.due_date, bi.return_date,
               bi.fine_amount, bi.fine_paid, bi.return_condition, bi.notes,
               GREATEST(0, DATEDIFF(bi.return_date, bi.due_date)) as days_overdue,
               b.title, b.author, b.category,
               u.name as student_name, s.roll_number
        FROM book_issues bi
        JOIN books b    ON bi.book_id    = b.id
        JOIN students s ON bi.student_id = s.id
        JOIN users u    ON s.user_id     = u.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY bi.return_date DESC
        LIMIT 200
    ");
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function myHistory(array $auth): void {
    $db    = Database::getConnection();
    $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
    $sStmt->execute([$auth['id']]);
    $student = $sStmt->fetch();
    if (!$student) jsonResponse([]);

    $stmt = $db->prepare("
        SELECT bi.id as issue_id, bi.issue_date, bi.due_date, bi.return_date,
               bi.status, bi.fine_amount, bi.fine_paid,
               GREATEST(0, DATEDIFF(bi.return_date, bi.due_date)) as days_overdue,
               b.title, b.author, b.category
        FROM book_issues bi
        JOIN books b ON bi.book_id = b.id
        WHERE bi.student_id = ? AND bi.status = 'returned'
        ORDER BY bi.return_date DESC
    ");
    $stmt->execute([$student['id']]);
    jsonResponse($stmt->fetchAll());
}

// ── Existing list functions ────────────────────────────────────────────────

function listIssued(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $db = Database::getConnection();
    $db->exec("UPDATE book_issues SET status='overdue' WHERE status='issued' AND due_date < CURDATE()");

    $search  = $_GET['search']  ?? null;
    $overdue = $_GET['overdue'] ?? null;

    $where  = ["bi.status IN ('issued','overdue')"];
    $params = [];
    if ($overdue === '1') {
        $where[] = "bi.status = 'overdue'";
    }
    if ($search) {
        $where[] = '(b.title LIKE ? OR u.name LIKE ? OR s.roll_number LIKE ?)';
        $s = "%$search%";
        array_push($params, $s, $s, $s);
    }

    $stmt = $db->prepare("
        SELECT bi.id as issue_id, bi.issue_date, bi.due_date, bi.return_date,
               bi.status, bi.fine_amount, bi.fine_paid,
               GREATEST(0, DATEDIFF(CURDATE(), bi.due_date)) as days_overdue,
               b.id as book_id, b.title, b.author, b.isbn,
               u.name as student_name, s.roll_number, s.id as student_id
        FROM book_issues bi
        JOIN books b    ON bi.book_id    = b.id
        JOIN students s ON bi.student_id = s.id
        JOIN users u    ON s.user_id     = u.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY bi.status DESC, bi.due_date ASC
    ");
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

// ── E-Book PDF upload / remove ─────────────────────────────────────────────

// ── Book Requests ──────────────────────────────────────────────────────────

function requestBook(array $auth): void {
    $body   = getBody();
    $bookId = $body['book_id'] ?? null;
    if (!$bookId) jsonResponse(['error' => 'book_id required'], 422);

    $db = Database::getConnection();

    // Prevent duplicate pending request
    $dup = $db->prepare("SELECT id FROM book_requests WHERE book_id=? AND user_id=? AND status='pending'");
    $dup->execute([$bookId, $auth['id']]);
    if ($dup->fetch()) jsonResponse(['error' => 'You already have a pending request for this book'], 409);

    $db->prepare('INSERT INTO book_requests (book_id, user_id, user_role, message) VALUES (?,?,?,?)')
       ->execute([$bookId, $auth['id'], $auth['role'], $body['message'] ?? null]);
    jsonResponse(['message' => 'Book request submitted'], 201);
}

function myRequests(array $auth): void {
    $db   = Database::getConnection();
    $stmt = $db->prepare("
        SELECT br.id, br.status, br.message, br.admin_note, br.created_at as requested_at,
               b.title as book_title, b.author as book_author, b.category, b.available_qty
        FROM book_requests br
        JOIN books b ON br.book_id = b.id
        WHERE br.user_id = ?
        ORDER BY br.created_at DESC
    ");
    $stmt->execute([$auth['id']]);
    jsonResponse($stmt->fetchAll());
}

function allRequests(array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    $db     = Database::getConnection();
    $status = $_GET['status'] ?? 'pending';
    $where  = $status !== 'all' ? "WHERE br.status = '$status'" : '';
    $stmt   = $db->prepare("
        SELECT br.id, br.status, br.message, br.admin_note, br.created_at as requested_at, br.user_role,
               b.id as book_id, b.title as book_title, b.author as book_author, b.available_qty,
               u.name as requester_name, u.email as user_email
        FROM book_requests br
        JOIN books b  ON br.book_id = b.id
        JOIN users u  ON br.user_id = u.id
        $where
        ORDER BY br.created_at DESC
        LIMIT 200
    ");
    $stmt->execute();
    jsonResponse($stmt->fetchAll());
}

function handleRequest(?string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    if (!$id) jsonResponse(['error' => 'Request ID required'], 422);
    $body   = getBody();
    $status = $body['status'] ?? null;
    if (!in_array($status, ['approved', 'rejected'])) jsonResponse(['error' => 'status must be approved or rejected'], 422);

    $db = Database::getConnection();
    $db->prepare("UPDATE book_requests SET status=?, admin_note=? WHERE id=?")
       ->execute([$status, $body['note'] ?? null, $id]);
    jsonResponse(['message' => "Request $status"]);
}

function uploadBookPdf(?string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    if (!$id) jsonResponse(['error' => 'Book ID required'], 422);

    if (empty($_FILES['pdf'])) jsonResponse(['error' => 'No file uploaded'], 422);
    $file = $_FILES['pdf'];
    if ($file['error'] !== UPLOAD_ERR_OK) jsonResponse(['error' => 'Upload error: ' . $file['error']], 422);

    $mime = mime_content_type($file['tmp_name']);
    if ($mime !== 'application/pdf') jsonResponse(['error' => 'Only PDF files are allowed'], 422);

    // Max 50 MB
    if ($file['size'] > 50 * 1024 * 1024) jsonResponse(['error' => 'File too large. Max 50 MB'], 422);

    $uploadDir = dirname(__DIR__) . '/uploads/books/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    // Remove old PDF for this book
    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT pdf_file FROM books WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row && $row['pdf_file']) {
        $oldPath = $uploadDir . basename($row['pdf_file']);
        if (file_exists($oldPath)) @unlink($oldPath);
    }

    $filename = 'book_' . $id . '_' . time() . '.pdf';
    $dest     = $uploadDir . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) jsonResponse(['error' => 'Failed to save file'], 500);

    $url = '/uploads/books/' . $filename;
    $db->prepare('UPDATE books SET pdf_file = ? WHERE id = ?')->execute([$url, $id]);
    jsonResponse(['message' => 'PDF uploaded', 'url' => $url]);
}

function removeBookPdf(?string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'librarian');
    if (!$id) jsonResponse(['error' => 'Book ID required'], 422);
    $db   = Database::getConnection();
    $stmt = $db->prepare('SELECT pdf_file FROM books WHERE id = ?');
    $stmt->execute([$id]);
    $row  = $stmt->fetch();
    if ($row && $row['pdf_file']) {
        $path = dirname(__DIR__) . '/uploads/books/' . basename($row['pdf_file']);
        if (file_exists($path)) @unlink($path);
    }
    $db->prepare('UPDATE books SET pdf_file = NULL WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'PDF removed']);
}

function myIssued(array $auth): void {
    $db = Database::getConnection();
    $db->exec("UPDATE book_issues SET status='overdue' WHERE status='issued' AND due_date < CURDATE()");

    $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
    $sStmt->execute([$auth['id']]);
    $student = $sStmt->fetch();
    if (!$student) jsonResponse([]);

    $stmt = $db->prepare("
        SELECT bi.id as issue_id, bi.issue_date, bi.due_date, bi.return_date,
               bi.status, bi.fine_amount, bi.fine_paid,
               GREATEST(0, DATEDIFF(CURDATE(), bi.due_date)) as days_overdue,
               b.title, b.author, b.category
        FROM book_issues bi
        JOIN books b ON bi.book_id = b.id
        WHERE bi.student_id = ? AND bi.status IN ('issued','overdue')
        ORDER BY bi.due_date ASC
    ");
    $stmt->execute([$student['id']]);
    jsonResponse($stmt->fetchAll());
}
