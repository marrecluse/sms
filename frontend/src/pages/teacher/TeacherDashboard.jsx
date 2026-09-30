// frontend/src/pages/teacher/TeacherDashboard.jsx
import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import StatsCard from '../../components/shared/StatsCard';
import { BookOpen, Users, AlertCircle, Clock, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TeacherDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-gray-500">Failed to load dashboard</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your teaching overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="My Courses"      value={data.my_courses}     icon={BookOpen}    color="blue" />
        <StatsCard title="My Students"     value={data.my_students}    icon={Users}       color="green" />
        <StatsCard title="Pending Grading" value={data.pending_grades} icon={AlertCircle} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming assignments */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-orange-600" />Upcoming Assignments</h2>
          {data.upcoming_assignments?.length > 0 ? (
            <div className="space-y-2">
              {data.upcoming_assignments.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.course}</p>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{format(parseISO(a.due_date), 'MMM d')}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">No upcoming assignments</p>}
        </div>

        {/* Today's attendance */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-600" />Today's Attendance</h2>
          {data.today_attendance?.length > 0 ? (
            <div className="space-y-2">
              {data.today_attendance.map((a, i) => {
                const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
                return (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">{a.name}</p>
                      <span className="text-xs font-semibold text-gray-600">{a.present}/{a.total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-gray-400 text-sm">No attendance marked today</p>}
        </div>
      </div>
    </div>
  );
}
