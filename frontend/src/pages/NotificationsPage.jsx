// frontend/src/pages/NotificationsPage.jsx
import { useState, useEffect } from 'react';
import { notificationsAPI, usersAPI, academicAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Bell, Plus, CheckCheck, Users, User, BookOpen, Calendar, Globe, GraduationCap, ChevronDown, Zap } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

const TYPE_COLORS = {
  general:    'bg-gray-100 text-gray-600',
  assignment: 'bg-blue-100 text-blue-700',
  quiz:       'bg-purple-100 text-purple-700',
  grade:      'bg-green-100 text-green-700',
  attendance: 'bg-orange-100 text-orange-700',
  system:     'bg-red-100 text-red-700',
};

const TYPE_LABELS = {
  general:    '📢 General',
  assignment: '📝 Assignment',
  quiz:       '❓ Quiz',
  grade:      '📊 Grade',
  attendance: '📋 Attendance',
  system:     '⚙️ System',
};

const TARGET_OPTIONS = [
  { value: 'all',              label: 'Everyone',          sub: 'All users on the portal',          icon: Globe },
  { value: 'student',          label: 'All Students',      sub: 'Every enrolled student',           icon: GraduationCap },
  { value: 'teacher',          label: 'All Teachers',      sub: 'Every teacher account',            icon: Users },
  { value: 'specific_student', label: 'Specific Student',  sub: 'One individual student',           icon: User },
  { value: 'course',           label: 'By Course',         sub: 'All students in a course',         icon: BookOpen },
  { value: 'semester',         label: 'By Semester',       sub: 'All students in a semester',       icon: Calendar },
];

const TEMPLATES = [
  {
    label: '💰 Fee Warning',
    type: 'system',
    title: 'Fee Submission Deadline — Action Required',
    message: 'Dear Student, your semester fee payment is overdue. Please submit your fee immediately to avoid a late fine and suspension of your portal access. Visit the accounts office or pay online. For assistance, contact the finance department.',
  },
  {
    label: '📋 Attendance Alert',
    type: 'attendance',
    title: 'Low Attendance Warning',
    message: 'Your attendance in one or more courses has fallen below the required 75%. Students with attendance below 75% will not be allowed to sit in the final examination. Please regularize your attendance immediately and contact your course teacher.',
  },
  {
    label: '📝 Assignment Due',
    type: 'assignment',
    title: 'Assignment Submission Reminder',
    message: 'This is a reminder that your assignment deadline is approaching. Late submissions will receive a penalty deduction. Please log in to the student portal and submit your work before the deadline. Contact your teacher if you have any questions.',
  },
  {
    label: '📊 Results Out',
    type: 'grade',
    title: 'Exam Results Have Been Published',
    message: 'Your examination results are now available. Log in to the portal and navigate to My Grades to view your results. For any grade discrepancy or re-checking request, contact your course teacher within 5 working days.',
  },
  {
    label: '📅 Exam Notice',
    type: 'general',
    title: 'Final Examination Schedule Announced',
    message: 'The final examination schedule has been published. Please check the academic calendar for your exam dates, timings, and venue details. Bring your student ID card to every examination. No schedule change requests will be entertained after this notice.',
  },
  {
    label: '📚 Registration Open',
    type: 'general',
    title: 'Semester Course Registration Now Open',
    message: 'Course registration for the upcoming semester is now open. Please log in to the portal and register for your courses before the deadline. Seats are limited — register early to avoid missing your preferred courses. Contact your academic advisor if you need guidance.',
  },
];

const BLANK_FORM = {
  title: '', message: '', type: 'general',
  target_type: 'all',
  target_user_id: '', target_course_id: '', target_semester_id: '',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [data, setData]           = useState({ notifications: [], unread_count: 0 });
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ ...BLANK_FORM });
  const [sending, setSending]     = useState(false);
  const [students, setStudents]   = useState([]);
  const [courses, setCourses]     = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const load = () => {
    setLoading(true);
    notificationsAPI.list()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openModal = async () => {
    setShowModal(true);
    setForm({ ...BLANK_FORM });
    setStudentSearch('');
    if (students.length === 0) {
      setLoadingMeta(true);
      try {
        const [sRes, cRes, semRes] = await Promise.all([
          usersAPI.list('student'),
          academicAPI.getCourses(),
          academicAPI.getSemesters(),
        ]);
        setStudents(sRes.data?.users || sRes.data || []);
        setCourses(cRes.data?.courses || cRes.data || []);
        setSemesters(semRes.data?.semesters || semRes.data || []);
      } catch {
        toast.error('Could not load targeting options');
      } finally {
        setLoadingMeta(false);
      }
    }
  };

  const applyTemplate = (tpl) => {
    setForm(f => ({ ...f, title: tpl.title, message: tpl.message, type: tpl.type }));
  };

  const buildPayload = () => {
    const base = { title: form.title, message: form.message, type: form.type };
    switch (form.target_type) {
      case 'all':              return { ...base, target_role: 'all' };
      case 'student':          return { ...base, target_role: 'student' };
      case 'teacher':          return { ...base, target_role: 'teacher' };
      case 'specific_student': return { ...base, target_role: 'student', target_user_id: form.target_user_id };
      case 'course':           return { ...base, target_role: 'student', target_course_id: form.target_course_id };
      case 'semester':         return { ...base, target_role: 'student', target_semester_id: form.target_semester_id };
      default:                 return { ...base, target_role: 'all' };
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.target_type === 'specific_student' && !form.target_user_id) {
      toast.error('Please select a student'); return;
    }
    if (form.target_type === 'course' && !form.target_course_id) {
      toast.error('Please select a course'); return;
    }
    if (form.target_type === 'semester' && !form.target_semester_id) {
      toast.error('Please select a semester'); return;
    }
    setSending(true);
    try {
      await notificationsAPI.create(buildPayload());
      toast.success('Notification sent successfully');
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const markAllRead = async () => {
    await notificationsAPI.markRead(null);
    load();
    toast.success('All marked as read');
  };

  const filteredStudents = students.filter(s =>
    !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const getTargetLabel = (n) => {
    if (n.target_user_id) return `Student #${n.target_user_id}`;
    if (n.target_course_id) return `Course #${n.target_course_id}`;
    if (n.target_semester_id) return `Semester #${n.target_semester_id}`;
    return n.target_role === 'all' ? 'Everyone' : n.target_role;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">{data.unread_count} unread</p>
        </div>
        <div className="flex gap-2">
          {data.unread_count > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-2 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <button onClick={openModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> Send Notification
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && notificationsAPI.markRead(n.id).then(load)}
              className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer transition-colors hover:bg-gray-50 ${!n.is_read ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!n.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                    <h3 className={`font-semibold ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-600'}`}>{n.type}</span>
                    {(user?.role === 'admin' || user?.role === 'teacher') && (
                      <span className="text-xs text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">→ {getTargetLabel(n)}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-2">From {n.sender_name} · {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SEND NOTIFICATION MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mb-10">
            {/* Modal header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Send Notification</h2>
                <p className="text-sm text-gray-500 mt-0.5">Compose and target your message</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {/* Quick Templates */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">Quick Templates</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map(tpl => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Fee submission deadline approaching"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Write your notification message here..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TYPE_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: val }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        form.type === val
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TARGET_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const active = form.target_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, target_type: opt.value, target_user_id: '', target_course_id: '', target_semester_id: '' }))}
                        className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-colors ${
                          active
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <div className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-700'}`}>{opt.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Conditional sub-selectors */}
                {form.target_type === 'specific_student' && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Search by name or roll number..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {loadingMeta ? (
                      <p className="text-sm text-gray-400">Loading students...</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {filteredStudents.length === 0 && (
                          <p className="text-sm text-gray-400 p-3">No students found</p>
                        )}
                        {filteredStudents.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, target_user_id: String(s.id) }))}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                              form.target_user_id === String(s.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div>
                              <span className="text-sm font-medium text-gray-800">{s.name}</span>
                              {s.roll_number && <span className="text-xs text-gray-400 ml-2">{s.roll_number}</span>}
                            </div>
                            {form.target_user_id === String(s.id) && (
                              <span className="text-blue-600 text-xs font-semibold">Selected ✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {form.target_type === 'course' && (
                  <div className="mt-3">
                    {loadingMeta ? (
                      <p className="text-sm text-gray-400">Loading courses...</p>
                    ) : (
                      <select
                        value={form.target_course_id}
                        onChange={e => setForm(f => ({ ...f, target_course_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">— Select a course —</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ''}{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {form.target_type === 'semester' && (
                  <div className="mt-3">
                    {loadingMeta ? (
                      <p className="text-sm text-gray-400">Loading semesters...</p>
                    ) : (
                      <select
                        value={form.target_semester_id}
                        onChange={e => setForm(f => ({ ...f, target_semester_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">— Select a semester —</option>
                        {semesters.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Summary preview */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm text-gray-600">
                <span className="font-medium">Preview: </span>
                Sending a <span className="font-medium text-blue-700">{form.type}</span> notification titled{' '}
                <span className="font-medium">"{form.title || '...'}"</span> to{' '}
                <span className="font-medium text-blue-700">
                  {TARGET_OPTIONS.find(t => t.value === form.target_type)?.label}
                  {form.target_type === 'specific_student' && form.target_user_id &&
                    ` (${students.find(s => String(s.id) === form.target_user_id)?.name || 'selected'})`}
                  {form.target_type === 'course' && form.target_course_id &&
                    ` (${courses.find(c => String(c.id) === form.target_course_id)?.name || 'selected'})`}
                  {form.target_type === 'semester' && form.target_semester_id &&
                    ` (${semesters.find(s => String(s.id) === form.target_semester_id)?.name || 'selected'})`}
                </span>.
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={sending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60">
                  {sending ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
