// frontend/src/pages/teacher/TeacherAttendance.jsx
import { useState, useEffect } from 'react';
import { attendanceAPI, coursesAPI, academicAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Save } from 'lucide-react';

const STATUSES = ['present','absent','late','excused'];
const STATUS_COLORS = { present:'bg-green-100 text-green-700 border-green-200', absent:'bg-red-100 text-red-700 border-red-200', late:'bg-yellow-100 text-yellow-700 border-yellow-200', excused:'bg-gray-100 text-gray-600 border-gray-200' };



export default function TeacherAttendance() {
  const [courseId, setCourseId] = useState('');
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [courses, setCourses] = useState([]);

  const [history, setHistory]     = useState([]);
const [showHistory, setShowHistory] = useState(false);
const [histStart, setHistStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
const [histEnd, setHistEnd]     = useState(() => new Date().toISOString().split('T')[0]);




  useEffect(() => {
  academicAPI.getCourses().then(r => setCourses(r.data)).catch(() => {});
}, []);

const loadStudents = async () => {
  if (!courseId) { toast.error('Please select a course'); return; }
  setLoading(true);
  try {
    // Load enrolled students for this course
    const r = await academicAPI.getEnrollments({ course_id: courseId });
    if (r.data.length === 0) {
      toast.error('No students enrolled in this course');
      setRecords([]);
      return;
    }
    // Check if attendance already marked for today
    const today = date;
    const existing = await attendanceAPI.get({ course_id: courseId, start_date: today, end_date: today });
    const existingMap = {};
    if (existing.data && Array.isArray(existing.data)) {
      existing.data.forEach(a => { existingMap[a.roll_number] = a.status; });
    }
    setRecords(r.data.map(e => ({
      enrollment_id: e.id,
      name: e.student_name,
      roll: e.roll_number,
      status: existingMap[e.roll_number] || 'present',
      remarks: ''
    })));
    toast.success(`Loaded ${r.data.length} students`);
  } catch {
    toast.error('Failed to load students');
  } finally { setLoading(false); }
};



const loadHistory = async () => {
  if (!courseId) { toast.error('Select a course first'); return; }
  try {
    const r = await attendanceAPI.get({ 
      course_id: courseId, 
      start_date: histStart, 
      end_date: histEnd 
    });
    setHistory(r.data);
    setShowHistory(true);
  } catch { toast.error('Failed to load history'); }
};

const downloadHistoryCSV = () => {
  const headers = ['Roll Number', 'Student Name', 'Date', 'Status'];
  const rows = history.map(r => [r.roll_number, r.student_name, r.date, r.status]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_history_${courseId}_${histStart}_${histEnd}.csv`;
  a.click();
};


const downloadCSV = () => {
  const headers = ['Roll Number', 'Student Name', 'Date', 'Status', 'Remarks'];
  const rows = records.map(r => [r.roll, r.name, date, r.status, r.remarks || '']);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${courseId}_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

  const handleSave = async () => {
    if (records.length === 0) { toast.error('No records to save'); return; }
    setSaving(true);
    try {
      await attendanceAPI.mark({
        records: records.map(r => ({ enrollment_id: r.enrollment_id, date, status: r.status, remarks: r.remarks }))
      });
      toast.success('Attendance saved!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = (idx, status) => setRecords(r => r.map((rec, i) => i === idx ? { ...rec, status } : rec));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mark Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Record daily attendance for your courses</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course ID</label>
           {/*
            <input
              type="number"
              placeholder="Enter course ID"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-40"
            />
            */} 

            <select value={courseId} onChange={e => setCourseId(e.target.value)}
         className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[220px]">
         <option value="">— Select Course —</option>
         {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>


          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={loadStudents} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? 'Loading...' : 'Load Records'}
          </button>
        </div>
      </div>

      {/* View History */}
<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
  <h2 className="font-semibold text-gray-800 mb-4">📋 View Attendance History</h2>
  <div className="flex flex-wrap items-end gap-4">
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
      <input type="date" value={histStart} onChange={e => setHistStart(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
      <input type="date" value={histEnd} onChange={e => setHistEnd(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
    </div>
    <button onClick={loadHistory}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
      Load History
    </button>
    {history.length > 0 && (
      <button onClick={downloadHistoryCSV}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
        ⬇ Download CSV
      </button>
    )}
  </div>

  {showHistory && history.length > 0 && (
    <div className="mt-4 overflow-x-auto">
      <p className="text-sm text-gray-500 mb-2">{history.length} records found</p>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {['Date','Student','Roll No','Status'].map(h => (
              <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {history.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-600">{r.date}</td>
              <td className="px-3 py-2 font-medium text-gray-800">{r.student_name}</td>
              <td className="px-3 py-2 text-gray-500 font-mono text-xs">{r.roll_number}</td>
              <td className="px-3 py-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  r.status === 'present' ? 'bg-green-100 text-green-700' :
                  r.status === 'absent'  ? 'bg-red-100 text-red-700' :
                  r.status === 'late'    ? 'bg-yellow-100 text-yellow-700' :
                                           'bg-gray-100 text-gray-600'}`}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
  {showHistory && history.length === 0 && (
    <p className="text-gray-400 text-sm mt-3">No attendance records found for this date range</p>
  )}
</div>

      {/* Attendance list */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{records.length} Students</h2>
            <div className="flex gap-2">
              <button onClick={() => setRecords(r => r.map(rec => ({ ...rec, status: 'present' })))} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg font-medium hover:bg-green-200">All Present</button>
              <button onClick={() => setRecords(r => r.map(rec => ({ ...rec, status: 'absent' })))} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-medium hover:bg-red-200">All Absent</button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {records.map((rec, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{rec.name}</p>
                  <p className="text-xs text-gray-500">{rec.roll}</p>
                </div>
                <div className="flex gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(i, s)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium capitalize transition-colors ${rec.status === s ? STATUS_COLORS[s] : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Attendance Report Section */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Download Report</h2>
            <div className="flex gap-2">
              <button onClick={downloadCSV}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                ⬇ Download CSV
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {records.filter(r => r.status === 'present').length} Present · 
            {records.filter(r => r.status === 'absent').length} Absent · 
            {records.filter(r => r.status === 'late').length} Late · 
            Date: {date}
          </p>
        </div>
      )}

    </div>
  );
}
