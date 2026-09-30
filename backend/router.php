<?php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = ltrim($uri, '/');

if (preg_match('#^api/([a-z_]+)#', $uri, $m)) {
    $file = __DIR__ . '/api/' . $m[1] . '.php';
    if (file_exists($file)) {
        require $file;
        return true;
    }
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API endpoint not found: ' . $m[1]]);
    return true;
}

$index = dirname(__DIR__) . '/frontend/dist/index.html';
if (file_exists($index)) {
    header('Content-Type: text/html');
    readfile($index);
} else {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'SMS backend running']);
}
