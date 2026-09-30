// frontend/src/pages/student/StudentAttendance.jsx
import { useState, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, MinusCircle } from 'lucide-react';

const STATUS_CONFIG = {
  present: { label: 'Present', icon: CheckCircle, cls: 'bg-green-100 text-green-700' },
  absent:  { label: 'Absent',  icon: XCircle,     cls: 'bg-red-100 text-red-700' },
  late:    { label: 'Late',    icon: Clock,        cls: 'bg-yellow-100 text-yellow-700' },
  excused: { label: 'Excused', icon: MinusCircle,  cls: 'bg-gray-100 text-gray-600' },
};

export default function StudentAttendance() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState(() => new Date().toISOString().split('T')[0]);

  const load = () => {
    setLoading(true);
    attendanceAPI.get({ start_date: startDate, end_date: endDate })
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const attPct = data?.summary?.percentage ?? 0;
  const barColor = attPct >= 75 ? 'bg-green-500' : attPct >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Track your attendance records</p>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button onClick={load} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Apply</button>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Attendance Summary</h2>
            <span className={`text-lg font-bold ${attPct >= 75 ? 'text-green-600' : 'text-red-600'}`}>{attPct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${attPct}%` }} />
          </div>
          <div className="flex items-center gap-6 mt-3 text-sm">
            <span className="text-gray-500">Total classes: <strong>{data.summary.total}</strong></span>
            <span className="text-green-600">Present: <strong>{data.summary.present}</strong></span>
            <span className="text-red-500">Absent: <strong>{data.summary.total - data.summary.present}</strong></span>
          </div>
          {attPct < 75 && <p className="text-red-600 text-xs mt-2 font-medium">⚠ Below 75% threshold — at risk of academic penalty</p>}
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {data?.records?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Date','Course','Teacher','Status','Remarks'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.records.map((r, i) => {
                    const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.absent;
                    const Icon = sc.icon;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{r.course_name} <span className="text-gray-400 text-xs">({r.course_code})</span></td>
                        <td className="px-4 py-3 text-gray-500">{r.teacher_name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.cls}`}>
                            <Icon className="w-3 h-3" /> {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No attendance records found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
