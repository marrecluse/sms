// frontend/src/pages/admin/AdminReports.jsx
import { useState, useEffect } from 'react';
import { gradesAPI, attendanceAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart2 } from 'lucide-react';

export default function AdminReports() {
  const [gradeData, setGradeData] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    gradesAPI.get()
      .then(r => {
        // Build grade distribution
        const dist = {};
        r.data.forEach(g => {
          if (g.grade_letter) dist[g.grade_letter] = (dist[g.grade_letter] || 0) + 1;
        });
        const ordered = ['A+','A','A-','B+','B','B-','C+','C','D','F'];
        setGradeData(ordered.filter(k => dist[k]).map(k => ({ grade: k, count: dist[k] })));
      })
      .catch(() => toast.error('Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Institution-wide performance analytics</p>
      </div>

      {/* Grade distribution */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-800">Grade Distribution</h2>
        </div>
        {gradeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gradeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No grade data available yet</p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Grades Recorded</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{gradeData.reduce((a, b) => a + b.count, 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Pass Rate</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {gradeData.length > 0 ? Math.round((gradeData.filter(g => g.grade !== 'F').reduce((a, b) => a + b.count, 0) / gradeData.reduce((a, b) => a + b.count, 0)) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Distinction (A+/A)</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {gradeData.filter(g => g.grade === 'A+' || g.grade === 'A').reduce((a, b) => a + b.count, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
