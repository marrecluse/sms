// frontend/src/pages/student/StudentGrades.jsx
import { useState, useEffect } from 'react';
import { gradesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';

const GRADE_COLORS = { 'A+':'bg-green-100 text-green-800','A':'bg-green-100 text-green-800','A-':'bg-green-100 text-green-700','B+':'bg-blue-100 text-blue-800','B':'bg-blue-100 text-blue-700','B-':'bg-blue-100 text-blue-600','C+':'bg-yellow-100 text-yellow-800','C':'bg-yellow-100 text-yellow-700','D':'bg-orange-100 text-orange-700','F':'bg-red-100 text-red-700' };

export default function StudentGrades() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gradesAPI.get().then(r => setData(r.data)).catch(() => toast.error('Failed to load grades')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-gray-500">Failed to load grades</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Grades</h1>
        <p className="text-gray-500 text-sm mt-1">Academic performance report</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-blue-600">{data.cgpa?.toFixed ? data.cgpa.toFixed(2) : '0.00'}</p>
          <p className="text-sm text-gray-500 mt-1">CGPA</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-800">{data.total_credits || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Credit Hours</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-800">{data.grades?.length || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Courses Graded</p>
        </div>
      </div>

      {/* Grades table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {data.grades?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Course','Code','Midterm','Final','Assignment','Quiz','Total','Grade','GPA'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.grades.map((g, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{g.course_name}</td>
                    <td className="px-4 py-3 text-gray-500">{g.code}</td>
                    <td className="px-4 py-3 text-gray-600">{g.midterm_marks ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{g.final_marks ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{g.assignment_marks ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{g.quiz_marks ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{g.total_marks ?? '—'}</td>
                    <td className="px-4 py-3">
                      {g.grade_letter ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_COLORS[g.grade_letter] || 'bg-gray-100 text-gray-700'}`}>{g.grade_letter}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{g.gpa ? Number(g.gpa).toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No grades recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
