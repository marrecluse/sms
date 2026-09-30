// frontend/src/pages/teacher/TeacherGrades.jsx
import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast';
import { Save, TrendingUp } from 'lucide-react';
import { gradesAPI, academicAPI } from '../../services/api';




export default function TeacherGrades() {
  const [courseId, setCourseId]   = useState('');
  const [semesterId, setSemesterId] = useState('1');
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(null);
  const [courses, setCourses]   = useState([]);
  const [semesters, setSemesters] = useState([]);



  useEffect(() => {
  academicAPI.getCourses().then(r => setCourses(r.data)).catch(() => {});
  academicAPI.getSemesters().then(r => setSemesters(r.data)).catch(() => {});
}, []);


  const load = async () => {
    if (!courseId) { toast.error('Please enter a course ID'); return; }
    setLoading(true);
    try {
      const r = await gradesAPI.get({ course_id: courseId, semester_id: semesterId });
      setStudents(r.data.map(s => ({ ...s, midterm: Number(s.midterm_marks)||0, final: Number(s.final_marks)||0, assignment: Number(s.assignment_marks)||0, quiz: Number(s.quiz_marks)||0 })));
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };
  

  const updateField = (idx, field, val) => {
    setStudents(prev => prev.map((s, i) => i === idx ? { ...s, [field]: Number(val) } : s));
  };

  const saveGrade = async (student) => {
    setSaving(student.enrollment_id);
    try {
      const r = await gradesAPI.save({ enrollment_id: student.enrollment_id, midterm_marks: student.midterm, final_marks: student.final, assignment_marks: student.assignment, quiz_marks: student.quiz });
      toast.success(`Grade saved for ${student.student_name} (${r.data.letter})`);
      setStudents(prev => prev.map(s => s.enrollment_id === student.enrollment_id ? { ...s, grade_letter: r.data.letter, gpa: r.data.gpa } : s));
    } catch { toast.error('Failed to save grade'); }
    finally { setSaving(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Grade Management</h1>
        <p className="text-gray-500 text-sm mt-1">Enter and manage student grades</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course ID</label>
{/*             
            <input type="number" value={courseId} onChange={e => setCourseId(e.target.value)} placeholder="e.g. 1" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-32" /> 
            */}


            <select value={courseId} onChange={e => setCourseId(e.target.value)}
  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]">
  <option value="">— Select Course —</option>
  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester ID</label>
{/*             
            <input type="number" value={semesterId} onChange={e => setSemesterId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-32" />
           */}
           

<select value={semesterId} onChange={e => setSemesterId(e.target.value)}
  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]">
  <option value="">— Select Semester —</option>
  {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' ✓' : ''}</option>)}
</select>

          </div>
          <button onClick={load} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? 'Loading...' : 'Load Students'}
          </button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Student','Roll','Midterm /30','Final /50','Assignment /10','Quiz /10','Total','Grade','Action'].map(h => (
                    <th key={h} className="text-left px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s, i) => {
                  const total = s.midterm + s.final + s.assignment + s.quiz;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{s.student_name}</td>
                      <td className="px-3 py-3 text-gray-500">{s.roll_number}</td>
                      {['midterm','final','assignment','quiz'].map(f => (
                        <td key={f} className="px-3 py-2">
                          <input
                            type="number" min="0" max={f==='midterm'?30:f==='final'?50:10}
                            value={s[f]}
                            onChange={e => updateField(i, f, e.target.value)}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-3 font-semibold text-gray-800">{total}</td>
                      <td className="px-3 py-3">
                        {s.grade_letter ? <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s.grade_letter}</span> : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => saveGrade(s)} disabled={saving === s.enrollment_id} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60">
                          <Save className="w-3 h-3" /> {saving === s.enrollment_id ? '...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {students.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Enter a course ID and load students to start grading</p>
        </div>
      )}
    </div>
  );
}
