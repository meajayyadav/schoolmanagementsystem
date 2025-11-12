import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  School, Home, Users, GraduationCap, BookOpen, Calendar,
  ClipboardCheck, TrendingUp, Clock, DollarSign, Bell,
  Library, FileText, Award, Briefcase, User, LogOut, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState,useEffect } from 'react';

import { announcementsApi } from '@/api';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  const loadUnreadCount = async () => {
    try {
      const res = await announcementsApi.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  if (user && ['teacher', 'student', 'parent'].includes(user.role)) {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000); // refresh every 1 min
    return () => clearInterval(interval);
  }
}, [user]);

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: Home, roles: ['super_admin', 'school_admin', 'teacher', 'student', 'parent'] },
    { name: 'Admission', path: '/admission', icon: ClipboardCheck, roles: ['super_admin', 'school_admin', 'teacher'] },
    { name: 'All Schools', path: '/schools', icon: School, roles: ['super_admin'] },
    { name: 'All Students', path: '/students', icon: Users, roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Teachers', path: '/teachers', icon: GraduationCap, roles: ['super_admin', 'school_admin'] },
    { name: 'Classes', path: '/classes', icon: BookOpen, roles: ['super_admin', 'school_admin'] },
    { name: 'Attendance', path: '/attendance', icon: ClipboardCheck, roles: ['super_admin', 'school_admin', 'teacher'] },
    { name: 'Grades', path: '/grades', icon: TrendingUp, roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Timetable', path: '/timetable', icon: Clock, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
    { name: 'Fees', path: '/fees', icon: DollarSign, roles: ['super_admin', 'school_admin', 'parent'] },
    { name: 'Announcements', path: '/announcements', icon: Bell, roles: ['super_admin', 'school_admin', 'teacher', 'student', 'parent'] },
    { name: 'Library', path: '/library', icon: Library, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
    { name: 'Exams', path: '/exams', icon: FileText, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
    { name: 'Report Cards', path: '/report-cards', icon: Award, roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Staff', path: '/staff', icon: Briefcase, roles: ['super_admin', 'school_admin'] },
    { name: 'All Users', path: '/users', icon: Briefcase, roles: ['super_admin', 'school_admin'] },
    { name: 'Subject', path: '/subject', icon: Briefcase, roles: ['super_admin', 'school_admin'] },
    { name: 'SystemCode', path: '/systemcode', icon: Briefcase, roles: ['super_admin'] }
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar for large screens */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <School className="text-blue-400" size={32} />
            <div>
              <h1 className="text-white text-xl font-bold">EduManage</h1>
              <p className="text-gray-400 text-xs">{user?.role?.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto">
  {filteredNav.map((item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`sidebar-link flex items-center gap-3 px-6 py-2.5 text-sm transition-colors
        ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-blue-800 hover:text-white'}`}
        onClick={() => setSidebarOpen(false)}
      >
        {/* --- Bell icon with unread badge --- */}
        <div className="relative">
          <Icon size={20} />
          {item.name === 'Announcements' && unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
              {unreadCount}
            </span>
          )}
        </div>

        <span>{item.name}</span>
      </Link>
    );
  })}
</nav>


        <div className="p-4 border-t border-white/10">
          <Link
            to="/profile"
            className="sidebar-link flex items-center gap-3 px-6 py-2.5 text-sm text-gray-300 hover:bg-blue-800 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <User size={20} />
            <span>Profile</span>
          </Link>
          <button
            onClick={logout}
            className="sidebar-link flex items-center gap-3 px-6 py-2.5 text-sm w-full text-gray-300 hover:bg-red-700 hover:text-white"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Top Bar */}
        <header className="flex items-center justify-between p-4 bg-white border-b shadow-sm lg:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-700">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold">EduManage</h1>
          </div>
          <Button size="sm" onClick={logout} className="bg-blue-600 text-white hover:bg-blue-700">
            Logout
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
