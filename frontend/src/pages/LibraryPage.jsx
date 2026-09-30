// frontend/src/pages/LibraryPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { booksAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  BookOpen, Search, Plus, X, Edit2, Trash2, BookMarked,
  RotateCcw, AlertTriangle, CheckCircle, Clock, History,
  DollarSign, CalendarClock, Filter, TrendingUp, Package,
  CheckCheck, Layers, Download, FileText, Upload, Eye,
  Link, Send, Bell, ThumbsUp, ThumbsDown,
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────────── */
const Modal = ({ title, subtitle, onClose, children, size = 'max-w-md' }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/50 overflow-y-auto">
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${size} mb-10`}>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Input = ({ label, required, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
    <input required={required} {...props}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    issued:   'bg-blue-100 text-blue-700',
    overdue:  'bg-red-100 text-red-700',
    returned: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const ConditionBadge = ({ cond }) => {
  if (!cond || cond === 'good') return null;
  const map = { damaged: 'bg-amber-100 text-amber-700', lost: 'bg-red-100 text-red-700' };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[cond]}`}>{cond}</span>;
};

const StatCard = ({ icon: Icon, label, value, sub, color = 'blue' }) => {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    amber:  'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
};

/* ── BookForm (must be outside LibraryPage to avoid focus-loss on re-render) ── */
const BookForm = ({ form, setForm, onSubmit, btnLabel, showPdfUpload = false, saving, stats, addPdfFile, setAddPdfFile }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <Input label="Title" required value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Introduction to Algorithms" />
    <Input label="Author" value={form.author} onChange={e => setForm(f=>({...f,author:e.target.value}))} placeholder="e.g. Thomas H. Cormen" />
    <div className="grid grid-cols-2 gap-3">
      <Input label="ISBN" value={form.isbn} onChange={e => setForm(f=>({...f,isbn:e.target.value}))} placeholder="978-..." />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
          placeholder="e.g. Algorithms"
          list="cat-list"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <datalist id="cat-list">
          {(stats?.categories || []).map(c => <option key={c} value={c} />)}
        </datalist>
      </div>
    </div>
    <Input label="Total Copies *" type="number" min={1} required value={form.quantity}
      onChange={e => setForm(f=>({...f,quantity:parseInt(e.target.value)||1}))} />
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
      <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        placeholder="Brief description of the book..." />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Link className="w-3.5 h-3.5 text-gray-400" /> Online Link <span className="text-gray-400 font-normal">(optional)</span></label>
      <input value={form.online_link} onChange={e => setForm(f=>({...f,online_link:e.target.value}))}
        type="url" placeholder="https://…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
    </div>
    {showPdfUpload && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-blue-500" /> E-Book PDF <span className="text-gray-400 font-normal">(optional, max 50 MB)</span></label>
        {addPdfFile ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            <span className="text-sm text-blue-700 truncate">{addPdfFile.name}</span>
            <button type="button" onClick={() => setAddPdfFile(null)} className="text-gray-400 hover:text-red-500 ml-2"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl py-3 cursor-pointer transition-colors text-sm text-gray-500 hover:text-blue-600">
            <Upload className="w-4 h-4" /> Click to select PDF
            <input type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files[0]; if (f?.type === 'application/pdf') setAddPdfFile(f); else if (f) toast.error('Please select a PDF file'); }} />
          </label>
        )}
      </div>
    )}
    <button type="submit" disabled={saving}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
      {saving ? 'Saving…' : btnLabel}
    </button>
  </form>
);

/* ── Main Component ──────────────────────────────────────────── */
export default function LibraryPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin' || user?.role === 'librarian';

  const [books, setBooks]       = useState([]);
  const [issued, setIssued]     = useState([]);
  const [myBooks, setMyBooks]   = useState([]);
  const [myHistory, setMyHist]  = useState([]);
  const [history, setHistory]   = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [tab, setTab]             = useState('books');
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [issuedSearch, setIssuedSearch] = useState('');
  const [overdueOnly, setOverdueOnly]   = useState(false);
  const [histSearch, setHistSearch]     = useState('');

  // Modals
  const [addModal, setAddModal]       = useState(false);
  const [editModal, setEditModal]     = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [issueModal, setIssueModal]   = useState(null);
  const [returnModal, setReturnModal] = useState(null);
  const [extendModal, setExtendModal] = useState(null);
  const [pdfReader, setPdfReader]       = useState(null); // { title, url }
  const [pdfUploading, setPdfUploading] = useState(false);
  const [addPdfFile, setAddPdfFile]     = useState(null); // file selected in Add modal
  const [requestModal, setRequestModal] = useState(null); // book being requested
  const [requestMsg, setRequestMsg]     = useState('');
  const [myRequests, setMyRequests]     = useState([]);
  const [allRequests, setAllRequests]   = useState([]);
  const [reqFilter, setReqFilter]       = useState('pending');

  const blankForm = { title:'', author:'', isbn:'', category:'', quantity:1, description:'', online_link:'' };
  const [form, setForm]           = useState(blankForm);
  const [issueForm, setIssueForm] = useState({ student_id:'', due_date:'' });
  const [returnForm, setReturnForm] = useState({ condition:'good', notes:'' });
  const [extendDate, setExtendDate] = useState('');

  /* ── Load ── */
  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const booksParams = {};
      if (search)    booksParams.search   = search;
      if (catFilter) booksParams.category = catFilter;
      const [bRes] = await Promise.all([booksAPI.list(booksParams)]);
      setBooks(Array.isArray(bRes.data) ? bRes.data : []);

      if (isAdmin) {
        const issuedParams = {};
        if (issuedSearch) issuedParams.search  = issuedSearch;
        if (overdueOnly)  issuedParams.overdue = '1';
        const [iResult, statsResult, studResult, reqResult] = await Promise.allSettled([
          booksAPI.issued(issuedParams),
          booksAPI.stats(),
          usersAPI.list('student'),
          booksAPI.allRequests('pending'),
        ]);
        if (iResult.status === 'fulfilled')     setIssued(Array.isArray(iResult.value.data) ? iResult.value.data : []);
        if (statsResult.status === 'fulfilled') setStats(statsResult.value.data);
        if (studResult.status === 'fulfilled')  setStudents(studResult.value.data?.users || studResult.value.data || []);
        if (reqResult.status === 'fulfilled')   setAllRequests(Array.isArray(reqResult.value.data) ? reqResult.value.data : []);
      } else {
        const [mResult, mhResult, mrResult] = await Promise.allSettled([
          booksAPI.myIssued(), booksAPI.myHistory(), booksAPI.myRequests(),
        ]);
        if (mResult.status === 'fulfilled')  setMyBooks(Array.isArray(mResult.value.data)  ? mResult.value.data  : []);
        if (mhResult.status === 'fulfilled') setMyHist(Array.isArray(mhResult.value.data)  ? mhResult.value.data : []);
        if (mrResult.status === 'fulfilled') setMyRequests(Array.isArray(mrResult.value.data) ? mrResult.value.data : []);
      }
    } catch (e) {
      if (e?.response?.status !== 401) toast.error('Failed to load library data');
    }
    finally { setLoading(false); }
  }, [search, catFilter, issuedSearch, overdueOnly, isAdmin]);

  // Re-run load when isAdmin changes (auth context loads async on page refresh)
  useEffect(() => { load(); }, [isAdmin]);

  const loadHistory = async () => {
    try {
      const r = await booksAPI.allHistory(histSearch ? { search: histSearch } : {});
      setHistory(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load history'); }
  };

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  /* ── Book CRUD ── */
  const openEdit = (book) => {
    setForm({ title:book.title, author:book.author||'', isbn:book.isbn||'',
              category:book.category||'', quantity:book.quantity, description:book.description||'',
              online_link:book.online_link||'' });
    setEditModal(book);
  };

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await booksAPI.add(form);
      const newId = r.data.id;
      if (addPdfFile && newId) {
        try { await booksAPI.uploadPdf(newId, addPdfFile); } catch { /* non-fatal */ }
      }
      toast.success('Book added to library!');
      setAddModal(false); setForm(blankForm); setAddPdfFile(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add book'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await booksAPI.update(editModal.id, form);
      toast.success('Book updated!');
      setEditModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await booksAPI.remove(deleteModal.id);
      toast.success('Book removed from library');
      setDeleteModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Cannot delete — book has active issues'); }
  };

  /* ── Issue ── */
  const handleIssue = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await booksAPI.issue({ book_id:issueModal.id, student_id:issueForm.student_id, due_date:issueForm.due_date });
      toast.success(`"${issueModal.title}" issued successfully!`);
      setIssueModal(null); setIssueForm({ student_id:'', due_date:'' }); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to issue book'); }
    finally { setSaving(false); }
  };

  /* ── Return ── */
  const handleReturn = async () => {
    setSaving(true);
    try {
      const r = await booksAPI.return(returnModal.issue_id, returnForm);
      const { fine_amount, overdue_days, condition } = r.data;
      if (fine_amount > 0) {
        const msg = [`Book returned.`, `Fine: Rs ${fine_amount}`];
        if (overdue_days > 0) msg.push(`(${overdue_days} days overdue)`);
        if (condition !== 'good') msg.push(`+ ${condition} charge`);
        toast.success(msg.join(' '), { duration: 6000 });
      } else {
        toast.success('Book returned successfully — no fine!');
      }
      setReturnModal(null); setReturnForm({ condition:'good', notes:'' }); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to return book'); }
    finally { setSaving(false); }
  };

  /* ── Extend ── */
  const handleExtend = async () => {
    if (!extendDate) { toast.error('Please select a new due date'); return; }
    setSaving(true);
    try {
      await booksAPI.extend(extendModal.issue_id, { due_date: extendDate });
      toast.success('Due date extended!');
      setExtendModal(null); setExtendDate(''); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to extend'); }
    finally { setSaving(false); }
  };

  /* ── Fine paid ── */
  const handleMarkPaid = async (issue) => {
    try {
      await booksAPI.markFinePaid(issue.issue_id);
      toast.success(`Fine of Rs ${issue.fine_amount} marked as collected`);
      load();
    } catch { toast.error('Failed to update fine status'); }
  };

  /* ── Book Requests ── */
  const handleRequest = async () => {
    if (!requestModal) return;
    setSaving(true);
    try {
      await booksAPI.requestBook({ book_id: requestModal.id, message: requestMsg });
      toast.success('Request submitted! The librarian will be notified.');
      setRequestModal(null); setRequestMsg(''); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to submit request'); }
    finally { setSaving(false); }
  };

  const handleApproveReject = async (req, status) => {
    try {
      await booksAPI.handleRequest(req.id, status);
      toast.success(status === 'approved' ? 'Request approved' : 'Request rejected');
      load();
    } catch { toast.error('Failed to update request'); }
  };

  const loadAllRequests = async () => {
    try {
      const r = await booksAPI.allRequests(reqFilter);
      setAllRequests(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load requests'); }
  };

  useEffect(() => { if (tab === 'requests') loadAllRequests(); }, [tab, reqFilter]);

  /* ── PDF upload / remove ── */
  const handlePdfUpload = async (book, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please select a PDF file'); return; }
    if (file.size > 50 * 1024 * 1024)   { toast.error('PDF must be under 50 MB'); return; }
    setPdfUploading(true);
    try {
      const r = await booksAPI.uploadPdf(book.id, file);
      toast.success('PDF uploaded!');
      // Patch editModal so UI reflects instantly
      if (editModal?.id === book.id) setEditModal(m => ({ ...m, pdf_file: r.data.url }));
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    finally { setPdfUploading(false); }
  };

  const handlePdfRemove = async (book) => {
    if (!confirm('Remove the PDF for this book?')) return;
    try {
      await booksAPI.removePdf(book.id);
      toast.success('PDF removed');
      if (editModal?.id === book.id) setEditModal(m => ({ ...m, pdf_file: null }));
      load();
    } catch { toast.error('Failed to remove PDF'); }
  };

  /* ── Compute fine for return preview ── */
  const computeReturnFine = () => {
    if (!returnModal) return 0;
    const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(returnModal.due_date + 'T00:00:00').getTime()) / 86400000));
    let fine = overdueDays * 10;
    if (returnForm.condition === 'damaged') fine += 200;
    if (returnForm.condition === 'lost')    fine += 500;
    return { fine, overdueDays };
  };

  const finePreview = returnModal ? computeReturnFine() : null;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Library</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin ? 'Manage books, issues, fines and history' : 'Browse and track your borrowed books'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => { setAddModal(true); setForm(blankForm); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Book
          </button>
        )}
      </div>

      {/* Stats bar (admin only) */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={Layers}      label="Total Titles"   value={stats.total_titles}     color="blue" />
          <StatCard icon={Package}     label="Total Copies"   value={stats.total_copies}     sub={`${stats.available_copies} available`} color="purple" />
          <StatCard icon={BookMarked}  label="Issued Now"     value={stats.issued_count}     color="blue" />
          <StatCard icon={AlertTriangle} label="Overdue"      value={stats.overdue_count}    color="red" />
          <StatCard icon={DollarSign}  label="Fine Pending"   value={`Rs ${stats.fine_pending}`} sub={`Rs ${stats.fine_collected} collected`} color="amber" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {[
          { key:'books',    label:'All Books' },
          ...(isAdmin ? [
            { key:'issued',   label:`Issued${issued.length > 0 ? ` (${issued.length})` : ''}` },
            { key:'requests', label:`Requests${allRequests.length > 0 ? ` (${allRequests.length})` : ''}` },
            { key:'history',  label:'History' },
          ] : [
            { key:'my',       label:`My Books${myBooks.length > 0 ? ` (${myBooks.length})` : ''}` },
            { key:'myrequests', label:`My Requests${myRequests.length > 0 ? ` (${myRequests.length})` : ''}` },
            { key:'myhist',   label:'My History' },
          ]),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab !== 'history' ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── ALL BOOKS ── */}
          {tab === 'books' && (
            <div className="space-y-4">
              {/* Search + Category filter */}
              <form onSubmit={e => { e.preventDefault(); load(); }}
                className="flex gap-2 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 mt-2 ml-1 flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by title, author, ISBN, category…"
                  className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400" />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">Search</button>
                {(search || catFilter) && (
                  <button type="button" onClick={() => { setSearch(''); setCatFilter(''); setTimeout(load,0); }}
                    className="text-gray-400 hover:text-gray-600 px-2"><X className="w-4 h-4" /></button>
                )}
              </form>

              {/* Category chips */}
              {isAdmin && stats?.categories?.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Filter className="w-3 h-3" /> Filter:</span>
                  <button onClick={() => { setCatFilter(''); setTimeout(load,0); }}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${!catFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                    All
                  </button>
                  {stats.categories.map(c => (
                    <button key={c} onClick={() => { setCatFilter(c); setTimeout(load,0); }}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${catFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* Book grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {books.length === 0 && (
                  <div className="col-span-full text-center py-16 text-gray-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No books found</p>
                  </div>
                )}
                {books.map(book => (
                  <div key={book.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${book.available_qty > 0 ? 'bg-blue-50' : 'bg-gray-100'}`}>
                        <BookOpen className={`w-5 h-5 ${book.available_qty > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{book.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{book.author || 'Unknown author'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      {book.category && <span className="bg-gray-100 px-2 py-0.5 rounded-full">{book.category}</span>}
                      {book.isbn && <span className="text-gray-400">ISBN: {book.isbn}</span>}
                    </div>

                    {book.description && <p className="text-xs text-gray-400 line-clamp-2">{book.description}</p>}

                    {/* E-Book buttons */}
                    {book.pdf_file && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPdfReader({ title: book.title, url: book.pdf_file })}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-lg transition-colors">
                          <Eye className="w-3.5 h-3.5" /> Read Online
                        </button>
                        <a href={book.pdf_file} download
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 py-1.5 rounded-lg transition-colors">
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
                      <div className="text-xs flex items-center gap-1.5">
                        <span className={`font-semibold ${book.available_qty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {book.available_qty > 0 ? `${book.available_qty} available` : 'Not available'}
                        </span>
                        <span className="text-gray-400">/ {book.quantity} total</span>
                        {book.pdf_file && <span className="text-blue-400 text-xs">• PDF</span>}
                      </div>
                      {isAdmin ? (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(book)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteModal(book)} title="Delete" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          <button
                            onClick={() => { setIssueModal(book); setIssueForm({ student_id:'', due_date:'' }); }}
                            disabled={book.available_qty < 1}
                            title="Issue book"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <BookMarked className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRequestModal(book); setRequestMsg(''); }}
                          className="flex items-center gap-1.5 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1.5 rounded-lg transition-colors">
                          <Send className="w-3.5 h-3.5" /> Request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ISSUED BOOKS (admin) ── */}
          {tab === 'issued' && isAdmin && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input value={issuedSearch} onChange={e => setIssuedSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && load()}
                    placeholder="Search by book, student, roll number…"
                    className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400" />
                  {issuedSearch && <button onClick={() => { setIssuedSearch(''); setTimeout(load,0); }}><X className="w-4 h-4 text-gray-400" /></button>}
                </div>
                <button onClick={() => { setOverdueOnly(v=>!v); setTimeout(load,0); }}
                  className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-colors ${overdueOnly ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'}`}>
                  <AlertTriangle className="w-4 h-4" /> Overdue Only
                </button>
                <button onClick={load} className="text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                {issued.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>{overdueOnly ? 'No overdue books — all good!' : 'No books currently issued'}</p>
                  </div>
                ) : (
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-3">Book</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Issued</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Fine</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {issued.map(i => (
                        <tr key={i.issue_id} className={`hover:bg-gray-50 transition-colors ${i.status === 'overdue' ? 'bg-red-50/40' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{i.title}</p>
                            <p className="text-xs text-gray-400">{i.author}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{i.student_name}</p>
                            <p className="text-xs text-gray-400">{i.roll_number}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{i.issue_date}</td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-medium ${i.status === 'overdue' ? 'text-red-600' : 'text-gray-700'}`}>{i.due_date}</span>
                            {i.status === 'overdue' && <p className="text-xs text-red-500">{i.days_overdue}d overdue</p>}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                          <td className="px-4 py-3">
                            {i.status === 'overdue' && i.days_overdue > 0 ? (
                              <div>
                                <span className="text-red-600 font-semibold">Rs {i.days_overdue * 10}</span>
                                {i.fine_paid ? <span className="ml-1 text-xs text-green-600">✓ paid</span> : (
                                  <button onClick={() => handleMarkPaid(i)}
                                    className="ml-1 text-xs text-blue-600 hover:underline">Mark paid</button>
                                )}
                              </div>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => { setExtendModal(i); setExtendDate(i.due_date); }}
                                title="Extend due date"
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors">
                                <CalendarClock className="w-3.5 h-3.5" /> Extend
                              </button>
                              <button onClick={() => { setReturnModal(i); setReturnForm({ condition:'good', notes:'' }); }}
                                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg transition-colors">
                                <RotateCcw className="w-3.5 h-3.5" /> Return
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── HISTORY (admin) ── */}
          {tab === 'history' && isAdmin && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input value={histSearch} onChange={e => setHistSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadHistory()}
                    placeholder="Search by book title, student name, roll number…"
                    className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400" />
                </div>
                <button onClick={loadHistory} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl text-sm font-medium transition-colors">
                  Search
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                {history.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No return history yet</p>
                  </div>
                ) : (
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-3">Book</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Issued</th>
                        <th className="px-4 py-3">Returned</th>
                        <th className="px-4 py-3">Condition</th>
                        <th className="px-4 py-3">Fine</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {history.map(h => (
                        <tr key={h.issue_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{h.title}</p>
                            <p className="text-xs text-gray-400">{h.author}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-700">{h.student_name}</p>
                            <p className="text-xs text-gray-400">{h.roll_number}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{h.issue_date}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{h.return_date}</td>
                          <td className="px-4 py-3">
                            {h.return_condition && h.return_condition !== 'good'
                              ? <ConditionBadge cond={h.return_condition} />
                              : <span className="text-xs text-green-600">Good</span>}
                          </td>
                          <td className="px-4 py-3">
                            {h.fine_amount > 0 ? (
                              <div className="text-sm">
                                <span className={h.fine_paid ? 'text-gray-400 line-through' : 'text-red-600 font-semibold'}>Rs {h.fine_amount}</span>
                                {h.fine_paid && <span className="ml-1 text-xs text-green-600">paid</span>}
                              </div>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px]">
                            <span className="line-clamp-2">{h.notes || '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── MY BOOKS (student) ── */}
          {tab === 'my' && !isAdmin && (
            <div className="space-y-3">
              {myBooks.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>You have no books borrowed right now</p>
                  <p className="text-sm mt-1">Browse the catalog and ask the librarian to issue a book</p>
                </div>
              ) : myBooks.map(b => (
                <div key={b.issue_id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 ${b.status === 'overdue' ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${b.status === 'overdue' ? 'bg-red-100' : 'bg-blue-50'}`}>
                    <BookOpen className={`w-5 h-5 ${b.status === 'overdue' ? 'text-red-500' : 'text-blue-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{b.title}</p>
                    <p className="text-xs text-gray-400">{b.author}</p>
                    {b.category && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">{b.category}</span>}
                  </div>
                  <div className="text-right text-xs flex-shrink-0 space-y-1">
                    <p className="text-gray-500">Issued: {b.issue_date}</p>
                    <p>Due: <span className={b.status === 'overdue' ? 'text-red-600 font-bold' : 'text-gray-700 font-medium'}>{b.due_date}</span></p>
                    {b.status === 'overdue' && (
                      <p className="text-red-500 font-semibold flex items-center gap-1 justify-end">
                        <AlertTriangle className="w-3 h-3" /> Fine: Rs {b.days_overdue * 10}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}

          {/* ── REQUESTS (admin/librarian) ── */}
          {tab === 'requests' && isAdmin && (
            <div className="space-y-3">
              {/* Filter chips */}
              <div className="flex gap-2 flex-wrap">
                {['pending','approved','rejected','all'].map(f => (
                  <button key={f} onClick={() => setReqFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition-colors ${reqFilter===f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}>
                    {f}
                  </button>
                ))}
                <button onClick={loadAllRequests} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors ml-auto">
                  Refresh
                </button>
              </div>

              {allRequests.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No {reqFilter !== 'all' ? reqFilter : ''} book requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                      <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{req.book_title}</p>
                        <p className="text-xs text-gray-400">{req.book_author}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                            {req.requester_name} ({req.user_role})
                          </span>
                          {req.requested_at && (
                            <span className="text-xs text-gray-400">{new Date(req.requested_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        {req.message && (
                          <p className="text-xs text-gray-500 mt-1.5 italic">"{req.message}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {req.status === 'pending' ? (
                          <>
                            <button onClick={() => handleApproveReject(req, 'approved')}
                              className="flex items-center gap-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg transition-colors">
                              <ThumbsUp className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => handleApproveReject(req, 'rejected')}
                              className="flex items-center gap-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg transition-colors">
                              <ThumbsDown className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MY REQUESTS (student/teacher) ── */}
          {tab === 'myrequests' && !isAdmin && (
            <div className="space-y-3">
              {myRequests.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <Send className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>You haven't requested any books yet</p>
                  <p className="text-sm mt-1">Browse the catalog and click "Request" on any book</p>
                </div>
              ) : myRequests.map(req => (
                <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                  <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{req.book_title}</p>
                    <p className="text-xs text-gray-400">{req.book_author}</p>
                    {req.message && <p className="text-xs text-gray-500 mt-1 italic">"{req.message}"</p>}
                    {req.admin_note && (
                      <p className="text-xs text-blue-600 mt-1">Note: {req.admin_note}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{req.requested_at ? new Date(req.requested_at).toLocaleDateString() : ''}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${
                    req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                    'bg-amber-100 text-amber-700'}`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── MY HISTORY (student) ── */}
          {tab === 'myhist' && !isAdmin && (
            <div className="space-y-3">
              {myHistory.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No borrowing history yet</p>
                </div>
              ) : myHistory.map(h => (
                <div key={h.issue_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{h.title}</p>
                    <p className="text-xs text-gray-400">{h.author}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Issued: {h.issue_date} · Returned: {h.return_date}</p>
                  </div>
                  <div className="text-right text-xs flex-shrink-0">
                    {h.fine_amount > 0 ? (
                      <span className={h.fine_paid ? 'text-gray-400' : 'text-red-600 font-semibold'}>
                        Fine: Rs {h.fine_amount}{h.fine_paid ? ' (paid)' : ' (pending)'}
                      </span>
                    ) : <span className="text-green-600 font-medium">No fine</span>}
                  </div>
                  <StatusBadge status="returned" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODALS ── */}

      {addModal && (
        <Modal title="Add New Book" subtitle="Add a book to the library catalog" onClose={() => { setAddModal(false); setAddPdfFile(null); }} size="max-w-lg">
          <BookForm form={form} setForm={setForm} onSubmit={handleAdd} btnLabel="Add Book" showPdfUpload={true} saving={saving} stats={stats} addPdfFile={addPdfFile} setAddPdfFile={setAddPdfFile} />
        </Modal>
      )}

      {editModal && (
        <Modal title="Edit Book" subtitle={editModal.title} onClose={() => setEditModal(null)} size="max-w-lg">
          <BookForm form={form} setForm={setForm} onSubmit={handleEdit} btnLabel="Save Changes" saving={saving} stats={stats} addPdfFile={addPdfFile} setAddPdfFile={setAddPdfFile} />

          {/* PDF E-Book section */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> E-Book PDF
            </p>
            {editModal.pdf_file ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium truncate max-w-[160px]">{editModal.pdf_file.split('/').pop()}</span>
                </div>
                <div className="flex gap-2">
                  <a href={editModal.pdf_file} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-100 rounded-lg transition-colors">
                    Preview
                  </a>
                  <label className={`text-xs text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer ${pdfUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    Replace
                    <input type="file" accept=".pdf,application/pdf" className="hidden"
                      onChange={e => e.target.files[0] && handlePdfUpload(editModal, e.target.files[0])} />
                  </label>
                  <button onClick={() => handlePdfRemove(editModal)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl py-4 cursor-pointer transition-colors text-sm text-gray-500 hover:text-blue-600 ${pdfUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                <Upload className="w-4 h-4" />
                {pdfUploading ? 'Uploading…' : 'Click to upload PDF (max 50 MB)'}
                <input type="file" accept=".pdf,application/pdf" className="hidden"
                  onChange={e => e.target.files[0] && handlePdfUpload(editModal, e.target.files[0])} />
              </label>
            )}
          </div>
        </Modal>
      )}

      {deleteModal && (
        <Modal title="Delete Book" onClose={() => setDeleteModal(null)}>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                <p className="text-sm text-red-600 mt-1">
                  This will permanently remove <strong>"{deleteModal.title}"</strong> from the library. Books with active issues cannot be deleted.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">Yes, Delete</button>
            <button onClick={() => setDeleteModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {issueModal && (
        <Modal title={`Issue Book`} subtitle={`"${issueModal.title}" — ${issueModal.available_qty} cop${issueModal.available_qty===1?'y':'ies'} available`} onClose={() => setIssueModal(null)}>
          <form onSubmit={handleIssue} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
              <select required value={issueForm.student_id}
                onChange={e => setIssueForm(f=>({...f,student_id:e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select student…</option>
                {students.map(s => <option key={s.id} value={s.student_id}>{s.name} ({s.roll_number})</option>)}
              </select>
            </div>
            <Input label="Due Date *" type="date" required value={issueForm.due_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setIssueForm(f=>({...f,due_date:e.target.value}))} />
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
              Fine policy: Rs 10 per day overdue · Rs 200 for damaged · Rs 500 for lost books
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Issuing…' : 'Issue Book'}
            </button>
          </form>
        </Modal>
      )}

      {returnModal && (
        <Modal title="Return Book" subtitle={`"${returnModal.title}" — ${returnModal.student_name}`} onClose={() => setReturnModal(null)}>
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Issued on</span><span className="text-gray-700">{returnModal.issue_date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Due date</span><span className={returnModal.status==='overdue'?'text-red-600 font-semibold':'text-gray-700'}>{returnModal.due_date}</span></div>
              {returnModal.status === 'overdue' && (
                <div className="flex justify-between text-red-600 font-semibold border-t border-gray-200 pt-2">
                  <span>Days overdue</span><span>{returnModal.days_overdue} days</span>
                </div>
              )}
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Book Condition</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val:'good',    label:'✅ Good',    sub:'No damage' },
                  { val:'damaged', label:'⚠️ Damaged',  sub:'+Rs 200 fine' },
                  { val:'lost',    label:'❌ Lost',     sub:'+Rs 500 fine' },
                ].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => setReturnForm(f=>({...f,condition:opt.val}))}
                    className={`p-2.5 rounded-xl border text-center transition-colors ${returnForm.condition===opt.val ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea value={returnForm.notes} onChange={e => setReturnForm(f=>({...f,notes:e.target.value}))}
                rows={2} placeholder="e.g. Pages torn, cover damaged, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>

            {/* Fine preview */}
            {finePreview && finePreview.fine > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Total fine: Rs {finePreview.fine}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {finePreview.overdueDays > 0 && `Rs ${finePreview.overdueDays*10} overdue (${finePreview.overdueDays} days)`}
                    {returnForm.condition === 'damaged' && ` + Rs 200 damage`}
                    {returnForm.condition === 'lost'    && ` + Rs 500 replacement`}
                  </p>
                </div>
              </div>
            )}
            {finePreview && finePreview.fine === 0 && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                <CheckCheck className="w-4 h-4" /> No fine — returned on time in good condition!
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleReturn} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? 'Processing…' : 'Confirm Return'}
              </button>
              <button onClick={() => setReturnModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {extendModal && (
        <Modal title="Extend Due Date" subtitle={`"${extendModal.title}" — ${extendModal.student_name}`} onClose={() => setExtendModal(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
              Current due date: <span className="font-semibold text-gray-800">{extendModal.due_date}</span>
            </div>
            <Input label="New Due Date *" type="date" value={extendDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setExtendDate(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={handleExtend} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Extend Due Date'}
              </button>
              <button onClick={() => setExtendModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Request Book Modal ── */}
      {requestModal && (
        <Modal title="Request Book" subtitle={`"${requestModal.title}"`} onClose={() => setRequestModal(null)}>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-sm text-purple-700">
              The librarian will review your request and issue the book when available.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
              <textarea value={requestMsg} onChange={e => setRequestMsg(e.target.value)} rows={3}
                placeholder="e.g. I need this for my research project…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleRequest} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <Send className="w-4 h-4" />{saving ? 'Submitting…' : 'Submit Request'}
              </button>
              <button onClick={() => setRequestModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── PDF Reader Overlay ── */}
      {pdfReader && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="font-medium text-sm truncate">{pdfReader.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={pdfReader.url} download
                className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" /> Download
              </a>
              <button onClick={() => setPdfReader(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* PDF Viewer */}
          <iframe
            src={pdfReader.url}
            title={pdfReader.title}
            className="flex-1 w-full border-none"
          />
        </div>
      )}

    </div>
  );
}
