import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Landing from '@/pages/Landing';
import Admission from '@/pages/Admission'
import Dashboard from '@/pages/Dashboard';
import Schools from '@/pages/Schools';
import Students from '@/pages/Students';
import Teachers from '@/pages/Teachers';
import Classes from '@/pages/Classes';
import Attendance from '@/pages/Attendance';
import Grades from '@/pages/Grades';
import Timetable from '@/pages/Timetable';
import Fees from '@/pages/Fees';
import FeePaidSlip from '@/pages/FeePaidSlip';
import Announcements from '@/pages/Announcements';
import Library from '@/pages/Library';
import Exams from '@/pages/Exams';
import CreateExamSchedule from '@/pages/CreateExamSchedule';
import ExamMarksEntry from '@/pages/ExamMarksEntry';
import ReportCards from '@/pages/ReportCards';
import Staff from '@/pages/Staff';
import BulkUpload from '@/pages/BulkUpload';
import Profile from '@/pages/Profile';
import UserManagement from './pages/userManagement';
import Subject from './pages/Subject';
import SystemCode from './pages/systemCode';
import MenuManagement from './pages/menuManagement';
import { useEffect, useState } from 'react';
import { menusApi } from './api';
import ViewReports from './pages/ViewReports';
import PromoteStudents from './pages/PromoteStudents';
import Salary from './pages/Salary';
import PendingFees from './pages/PendingFees';

// Route permission mapping as fallback (optional)
const FALLBACK_PERMISSIONS = {
  '/dashboard': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  '/admission': ['super_admin', 'school_admin'],
  '/schools': ['super_admin'],
  '/students': ['super_admin', 'school_admin', 'teacher', 'parent'],
  '/teachers': ['super_admin', 'school_admin'],
  '/classes': ['super_admin', 'school_admin'],
  '/attendance': ['super_admin', 'school_admin', 'teacher'],
  '/grades': ['super_admin', 'school_admin', 'teacher', 'parent'],
  '/timetable': ['super_admin', 'school_admin', 'teacher', 'student'],
  '/fees': ['super_admin', 'school_admin', 'parent'],
  '/feePaidSlip': ['super_admin', 'school_admin'],
  '/announcements': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  '/library': ['super_admin', 'school_admin', 'student'],
  '/exams': ['super_admin', 'school_admin', 'teacher', 'student'],
  '/createExam': ['super_admin'],
  '/report-cards': ['super_admin', 'school_admin', 'teacher', 'parent'],
  '/staff': ['super_admin', 'school_admin'],
  '/profile': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  '/users': ['super_admin', 'school_admin'],
  '/subject': ['super_admin', 'school_admin'],
  '/systemcode': ['super_admin'],
  '/menus': ['super_admin'],
  '/bulkUpload': ['super_admin','school_admin'],
  '/ViewReports': ['super_admin','school_admin'],
  '/PromoteStudents': ['super_admin','school_admin'],
  '/salary': ['super_admin','school_admin'],
  '/pending-fees': ['super_admin','school_admin']
};

// Custom hook to manage user menus
function useUserMenus() {
  const { user } = useAuth();
  const [userMenus, setUserMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserMenus = async () => {
      if (user) {
        try {
          setLoading(true);
          setError(null);
          const response = await menusApi.getMyMenu();
          setUserMenus(response.data.data || []);
        } catch (err) {
          console.error('Failed to load user menus:', err);
          setError('Failed to load navigation permissions');
          setUserMenus([]);
        } finally {
          setLoading(false);
        }
      } else {
        // Clear menus when user logs out
        setUserMenus([]);
        setLoading(false);
        setError(null);
      }
    };

    loadUserMenus();
  }, [user]);

  return { userMenus, loading, error };
}

function PrivateRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  
  // Only check auth loading, not menu loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Redirect to landing page if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function ProtectedRoute({ children, path }) {
  const { user } = useAuth();
  const { userMenus, loading } = useUserMenus();

  // Don't check menu permissions if user is not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has access to this route via menu permissions
  const hasMenuAccess = userMenus.some(menu => menu.path === path);
  
  // Fallback: check static permissions if no menu access
  const hasFallbackAccess = FALLBACK_PERMISSIONS[path]?.includes(user.role);

  const hasAccess = hasMenuAccess || hasFallbackAccess;

  if (!hasAccess) {
    console.warn(`Access denied for user ${user.role} to path ${path}`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// Optimized component that only loads menus once
function AppRoutes() {
  const { user } = useAuth();
  const { userMenus, loading } = useUserMenus();

  // Show loading spinner only on initial load when user is authenticated
  if (user && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<Landing />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute path="/dashboard">
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admission" element={
        <ProtectedRoute path="/admission">
          <Admission />
        </ProtectedRoute>
      } />
      
      <Route path="/schools" element={
        <ProtectedRoute path="/schools">
          <Schools />
        </ProtectedRoute>
      } />
      
      <Route path="/students" element={
        <ProtectedRoute path="/students">
          <Students />
        </ProtectedRoute>
      } />
      
      <Route path="/teachers" element={
        <ProtectedRoute path="/teachers">
          <Teachers />
        </ProtectedRoute>
      } />
      
      <Route path="/classes" element={
        <ProtectedRoute path="/classes">
          <Classes />
        </ProtectedRoute>
      } />
      
      <Route path="/attendance" element={
        <ProtectedRoute path="/attendance">
          <Attendance />
        </ProtectedRoute>
      } />
      
      <Route path="/grades" element={
        <ProtectedRoute path="/grades">
          <Grades />
        </ProtectedRoute>
      } />
      
      <Route path="/timetable" element={
        <ProtectedRoute path="/timetable">
          <Timetable />
        </ProtectedRoute>
      } />
      
      <Route path="/fees" element={
        <ProtectedRoute path="/fees">
          <Fees />
        </ProtectedRoute>
      } />
      <Route path="/feePaidSlip" element={
        <ProtectedRoute path="/feePaidSlip">
          <FeePaidSlip />
        </ProtectedRoute>
      } />
      
      <Route path="/announcements" element={
        <ProtectedRoute path="/announcements">
          <Announcements />
        </ProtectedRoute>
      } />
      
      <Route path="/library" element={
        <ProtectedRoute path="/library">
          <Library />
        </ProtectedRoute>
      } />
      
      <Route path="/exams" element={
        <ProtectedRoute path="/exams">
          <Exams />
        </ProtectedRoute>
      } />
      <Route path="/createExam" element={
        <ProtectedRoute path="/createExam">
          <CreateExamSchedule />
        </ProtectedRoute>
      } />
      <Route path="/examMarksEntry" element={
        <ProtectedRoute path="/examMarksEntry">
          <ExamMarksEntry />
        </ProtectedRoute>
      } />
      
      <Route path="/report-cards" element={
        <ProtectedRoute path="/report-cards">
          <ReportCards />
        </ProtectedRoute>
      } />
      
      <Route path="/staff" element={
        <ProtectedRoute path="/staff">
          <Staff />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute path="/profile">
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/users" element={
        <ProtectedRoute path="/users">
          <UserManagement />
        </ProtectedRoute>
      } />
      
      <Route path="/subject" element={
        <ProtectedRoute path="/subject">
          <Subject />
        </ProtectedRoute>
      } />
      
      <Route path="/systemcode" element={
        <ProtectedRoute path="/systemcode">
          <SystemCode />
        </ProtectedRoute>
      } />
      
      <Route path="/menus" element={
        <ProtectedRoute path="/menus">
          <MenuManagement />
        </ProtectedRoute>
      } />
      <Route path="/bulkUpload" element={
        <ProtectedRoute path="/bulkUpload">
          <BulkUpload />
        </ProtectedRoute>
      } />
      <Route path="/viewReports" element={
        <ProtectedRoute path="/viewReports">
          <ViewReports />
        </ProtectedRoute>
      } />
      <Route path="/promoteStudents" element={
        <ProtectedRoute path="/promoteStudents">
          <PromoteStudents />
        </ProtectedRoute>
      } />
      
      <Route path="/salary" element={
        <ProtectedRoute path="/salary">
          <Salary />
        </ProtectedRoute>
      } />
      
      <Route path="/pending-fees" element={
        <ProtectedRoute path="/pending-fees">
          <PendingFees />
        </ProtectedRoute>
      } />
      
      {/* Catch all route - redirect appropriately */}
      <Route path="*" element={
        <PrivateRoute>
          <Navigate to="/dashboard" replace />
        </PrivateRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;