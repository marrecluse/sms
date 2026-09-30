// frontend/src/pages/teacher/TeacherQuizzes.jsx
import { useState, useEffect } from 'react';
import { quizzesAPI, academicAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Users, Trash2, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const BLANK_Q = { question_text:'', question_type:'mcq', marks:1, option_a:'', option_b:'', option_c:'', option_d:'', correct_answer:'' };


export default function TeacherQuizzes() {
  const [quizzes, setQuizzes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [results, setResults]   = useState(null);
  const [form, setForm] = useState({ title:'', description:'', course_id:'', semester_id:'', total_marks:20, duration_minutes:30, start_time:'', end_time:'', is_published:0, questions: [{ ...BLANK_Q }] });
  const [saving, setSaving] = useState(false);
  const [courses, setCourses]   = useState([]);
  const [semesters, setSemesters] = useState([]);

  const load = () => {
    quizzesAPI.list().then(r => setQuizzes(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
  load();
  academicAPI.getCourses().then(r => setCourses(r.data)).catch(() => {});
  academicAPI.getSemesters().then(r => setSemesters(r.data)).catch(() => {});
}, []);

  const addQuestion = () => setForm(f => ({ ...f, questions: [...f.questions, { ...BLANK_Q }] }));
  const removeQuestion = (i) => setForm(f => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  const updateQ = (i, field, val) => setForm(f => ({ ...f, questions: f.questions.map((q, idx) => idx === i ? { ...q, [field]: val } : q) }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.course_id) { toast.error('Course ID is required'); return; }
    setSaving(true);
    try {
      await quizzesAPI.create(form);
      toast.success('Quiz created!');
      setShowModal(false);
      setForm({ title:'', description:'', course_id:'', semester_id:'', total_marks:20, duration_minutes:30, start_time:'', end_time:'', is_published:0, questions: [{ ...BLANK_Q }] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    } finally { setSaving(false); }
  };

  const viewResults = async (quiz) => {
    try {
      const r = await quizzesAPI.results(quiz.id);
      setResults({ quiz, data: r.data });
    } catch { toast.error('Failed to load results'); }
  };

  const deleteQuiz = async (id) => {
    if (!confirm('Delete this quiz?')) return;
    try {
      await quizzesAPI.remove(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quizzes</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage quizzes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4"/> New Quiz
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40"/>
          <p>No quizzes yet. Create your first quiz!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map(q => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-semibold text-gray-800">{q.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {q.course_name} · {q.total_marks} marks · {q.duration_minutes} min
                    {q.start_time && ` · ${format(parseISO(q.start_time), 'MMM d, h:mm a')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${q.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {q.is_published ? 'Published' : 'Draft'}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3"/>{q.attempts_count} attempts</span>
                  <button onClick={() => viewResults(q)} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><Eye className="w-3 h-3"/>Results</button>
                  <button onClick={() => deleteQuiz(q.id)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create quiz modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Fixed header — never scrolls */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">New Quiz</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input required value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course ID *</label>
                    <select required value={form.course_id}
  onChange={e => setForm(f => ({...f, course_id: e.target.value}))}
  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
  <option value="">— Select Course —</option>
  {courses.map(c => (
    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
  ))}
</select>
                    {/* <input required type="number" value={form.course_id} onChange={e => setForm(f=>({...f,course_id:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/> */}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                    <select required value={form.semester_id}
                      onChange={e => setForm(f => ({...f, semester_id: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">— Select Semester —</option>
                      {semesters.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                    <input type="number" value={form.duration_minutes} onChange={e => setForm(f=>({...f,duration_minutes:+e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input type="datetime-local" value={form.start_time} onChange={e => setForm(f=>({...f,start_time:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input type="datetime-local" value={form.end_time} onChange={e => setForm(f=>({...f,end_time:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">Questions</label>
                    <button type="button" onClick={addQuestion} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><Plus className="w-3 h-3"/>Add Question</button>
                  </div>
                  <div className="space-y-4">
                    {form.questions.map((q, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Q{i+1}</span>
                          {form.questions.length > 1 && <button type="button" onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5"/></button>}
                        </div>
                        <input placeholder="Question text *" value={q.question_text} onChange={e => updateQ(i,'question_text',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                        <div className="flex gap-3">
                          <select value={q.question_type} onChange={e => updateQ(i,'question_type',e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="mcq">MCQ</option>
                            <option value="true_false">True/False</option>
                            <option value="short">Short Answer</option>
                          </select>
                          <input type="number" placeholder="Marks" value={q.marks} onChange={e => updateQ(i,'marks',+e.target.value)} className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                        </div>
                        {q.question_type === 'mcq' && (
                          <div className="grid grid-cols-2 gap-2">
                            {['a','b','c','d'].map(k => (
                              <input key={k} placeholder={`Option ${k.toUpperCase()}`} value={q[`option_${k}`]} onChange={e => updateQ(i,`option_${k}`,e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                            ))}
                            <div className="col-span-2">
                              <input placeholder="Correct Answer (A/B/C/D)" value={q.correct_answer} onChange={e => updateQ(i,'correct_answer',e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                            </div>
                          </div>
                        )}
                        {q.question_type === 'true_false' && (
                          <input placeholder="Correct Answer (True/False)" value={q.correct_answer} onChange={e => updateQ(i,'correct_answer',e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="pub" checked={!!form.is_published} onChange={e => setForm(f=>({...f,is_published:e.target.checked?1:0}))} className="rounded"/>
                  <label htmlFor="pub" className="text-sm text-gray-700">Publish immediately</label>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 flex gap-3 flex-shrink-0 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Results panel */}
      {results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Results: {results.quiz.title}</h2>
              <button onClick={() => setResults(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {results.data.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase">#</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase">Roll</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.data.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">#{i+1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{r.student_name}</td>
                        <td className="px-4 py-3 text-gray-500">{r.roll_number}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{r.marks_obtained} / {results.quiz.total_marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center py-12 text-gray-400">No attempts yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
