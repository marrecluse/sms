// frontend/src/pages/admin/AdminAcademic.jsx
import { useState, useEffect } from 'react';
import { academicAPI, usersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Building2, BookOpen, Calendar, GraduationCap, Edit2, X, Check } from 'lucide-react';

const TABS = [
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'programs',    label: 'Programs',    icon: GraduationCap },
  { key: 'semesters',   label: 'Semesters',   icon: Calendar },
  { key: 'courses',     label: 'Courses',     icon: BookOpen },
];

export default function AdminAcademic() {
  const [tab, setTab]           = useState('departments');
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms]       = useState([]);
  const [teachers, setTeachers]       = useState([]);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);

  const load = async (t = tab) => {
    setLoading(true);
    try {
      let res;
      if (t === 'departments') res = await academicAPI.getDepartments();
      if (t === 'programs')    res = await academicAPI.getPrograms();
      if (t === 'semesters')   res = await academicAPI.getSemesters();
      if (t === 'courses')     res = await academicAPI.getCourses();
      setData(res.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(tab); }, [tab]);

  useEffect(() => {
    academicAPI.getDepartments().then(r => setDepartments(r.data)).catch(() => {});
    academicAPI.getPrograms().then(r => setPrograms(r.data)).catch(() => {});
    usersAPI.list('teacher').then(r => setTeachers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(tab === 'departments' ? { name:'', code:'' } :
            tab === 'programs'    ? { name:'', code:'', department_id:'', duration_years:4 } :
            tab === 'semesters'   ? { name:'', start_date:'', end_date:'', is_current:0 } :
                                    { name:'', code:'', program_id:'', credit_hours:3, description:'', teacher_id:'' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ ...item });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        if (tab === 'departments') await academicAPI.updateDepartment(editing.id, form);
        if (tab === 'programs')    await academicAPI.updateProgram(editing.id, form);
        if (tab === 'semesters')   await academicAPI.updateSemester(editing.id, form);
        if (tab === 'courses')     await academicAPI.updateCourse(editing.id, form);
        toast.success('Updated!');
      } else {
        if (tab === 'departments') await academicAPI.createDepartment(form);
        if (tab === 'programs')    await academicAPI.createProgram(form);
        if (tab === 'semesters')   await academicAPI.createSemester(form);
        if (tab === 'courses')     await academicAPI.createCourse(form);
        toast.success('Created!');
      }
      setShowModal(false);
      load(tab);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      if (tab === 'departments') await academicAPI.deleteDepartment(id);
      if (tab === 'programs')    await academicAPI.deleteProgram(id);
      if (tab === 'semesters')   await academicAPI.deleteSemester(id);
      if (tab === 'courses')     await academicAPI.deleteCourse(id);
      toast.success('Deleted');
      load(tab);
    } catch (err) { toast.error(err.response?.data?.error || 'Cannot delete'); }
  };

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Academic Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage departments, programs, semesters and courses</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data.length} records</p>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Add {TABS.find(t => t.key === tab)?.label.slice(0,-1)}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {tab === 'departments' && ['Name','Code','Programs','Teachers','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}
                  {tab === 'programs'    && ['Name','Code','Department','Duration','Students','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}
                  {tab === 'semesters'   && ['Name','Start Date','End Date','Current','Enrollments','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}
                  {tab === 'courses'     && ['Name','Code','Program','Teacher','Credits','Enrolled','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">No records yet. Create one!</td></tr> :
                  data.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {tab === 'departments' && <>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                        <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs font-mono px-2 py-0.5 rounded">{row.code}</span></td>
                        <td className="px-4 py-3 text-gray-500">{row.programs_count}</td>
                        <td className="px-4 py-3 text-gray-500">{row.teachers_count}</td>
                      </>}
                      {tab === 'programs' && <>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                        <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 text-xs font-mono px-2 py-0.5 rounded">{row.code}</span></td>
                        <td className="px-4 py-3 text-gray-500">{row.department_name}</td>
                        <td className="px-4 py-3 text-gray-500">{row.duration_years} yrs</td>
                        <td className="px-4 py-3 text-gray-500">{row.students_count}</td>
                      </>}
                      {tab === 'semesters' && <>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                        <td className="px-4 py-3 text-gray-500">{row.start_date}</td>
                        <td className="px-4 py-3 text-gray-500">{row.end_date}</td>
                        <td className="px-4 py-3">{row.is_current ? <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><Check className="w-3 h-3"/>Current</span> : '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{row.enrollments}</td>
                      </>}
                      {tab === 'courses' && <>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                        <td className="px-4 py-3"><span className="bg-green-100 text-green-700 text-xs font-mono px-2 py-0.5 rounded">{row.code}</span></td>
                        <td className="px-4 py-3 text-gray-500">{row.program_name}</td>
                        <td className="px-4 py-3 text-gray-500">{row.teacher_name || <span className="text-gray-300 text-xs">Not assigned</span>}</td>
                        <td className="px-4 py-3 text-gray-500">{row.credit_hours} cr</td>
                        <td className="px-4 py-3 text-gray-500">{row.enrolled_count}</td>
                      </>}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(row)} className="text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(row.id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">{editing ? 'Edit' : 'Add'} {TABS.find(t => t.key === tab)?.label.slice(0,-1)}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Department fields */}
              {tab === 'departments' && <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input required value={form.name||''} onChange={e=>f('name',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input required value={form.code||''} onChange={e=>f('code',e.target.value)} placeholder="e.g. CS" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
              </>}
              {/* Program fields */}
              {tab === 'programs' && <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input required value={form.name||''} onChange={e=>f('name',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input required value={form.code||''} onChange={e=>f('code',e.target.value)} placeholder="e.g. BSCS" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select required value={form.department_id||''} onChange={e=>f('department_id',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (years)</label>
                  <input type="number" min="1" max="6" value={form.duration_years||4} onChange={e=>f('duration_years',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
              </>}
              {/* Semester fields */}
              {tab === 'semesters' && <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input required value={form.name||''} onChange={e=>f('name',e.target.value)} placeholder="e.g. Fall 2025" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input required type="date" value={form.start_date||''} onChange={e=>f('start_date',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input required type="date" value={form.end_date||''} onChange={e=>f('end_date',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="current" checked={!!form.is_current} onChange={e=>f('is_current',e.target.checked?1:0)} className="rounded"/>
                  <label htmlFor="current" className="text-sm text-gray-700">Set as current semester</label>
                </div>
              </>}
              {/* Course fields */}
              {tab === 'courses' && <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input required value={form.name||''} onChange={e=>f('name',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input required value={form.code||''} onChange={e=>f('code',e.target.value)} placeholder="e.g. CS301" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                  <select required value={form.program_id||''} onChange={e=>f('program_id',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Credit Hours</label>
                  <input type="number" min="1" max="6" value={form.credit_hours||3} onChange={e=>f('credit_hours',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Assigned Teacher</label>
                  <select value={form.teacher_id||''} onChange={e=>f('teacher_id',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">No teacher assigned</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={2} value={form.description||''} onChange={e=>f('description',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"/></div>
              </>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
