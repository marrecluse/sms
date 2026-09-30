// frontend/src/pages/student/StudentLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, TrendingUp, CheckCircle, Bell, Menu, HelpCircle, BookOpen } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';

const navItems = [
  { to: '/student',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/assignments',   icon: ClipboardList,   label: 'Assignments' },
  { to: '/student/quizzes',       icon: HelpCircle,      label: 'Quizzes' },
  { to: '/student/grades',        icon: TrendingUp,      label: 'My Grades' },
  { to: '/student/attendance',    icon: CheckCircle,     label: 'Attendance' },
  { to: '/student/library',       icon: BookOpen,        label: 'Library' },
  { to: '/student/notifications', icon: Bell,            label: 'Notifications' },
];

export default function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar navItems={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-60 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500"><Menu className="w-5 h-5"/></button>
          <span className="font-semibold text-gray-800">Student Portal</span>
        </header>
        <main className="flex-1 p-6"><Outlet /></main>
      </div>
    </div>
  );
}
