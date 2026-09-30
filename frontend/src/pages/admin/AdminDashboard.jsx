// frontend/src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import StatsCard from '../../components/shared/StatsCard';
import { Users, GraduationCap, BookOpen, AlertCircle, BarChart2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6','#ef4444','#f59e0b','#10b981'];

export default function AdminDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-gray-500">Failed to load dashboard</p>;

  const attendancePie = Object.entries(data.today_attendance || {}).map(([name, value]) => ({ name, value: Number(value) }));
  const enrollTrend   = (data.enrollment_trend || []).map(r => ({ month: r.month, count: Number(r.count) })).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your institution</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Total Students" value={data.total_students} icon={GraduationCap} color="blue" />
        <StatsCard title="Total Teachers" value={data.total_teachers} icon={Users} color="green" />
        <StatsCard title="Total Courses"  value={data.total_courses}  icon={BookOpen}    color="purple" />
        <StatsCard title="Pending Grades" value={data.pending_grades} icon={AlertCircle}  color="orange" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Enrollment Trend</h2>
          </div>
          {enrollTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={enrollTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-12">No enrollment data yet</p>}
        </div>

        {/* Attendance today */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-800">Today's Attendance</h2>
          </div>
          {attendancePie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={attendancePie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {attendancePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-12">No attendance marked today</p>}
        </div>
      </div>

      {/* Top students */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Top Students by GPA</h2>
        {data.top_students?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Roll No</th>
                  <th className="pb-2 font-medium text-right">GPA</th>
                </tr>
              </thead>
              <tbody>
                {data.top_students.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 text-gray-500 font-medium">#{i+1}</td>
                    <td className="py-2.5 font-medium text-gray-800">{s.name}</td>
                    <td className="py-2.5 text-gray-500">{s.roll_number}</td>
                    <td className="py-2.5 text-right">
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {Number(s.avg_gpa).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-gray-400 text-sm">No grade data available</p>}
      </div>
    </div>
  );
}
