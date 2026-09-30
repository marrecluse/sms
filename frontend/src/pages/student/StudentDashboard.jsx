// frontend/src/pages/student/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import StatsCard from '../../components/shared/StatsCard';
import { BookOpen, CheckCircle, TrendingUp, Bell, Clock, AlertCircle, Info } from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';

export default function StudentDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    dashboardAPI.get()
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <p className="text-red-700 font-medium">{error}</p>
      <p className="text-red-500 text-sm mt-1">Please contact your administrator.</p>
    </div>
  );

  const attColor  = (data.attendance_pct >= 75) ? 'green' : (data.attendance_pct >= 60) ? 'orange' : 'red';
  const cgpaColor = (data.cgpa >= 3.5) ? 'green' : (data.cgpa >= 2.5) ? 'blue' : 'orange';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Academic overview</p>
      </div>

      {data.warning && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
          <p className="text-sm text-blue-700">{data.warning}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Enrolled Courses"      value={data.courses?.length ?? 0}    icon={BookOpen}    color="blue" />
        <StatsCard title="Attendance"            value={`${data.attendance_pct}%`}     icon={CheckCircle} color={attColor} subtitle={data.attendance_pct < 75 ? 'Below minimum!' : 'Good standing'} />
        <StatsCard title="Current CGPA"          value={Number(data.cgpa || 0).toFixed(2)} icon={TrendingUp}  color={cgpaColor} />
        <StatsCard title="Unread Notifications"  value={data.unread_notifications}     icon={Bell}        color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrolled courses */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600"/> My Courses
          </h2>
          {data.courses?.length > 0 ? (
            <div className="space-y-2">
              {data.courses.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.code} · {c.teacher} · {c.semester}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">{c.credit_hours} cr</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 mx-auto text-gray-200 mb-2"/>
              <p className="text-gray-400 text-sm">Not enrolled in any courses yet.</p>
              <p className="text-gray-400 text-xs mt-1">Contact admin to get enrolled.</p>
            </div>
          )}
        </div>

        {/* Upcoming assignments */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600"/> Upcoming Assignments
          </h2>
          {data.upcoming_assignments?.length > 0 ? (
            <div className="space-y-2">
              {data.upcoming_assignments.map((a, i) => {
                const due     = parseISO(a.due_date);
                const overdue = !isAfter(due, new Date());
                return (
                  <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                      <p className="text-xs text-gray-500">{a.course}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className={`text-xs font-semibold ${overdue ? 'text-red-600' : 'text-gray-600'}`}>{format(due,'MMM d')}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${a.status === 'submitted' || a.status === 'graded' ? 'bg-green-100 text-green-700' : overdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {a.status === 'pending' && overdue ? 'Overdue' : a.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-gray-400 text-sm text-center py-8">No upcoming assignments</p>}
        </div>
      </div>

      {data.attendance_pct > 0 && data.attendance_pct < 75 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-red-800">Low Attendance Warning</p>
            <p className="text-sm text-red-700 mt-0.5">Your attendance is {data.attendance_pct}%, below the required 75%. Please improve attendance to avoid academic penalties.</p>
          </div>
        </div>
      )}
    </div>
  );
}
