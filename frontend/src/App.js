import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import Schools from '@/pages/Schools';
import Students from '@/pages/Students';
import Teachers from '@/pages/Teachers';
import Classes from '@/pages/Classes';
import Attendance from '@/pages/Attendance';
import Grades from '@/pages/Grades';
import Timetable from '@/pages/Timetable';
import Fees from '@/pages/Fees';
import Announcements from '@/pages/Announcements';
import Library from '@/pages/Library';
import Exams from '@/pages/Exams';
import ReportCards from '@/pages/ReportCards';
import Staff from '@/pages/Staff';
import Profile from '@/pages/Profile';
import UserManagement from './pages/userManagement';
import Subject from './pages/Subject';
import SystemCode from './pages/systemCode';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/schools" element={<PrivateRoute><Schools /></PrivateRoute>} />
          <Route path="/students" element={<PrivateRoute><Students /></PrivateRoute>} />
          <Route path="/teachers" element={<PrivateRoute><Teachers /></PrivateRoute>} />
          <Route path="/classes" element={<PrivateRoute><Classes /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/grades" element={<PrivateRoute><Grades /></PrivateRoute>} />
          <Route path="/timetable" element={<PrivateRoute><Timetable /></PrivateRoute>} />
          <Route path="/fees" element={<PrivateRoute><Fees /></PrivateRoute>} />
          <Route path="/announcements" element={<PrivateRoute><Announcements /></PrivateRoute>} />
          <Route path="/library" element={<PrivateRoute><Library /></PrivateRoute>} />
          <Route path="/exams" element={<PrivateRoute><Exams /></PrivateRoute>} />
          <Route path="/report-cards" element={<PrivateRoute><ReportCards /></PrivateRoute>} />
          <Route path="/staff" element={<PrivateRoute><Staff /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="/subject" element={<PrivateRoute><Subject /></PrivateRoute>} />
          <Route path="/systemcode" element={<PrivateRoute><SystemCode /></PrivateRoute>} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;