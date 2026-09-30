// frontend/src/pages/teacher/TeacherAssignments.jsx
import { useState, useEffect } from 'react';
import { assignmentsAPI, academicAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, ClipboardList, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [selected, setSelected]       = useState(null); // for grading
  const [form, setForm] = useState({ title:'', description:'', course_id:'', semester_id:'', total_marks:100, due_date:'', is_published:1 });
  const [gradeForm, setGradeForm] = useState({ marks_obtained:'', feedback:'' });
  const [saving, setSaving] = useState(false);
  const [courses, setCourses]     = useState([]);
const [semesters, setSemesters] = useState([]);

useEffect(() => {
  academicAPI.getCourses().then(r => setCourses(r.data)).catch(() => {});
  academicAPI.getSemesters().then(r => setSemesters(r.data)).catch(() => {});
}, []);



  const load = () => {
    setLoading(true);
    assignmentsAPI.list()
      .then(r => setAssignments(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await assignmentsAPI.create(form);
      toast.success('Assignment created');
      setShowModal(false);
      setForm({ title:'', description:'', course_id:'', semester_id:'', total_marks:100, due_date:'', is_published:1 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const loadSubmissions = async (a) => {
    try {
      const r = await assignmentsAPI.get(a.id);
      setSelected(r.data);
    } catch { toast.error('Failed to load submissions'); }
  };

  const handleGrade = async (subId) => {
    try {
      await assignmentsAPI.grade(subId, gradeForm);
      toast.success('Graded!');
      loadSubmissions(selected);
      setGradeForm({ marks_obtained:'', feedback:'' });
    } catch { toast.error('Failed to grade'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">Create and grade assignments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Assignment
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-4">
          {assignments.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No assignments yet. Create your first one!</p>
            </div>
          )}
          {assignments.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-semibold text-gray-800">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{a.course_name} · Due {format(parseISO(a.due_date), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{a.submissions_count} submitted</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.is_published ? 'Published' : 'Draft'}
                  </span>
                  <button onClick={() => loadSubmissions(a)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Submissions</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">New Assignment</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
  <select required value={form.semester_id}
    onChange={e => setForm(f=>({...f, semester_id:e.target.value}))}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
    <option value="">— Select Semester —</option>
    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current?' ✓':''}</option>)}
  </select>
</div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course ID *</label>
                  {/* <input required type="number" value={form.course_id} onChange={e => setForm(f=>({...f,course_id:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /> */}
               
               <select required value={form.course_id}
  onChange={e => setForm(f=>({...f, course_id:e.target.value}))}
  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
  <option value="">— Select Course —</option>
  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
</select>
               
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input type="number" value={form.total_marks} onChange={e => setForm(f=>({...f,total_marks:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input required type="datetime-local" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>






              <div className="flex items-center gap-2">
                <input type="checkbox" id="published" checked={!!form.is_published} onChange={e => setForm(f=>({...f,is_published:e.target.checked?1:0}))} className="rounded" />
                <label htmlFor="published" className="text-sm text-gray-700">Publish immediately</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Submissions: {selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {selected.submissions?.length > 0 ? selected.submissions.map(sub => (
                <div key={sub.id} className="p-5 border-b border-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-800">{sub.student_name}</p>
                      <p className="text-xs text-gray-500">{sub.roll_number}</p>
                      {sub.text_content && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg">{sub.text_content}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{sub.status}</span>
                      {sub.marks_obtained !== null && <p className="text-sm font-bold text-gray-800 mt-1">{sub.marks_obtained}/{selected.total_marks}</p>}
                    </div>
                  </div>
                  {sub.status !== 'graded' && (
                    <div className="mt-3 flex gap-2">
                      <input type="number" placeholder="Marks" max={selected.total_marks} onChange={e => setGradeForm(f => ({...f, marks_obtained: e.target.value}))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <input placeholder="Feedback" onChange={e => setGradeForm(f => ({...f, feedback: e.target.value}))} className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      <button onClick={() => handleGrade(sub.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Grade
                      </button>
                    </div>
                  )}
                </div>
              )) : <p className="text-center py-12 text-gray-400">No submissions yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
