import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  School, Home, Users, GraduationCap, BookOpen, Calendar,
  ClipboardCheck, TrendingUp, Clock, DollarSign, Bell,
  Library, FileText, Award, Briefcase, User, LogOut, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: Home, roles: ['super_admin', 'school_admin', 'teacher', 'student', 'parent'] },
    { name: 'Schools', path: '/schools', icon: School, roles: ['super_admin'] },
    { name: 'Students', path: '/students', icon: Users, roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Teachers', path: '/teachers', icon: GraduationCap, roles: ['super_admin', 'school_admin'] },
    { name: 'Classes', path: '/classes', icon: BookOpen, roles: ['super_admin', 'school_admin', 'teacher'] },
    { name: 'Attendance', path: '/attendance', icon: ClipboardCheck, roles: ['super_admin', 'school_admin', 'teacher'] },
    { name: 'Grades', path: '/grades', icon: TrendingUp, roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Timetable', path: '/timetable', icon: Clock, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
    { name: 'Fees', path: '/fees', icon: DollarSign, roles: ['super_admin', 'school_admin', 'parent'] },
    { name: 'Announcements', path: '/announcements', icon: Bell, roles: ['super_admin', 'school_admin', 'teacher', 'student', 'parent'] },
    { name: 'Library', path: '/library', icon: Library, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
    { name: 'Exams', path: '/exams', icon: FileText, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
    { name: 'Report Cards', path: '/report-cards', icon: Award, roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Staff', path: '/staff', icon: Briefcase, roles: ['super_admin', 'school_admin'] }
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <School className="text-blue-400" size={32} />
            <div>
              <h1 className="text-white text-xl font-bold">EduManage</h1>
              <p className="text-gray-400 text-xs">{user?.role?.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link to="/profile" className="sidebar-link" data-testid="nav-profile">
            <User size={20} />
            <span>Profile</span>
          </Link>
          <button onClick={logout} className="sidebar-link w-full" data-testid="logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}