// frontend/src/pages/admin/AdminLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Bell, Menu, BookOpen, UserPlus, Building2, UserCircle } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';

const navItems = [
  { to: '/admin',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users',         icon: Users,           label: 'Users' },
  { to: '/admin/academic',      icon: Building2,       label: 'Academic Setup' },
  { to: '/admin/enrollments',   icon: UserPlus,        label: 'Enrollments' },
  { to: '/admin/reports',       icon: BarChart3,       label: 'Reports' },
  { to: '/admin/library',       icon: BookOpen,        label: 'Library' },
  { to: '/admin/notifications', icon: Bell,            label: 'Notifications' },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar navItems={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-60 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500"><Menu className="w-5 h-5"/></button>
          <span className="font-semibold text-gray-800">Admin Portal</span>
        </header>
        <main className="flex-1 p-6"><Outlet /></main>
      </div>
    </div>
  );
}
