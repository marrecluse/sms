// frontend/src/pages/student/StudentAssignments.jsx
import { useState, useEffect } from 'react';
import { assignmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ClipboardList, Clock, CheckCircle, Send } from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [text, setText]               = useState('');
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    assignmentsAPI.list()
      .then(r => setAssignments(r.data))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) { toast.error('Please write your answer'); return; }
    setSubmitting(true);
    try {
      await assignmentsAPI.submit({ assignment_id: selected.id, text_content: text });
      toast.success('Assignment submitted!');
      setSelected(null);
      setText('');
      // Refresh
      const r = await assignmentsAPI.list();
      setAssignments(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const pending  = assignments.filter(a => !a.submission_id);
  const submitted = assignments.filter(a => a.submission_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Assignments</h1>
        <p className="text-gray-500 text-sm mt-1">{pending.length} pending · {submitted.length} submitted</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Pending</h2>
          <div className="grid gap-3">
            {pending.map(a => {
              const due    = parseISO(a.due_date);
              const overdue = !isAfter(due, new Date());
              return (
                <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-5 ${overdue ? 'border-red-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{a.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{a.course_name} · {a.teacher_name}</p>
                      {a.description && <p className="text-sm text-gray-600 mt-2">{a.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`flex items-center gap-1 text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        Due {format(due, 'MMM d, yyyy')}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Max: {a.total_marks} marks</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelected(a); setText(''); }}
                    className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Assignment
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submitted */}
      {submitted.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Submitted</h2>
          <div className="grid gap-3">
            {submitted.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-800">{a.title}</h3>
                    <p className="text-sm text-gray-500">{a.course_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.submission_status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {a.submission_status}
                    </span>
                    {a.marks_obtained !== null && (
                      <p className="text-sm font-bold text-gray-800 mt-1">{a.marks_obtained} / {a.total_marks}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No assignments yet</p>
        </div>
      )}

      {/* Submission modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{selected.title}</h2>
                <p className="text-sm text-gray-500">{selected.course_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {selected.description && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selected.description}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Answer *</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={6}
                  placeholder="Write your answer here..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
