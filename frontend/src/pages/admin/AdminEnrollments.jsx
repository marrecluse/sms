// frontend/src/pages/admin/AdminEnrollments.jsx
import { useState, useEffect } from 'react';
import { academicAPI, usersAPI, attendanceAPI, gradesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Edit2, Eye, X, GraduationCap, CalendarDays } from 'lucide-react';

const Sel = ({ label, value, onChange, children, required }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>}
    <select required={required} value={value} onChange={onChange}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
      {children}
    </select>
  </div>
);

const Modal = ({ title, onClose, children, size = 'max-w-md' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${size} max-h-[90vh] overflow-y-auto`}>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Badge = ({ label, color }) => (
  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
);

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents]       = useState([]);
  const [courses, setCourses]         = useState([]);
  const [semesters, setSemesters]     = useState([]);
  const [teachers, setTeachers]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [filter, setFilter]           = useState({ course_id:'', semester_id:'' });

  // Modals
  const [enrollModal, setEnrollModal]   = useState(false);
  const [viewModal, setViewModal]       = useState(null);   // enrollment obj
  const [editModal, setEditModal]       = useState(null);   // enrollment obj
  const [deleteModal, setDeleteModal]   = useState(null);   // enrollment obj
  const [gradeModal, setGradeModal]     = useState(null);   // { enrollment, data }
  const [attendModal, setAttendModal]   = useState(null);   // { enrollment, data }

  const [form, setForm]       = useState({ student_id:'', course_id:'', semester_id:'', teacher_id:'' });
  const [editTeacher, setEditTeacher] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.course_id)   params.course_id   = filter.course_id;
      if (filter.semester_id) params.semester_id = filter.semester_id;
      const r = await academicAPI.getEnrollments(params);
      setEnrollments(r.data);
    } catch { toast.error('Failed to load enrollments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    academicAPI.getCourses().then(r => setCourses(r.data)).catch(()=>{});
    academicAPI.getSemesters().then(r => setSemesters(r.data)).catch(()=>{});
    usersAPI.list('student').then(r => setStudents(r.data)).catch(()=>{});
    usersAPI.list('teacher').then(r => setTeachers(r.data)).catch(()=>{});
  }, []);

  // ── Enroll ────────────────────────────────────────────────────────────────
  const handleEnroll = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await academicAPI.createEnrollment(form);
      toast.success('Student enrolled!');
      setEnrollModal(false);
      setForm({ student_id:'', course_id:'', semester_id:'', teacher_id:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to enroll'); }
    finally { setSaving(false); }
  };

  // ── Edit Teacher ──────────────────────────────────────────────────────────
  const openEdit = (en) => { setEditTeacher(en.teacher_id || ''); setEditModal(en); };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await academicAPI.updateEnrollment(editModal.id, { teacher_id: editTeacher });
      toast.success('Teacher updated');
      setEditModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
    finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await academicAPI.deleteEnrollment(deleteModal.id);
      toast.success('Enrollment removed');
      setDeleteModal(null);
      load();
    } catch { toast.error('Failed to remove enrollment'); }
  };

  // ── View Grade ────────────────────────────────────────────────────────────
  const openGrade = async (en) => {
    try {
      const r = await gradesAPI.get({ enrollment_id: en.id });
      setGradeModal({ enrollment: en, data: r.data });
    } catch { toast.error('No grade data found'); }
  };

  // ── View Attendance ───────────────────────────────────────────────────────
  const openAttend = async (en) => {
    try {
      const r = await attendanceAPI.get({ enrollment_id: en.id });
      setAttendModal({ enrollment: en, data: r.data });
    } catch { toast.error('No attendance data found'); }
  };

  const ATTEND_COLOR = { Present:'bg-green-100 text-green-700', Absent:'bg-red-100 text-red-700', Leave:'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Enrollments</h1>
          <p className="text-gray-500 text-sm mt-1">Manage student course enrollments</p>
        </div>
        <button onClick={() => setEnrollModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <UserPlus className="w-4 h-4"/> Enroll Student
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Course</label>
          <select value={filter.course_id} onChange={e => setFilter(f=>({...f,course_id:e.target.value}))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]">
            <option value="">All courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Semester</label>
          <select value={filter.semester_id} onChange={e => setFilter(f=>({...f,semester_id:e.target.value}))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[180px]">
            <option value="">All semesters</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {(filter.course_id || filter.semester_id) && (
          <button onClick={() => setFilter({ course_id:'', semester_id:'' })}
            className="self-end text-xs text-blue-600 hover:underline pb-1.5">Clear filters</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Student','Roll No','Course','Semester','Teacher','Enrolled On','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enrollments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No enrollments found</td></tr>
                ) : enrollments.map(en => (
                  <tr key={en.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{en.student_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{en.roll_number}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-blue-600 font-semibold">{en.course_code}</span>
                      <span className="text-gray-600 ml-1">{en.course_name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{en.semester}</td>
                    <td className="px-4 py-3 text-gray-500">{en.teacher_name || <span className="text-gray-300 italic">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{en.enrolled_at?.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">

                        {/* View Details */}
                        <button onClick={() => setViewModal(en)} title="View Details"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Eye className="w-4 h-4"/>
                        </button>

                        {/* Edit Teacher */}
                        <button onClick={() => openEdit(en)} title="Change Teacher"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                          <Edit2 className="w-4 h-4"/>
                        </button>

                        {/* View Attendance */}
                        <button onClick={() => openAttend(en)} title="View Attendance"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <CalendarDays className="w-4 h-4"/>
                        </button>

                        {/* View Grade */}
                        <button onClick={() => openGrade(en)} title="View Grade"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                          <GraduationCap className="w-4 h-4"/>
                        </button>

                        {/* Delete */}
                        <button onClick={() => setDeleteModal(en)} title="Remove Enrollment"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4"/>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Enroll Modal ───────────────────────────────────────────────────── */}
      {enrollModal && (
        <Modal title="Enroll Student" onClose={() => setEnrollModal(false)}>
          <form onSubmit={handleEnroll} className="space-y-4">
            <Sel label="Student" required value={form.student_id} onChange={e=>setForm(f=>({...f,student_id:e.target.value}))}>
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.student_id}>{s.name} ({s.email})</option>)}
            </Sel>
            <Sel label="Course" required value={form.course_id} onChange={e=>setForm(f=>({...f,course_id:e.target.value}))}>
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </Sel>
            <Sel label="Semester" required value={form.semester_id} onChange={e=>setForm(f=>({...f,semester_id:e.target.value}))}>
              <option value="">Select semester</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current?' (current)':''}</option>)}
            </Sel>
            <Sel label="Teacher" required value={form.teacher_id} onChange={e=>setForm(f=>({...f,teacher_id:e.target.value}))}>
              <option value="">Select teacher</option>
              {teachers.map(t => <option key={t.id} value={t.teacher_id}>{t.name}</option>)}
            </Sel>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEnrollModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Enrolling...' : 'Enroll'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Details Modal ─────────────────────────────────────────────── */}
      {viewModal && (
        <Modal title="Enrollment Details" onClose={() => setViewModal(null)}>
          <div className="space-y-3">
            {[
              ['Student',     viewModal.student_name],
              ['Roll Number', viewModal.roll_number],
              ['Course',      `${viewModal.course_code} — ${viewModal.course_name}`],
              ['Semester',    viewModal.semester],
              ['Teacher',     viewModal.teacher_name || 'Unassigned'],
              ['Enrolled On', viewModal.enrolled_at ? new Date(viewModal.enrolled_at).toLocaleString('en-PK') : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                <span className="font-medium text-gray-500 w-32">{label}</span>
                <span className="text-gray-800 text-right">{value}</span>
              </div>
            ))}
            <div className="flex gap-3 pt-3">
              <button onClick={() => { setViewModal(null); openEdit(viewModal); }}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                <Edit2 className="w-4 h-4"/> Change Teacher
              </button>
              <button onClick={() => setViewModal(null)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Teacher Modal ─────────────────────────────────────────────── */}
      {editModal && (
        <Modal title={`Change Teacher — ${editModal.student_name}`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p><span className="font-medium">Course:</span> {editModal.course_code} — {editModal.course_name}</p>
              <p><span className="font-medium">Semester:</span> {editModal.semester}</p>
              <p><span className="font-medium">Current Teacher:</span> {editModal.teacher_name || 'Unassigned'}</p>
            </div>
            <Sel label="New Teacher" required value={editTeacher} onChange={e => setEditTeacher(e.target.value)}>
              <option value="">Select teacher</option>
              {teachers.map(t => <option key={t.id} value={t.teacher_id}>{t.name}</option>)}
            </Sel>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Saving...' : 'Update Teacher'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Attendance Modal ───────────────────────────────────────────────── */}
      {attendModal && (
        <Modal title={`Attendance — ${attendModal.enrollment.student_name}`} onClose={() => setAttendModal(null)} size="max-w-lg">
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{attendModal.enrollment.course_code} · {attendModal.enrollment.semester}</p>
            {!attendModal.data || attendModal.data.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No attendance records yet</p>
            ) : (
              <>
                {/* Summary */}
                {(() => {
                  const total   = attendModal.data.length;
                  const present = attendModal.data.filter(a => a.status === 'Present').length;
                  const pct     = total ? Math.round((present / total) * 100) : 0;
                  return (
                    <div className={`flex items-center justify-between p-3 rounded-lg ${pct < 75 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                      <span className="text-sm font-medium text-gray-700">{present}/{total} classes present</span>
                      <span className={`text-sm font-bold ${pct < 75 ? 'text-red-600' : 'text-green-600'}`}>{pct}%</span>
                    </div>
                  );
                })()}
                {/* Records */}
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {attendModal.data.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-gray-50">
                      <span className="text-gray-600">{a.date}</span>
                      <Badge label={a.status} color={ATTEND_COLOR[a.status] || 'bg-gray-100 text-gray-600'} />
                    </div>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => setAttendModal(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium mt-2">Close</button>
          </div>
        </Modal>
      )}

      {/* ── Grade Modal ────────────────────────────────────────────────────── */}
      {gradeModal && (
        <Modal title={`Grade — ${gradeModal.enrollment.student_name}`} onClose={() => setGradeModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{gradeModal.enrollment.course_code} · {gradeModal.enrollment.semester}</p>
            {!gradeModal.data ? (
              <p className="text-center text-gray-400 py-8">No grade recorded yet</p>
            ) : (
              <>
                {[
                  ['Midterm Marks',    gradeModal.data.midterm_marks],
                  ['Final Marks',      gradeModal.data.final_marks],
                  ['Assignment Marks', gradeModal.data.assignment_marks],
                  ['Quiz Marks',       gradeModal.data.quiz_marks],
                  ['Total Marks',      gradeModal.data.total_marks],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                    <span className="text-gray-500 font-medium">{label}</span>
                    <span className="text-gray-800">{value ?? '—'}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">Letter Grade</span>
                  <span className="text-2xl font-bold text-blue-600">{gradeModal.data.letter_grade || '—'}</span>
                </div>
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm text-gray-500">GPA Points</span>
                  <span className="text-sm font-semibold text-gray-700">{gradeModal.data.grade_points ?? '—'} / 4.0</span>
                </div>
              </>
            )}
            <button onClick={() => setGradeModal(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium mt-2">Close</button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteModal && (
        <Modal title="Remove Enrollment" onClose={() => setDeleteModal(null)}>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              This will remove <strong>{deleteModal.student_name}</strong> from <strong>{deleteModal.course_code} — {deleteModal.course_name}</strong> ({deleteModal.semester}). Attendance and grade records for this enrollment will also be deleted.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">Remove Enrollment</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}