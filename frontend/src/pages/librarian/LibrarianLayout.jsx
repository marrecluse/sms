// frontend/src/pages/librarian/LibrarianLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BookOpen, Bell, Menu } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';

const navItems = [
  { to: '/librarian',              icon: BookOpen, label: 'Library' },
  { to: '/librarian/notifications', icon: Bell,    label: 'Notifications' },
];

export default function LibrarianLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar navItems={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-60 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500"><Menu className="w-5 h-5"/></button>
          <span className="font-semibold text-gray-800">Librarian Portal</span>
        </header>
        <main className="flex-1 p-6"><Outlet /></main>
      </div>
    </div>
  );
}
