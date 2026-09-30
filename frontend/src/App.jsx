// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage     from './pages/LoginPage';
import ProfilePage   from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import LibraryPage   from './pages/LibraryPage';
import NotFoundPage  from './pages/NotFoundPage';

import LibrarianLayout from './pages/librarian/LibrarianLayout';
import AdminLayout     from './pages/admin/AdminLayout';
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminUsers      from './pages/admin/AdminUsers';
import AdminReports    from './pages/admin/AdminReports';
import AdminAcademic   from './pages/admin/AdminAcademic';
import AdminEnrollments from './pages/admin/AdminEnrollments';

import TeacherLayout      from './pages/teacher/TeacherLayout';
import TeacherDashboard   from './pages/teacher/TeacherDashboard';
import TeacherAttendance  from './pages/teacher/TeacherAttendance';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherGrades      from './pages/teacher/TeacherGrades';
import TeacherQuizzes     from './pages/teacher/TeacherQuizzes';

import StudentLayout      from './pages/student/StudentLayout';
import StudentDashboard   from './pages/student/StudentDashboard';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentGrades      from './pages/student/StudentGrades';
import StudentAttendance  from './pages/student/StudentAttendance';
import StudentQuizzes     from './pages/student/StudentQuizzes';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!user || !user.role) return <Navigate to="/login" replace />;
  // role can be a single string or array of allowed roles
  const allowed = Array.isArray(role) ? role : [role];
  if (role && !allowed.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.role) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ── Admin ── */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index                    element={<AdminDashboard />} />
            <Route path="users"             element={<AdminUsers />} />
            <Route path="academic"          element={<AdminAcademic />} />
            <Route path="enrollments"       element={<AdminEnrollments />} />
            <Route path="reports"           element={<AdminReports />} />
            <Route path="library"           element={<LibraryPage />} />
            <Route path="notifications"     element={<NotificationsPage />} />
            <Route path="profile"           element={<ProfilePage />} />
          </Route>

          {/* ── Teacher ── */}
          <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherLayout /></ProtectedRoute>}>
            <Route index                    element={<TeacherDashboard />} />
            <Route path="attendance"        element={<TeacherAttendance />} />
            <Route path="assignments"       element={<TeacherAssignments />} />
            <Route path="quizzes"           element={<TeacherQuizzes />} />
            <Route path="grades"            element={<TeacherGrades />} />
            <Route path="library"           element={<LibraryPage />} />
            <Route path="notifications"     element={<NotificationsPage />} />
            <Route path="profile"           element={<ProfilePage />} />
          </Route>

          {/* ── Student ── */}
          <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
            <Route index                    element={<StudentDashboard />} />
            <Route path="assignments"       element={<StudentAssignments />} />
            <Route path="quizzes"           element={<StudentQuizzes />} />
            <Route path="grades"            element={<StudentGrades />} />
            <Route path="attendance"        element={<StudentAttendance />} />
            <Route path="library"           element={<LibraryPage />} />
            <Route path="notifications"     element={<NotificationsPage />} />
            <Route path="profile"           element={<ProfilePage />} />
          </Route>

          {/* ── Librarian ── */}
          <Route path="/librarian" element={<ProtectedRoute role="librarian"><LibrarianLayout /></ProtectedRoute>}>
            <Route index                        element={<LibraryPage />} />
            <Route path="notifications"         element={<NotificationsPage />} />
            <Route path="profile"               element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
