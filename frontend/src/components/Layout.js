import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  School, Home, Users, GraduationCap, BookOpen, Calendar,
  ClipboardCheck, TrendingUp, Clock, DollarSign, Bell, IndianRupeeIcon,
  Library, FileText, Award, Briefcase, User, LogOut, Menu, X,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { announcementsApi, schoolsApi, menusApi } from '@/api';
import { getTenantFromDomain } from '@/utils/tenant';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Icon mapping for dynamic icons
const ICON_MAP = {
  Home: Home,
  School: School,
  Users: Users,
  GraduationCap: GraduationCap,
  BookOpen: BookOpen,
  Calendar: Calendar,
  ClipboardCheck: ClipboardCheck,
  TrendingUp: TrendingUp,
  Clock: Clock,
  DollarSign: DollarSign,
  IndianRupeeIcon: IndianRupeeIcon,
  Bell: Bell,
  Library: Library,
  FileText: FileText,
  Award: Award,
  Briefcase: Briefcase,
  User: User,
  LogOut: LogOut,
  Menu: Menu,
  X: X
};

// Fallback icon if the icon from API doesn't exist
const FallbackIcon = Briefcase;

// Cache for menus to persist across re-renders
let menuCache = {
  data: null,
  timestamp: null,
  userId: null
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolTagline, setSchoolTagline] = useState('');
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [dynamicMenus, setDynamicMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [menuError, setMenuError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // New state for logout confirmation
  
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load dynamic menus from API - with caching
  const loadDynamicMenus = async () => {
    // Check cache first
    const now = Date.now();
    if (
      menuCache.data && 
      menuCache.userId === user?.id &&
      menuCache.timestamp && 
      (now - menuCache.timestamp) < CACHE_DURATION
    ) {
      setDynamicMenus(menuCache.data);
      setLoadingMenus(false);
      return;
    }

    try {
      setLoadingMenus(true);
      setMenuError(null);
      
      const response = await menusApi.getMyMenu();
      const menus = response.data.data || [];
      
      // Transform API data to match the expected navigation structure
      const transformedMenus = menus.map(menu => ({
        name: menu.name,
        path: menu.path,
        icon: menu.icon,
        roles: menu.roles || [],
        order: menu.order || 0,
        is_active: menu.is_active !== false // Default to true if not specified
      })).filter(menu => menu.is_active); // Only include active menus
      
      // Update cache
      menuCache = {
        data: transformedMenus,
        timestamp: Date.now(),
        userId: user?.id
      };
      
      setDynamicMenus(transformedMenus);
    } catch (error) {
      console.error('Failed to load dynamic menus:', error);
      setMenuError('Failed to load navigation menus');
      
      // Fallback to static menus if dynamic loading fails
      const staticNavigation = getStaticNavigation();
      const filteredStaticNav = staticNavigation.filter(item => 
        item.roles.includes(user?.role)
      );
      
      // Cache the fallback menus too
      menuCache = {
        data: filteredStaticNav,
        timestamp: Date.now(),
        userId: user?.id
      };
      
      setDynamicMenus(filteredStaticNav);
    } finally {
      setLoadingMenus(false);
    }
  };

  // Static navigation fallback
  const getStaticNavigation = () => [
    { name: 'Dashboard', path: '/dashboard', icon: 'Home', roles: ['super_admin', 'school_admin', 'teacher', 'student', 'parent'] },
    { name: 'Admission', path: '/admission', icon: 'ClipboardCheck', roles: ['super_admin', 'school_admin'] },
    { name: 'All Schools', path: '/schools', icon: 'School', roles: ['super_admin'] },
    { name: 'My Students', path: '/students', icon: 'Users', roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Teachers', path: '/teachers', icon: 'GraduationCap', roles: ['super_admin', 'school_admin'] },
    { name: 'Classes', path: '/classes', icon: 'BookOpen', roles: ['super_admin', 'school_admin'] },
    { name: 'Attendance', path: '/attendance', icon: 'ClipboardCheck', roles: ['super_admin', 'school_admin', 'teacher'] },
    { name: 'Grades', path: '/grades', icon: 'TrendingUp', roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Timetable', path: '/timetable', icon: 'Clock', roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
    { name: 'Fees', path: '/fees', icon: 'IndianRupeeIcon', roles: ['super_admin', 'school_admin', 'parent'] },
    { name: 'Announcements', path: '/announcements', icon: 'Bell', roles: ['super_admin'] },
    { name: 'Library', path: '/library', icon: 'Library', roles: ['super_admin', 'school_admin', 'student'] },
    { name: 'Exams', path: '/exams', icon: 'FileText', roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
    { name: 'CreateExamSchedule', path: '/createExam', icon: 'FileText', roles: ['super_admin'] },
    { name: 'ExamMarksEntry', path: '/examMarksEntry', icon: 'FileText', roles: ['super_admin','school_admin','teacher'] },
    { name: 'Report Cards', path: '/report-cards', icon: 'Award', roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
    { name: 'Staff', path: '/staff', icon: 'Briefcase', roles: ['super_admin', 'school_admin'] },
    { name: 'All Users', path: '/users', icon: 'Briefcase', roles: ['super_admin', 'school_admin'] },
    { name: 'Subject', path: '/subject', icon: 'Briefcase', roles: ['super_admin', 'school_admin'] },
    { name: 'SystemCode', path: '/systemcode', icon: 'Briefcase', roles: ['super_admin'] },
    { name: 'MenuManagement', path: '/menus', icon: 'Briefcase', roles: ['super_admin'] },
    { name: 'BulkUpload', path: '/bulkUpload', icon: 'Briefcase', roles: ['super_admin','school_admin'] },
    { name: 'ViewReports', path: '/viewReports', icon: 'Briefcase', roles: ['super_admin','school_admin'] }
  ];

  // Load school data based on user's school_id or subdomain
  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        // For super_admin - show system name
        if (user?.role === 'super_admin') {
          setSchoolName('EduManage System');
          setSchoolTagline('Multi-School Management Platform');
          return;
        }

        // Try to get school from subdomain first (more reliable for multi-tenant)
        const tenant = getTenantFromDomain();
        if (tenant) {
          try {
            const res = await schoolsApi.getBySubdomain(tenant);
            const schoolData = res.data;
            setSchoolName(schoolData?.name || 'My School');
            setSchoolTagline(schoolData?.tagline || 'Quality Education');
            setSchoolLogo(schoolData?.logo || null);
            return;
          } catch (subdomainError) {
            console.warn('Failed to fetch school by subdomain, trying school_id...', subdomainError);
          }
        }

        // Fallback: For users with school_id - fetch their specific school
        if (user?.school_id) {
          const res = await schoolsApi.getOne(user.school_id);
          const schoolData = res.data;
          setSchoolName(schoolData?.name || 'My School');
          setSchoolTagline(schoolData?.tagline || 'Quality Education');
          setSchoolLogo(schoolData?.logo || null);
        } 
        // For users without school_id but with school context
        else if (user?.role === 'school_admin') {
          setSchoolName('School Administration');
          setSchoolTagline('Manage your institution');
        }
        else {
          setSchoolName('My School');
          setSchoolTagline('Welcome to Education Portal');
        }
      } catch (error) {
        console.error('Failed to fetch school data:', error);
        setSchoolName('My School');
        setSchoolTagline('Quality Education');
      }
    };

    if (user) {
      fetchSchoolData();
    }
  }, [user]);

  // Load dynamic menus only when user changes (login/logout)
  useEffect(() => {
    if (user) {
      loadDynamicMenus();
    } else {
      // Clear menus when user logs out
      setDynamicMenus([]);
      setLoadingMenus(false);
    }
  }, [user]); // Only depend on user object

  // Clear cache when user logs out
  useEffect(() => {
    if (!user) {
      menuCache = {
        data: null,
        timestamp: null,
        userId: null
      };
    }
  }, [user]);

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const res = await announcementsApi.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  useEffect(() => {
    if (user && ['teacher', 'student', 'parent'].includes(user.role)) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load notifications list
  const loadNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await announcementsApi.getAll();
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Mark notification as read and handle navigation
  const handleNotificationClick = async (notification) => {
    try {
      // If notification is unread, mark it as read
      if (!notification.is_read) {
        await announcementsApi.markAsRead(notification.id);
        
        // Update local state immediately for better UX
        setNotifications(prev => 
          prev.map(item => 
            item.id === notification.id 
              ? { ...item, is_read: true }
              : item
          )
        );
        
        // Decrement unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Close dropdown and navigate to announcements page
      setShowNotifDropdown(false);
      navigate('/announcements');
      
    } catch (err) {
      console.error('Failed to mark notification as read', err);
      // Still navigate even if mark as read fails
      setShowNotifDropdown(false);
      navigate('/announcements');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await announcementsApi.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(item => ({ ...item, is_read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const formatNotificationDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const handleNotificationBellClick = async () => {
    if (!showNotifDropdown) {
      await loadNotifications();
    }
    setShowNotifDropdown(!showNotifDropdown);
  };

  // Get icon component based on icon name from API
  const getIconComponent = (iconName) => {
    const IconComponent = ICON_MAP[iconName];
    return IconComponent || FallbackIcon;
  };

  // Sort menus by order
  const sortedMenus = [...dynamicMenus].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Handle logout confirmation
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout(); // Call the original logout function
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <School className="text-blue-400" size={32} />
            <div>
              <h1 className="text-white text-xl font-bold">EduManage</h1>
              <p className="text-gray-400 text-xs">{user?.role?.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-6 overflow-y-auto">
          {loadingMenus ? (
            // Loading skeleton for menus
            <div className="space-y-2 px-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-5 h-5 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-700 rounded flex-1 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : menuError ? (
            // Error state
            <div className="px-6 py-4 text-center">
              <p className="text-yellow-400 text-sm mb-2">{menuError}</p>
              <p className="text-gray-400 text-xs">Using fallback navigation</p>
            </div>
          ) : (
            // Dynamic menus
            sortedMenus.map((item) => {
              const IconComponent = getIconComponent(item.icon);
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link flex items-center gap-3 px-6 py-2.5 text-sm transition-colors
                  ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-blue-800 hover:text-white'}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="relative">
                    <IconComponent size={20} />
                    {item.name === 'Announcements' && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[20px] h-[20px] flex items-center justify-center animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span>{item.name}</span>
                </Link>
              );
            })
          )}
        </nav>

        {/* Fixed bottom items (Profile and Logout) */}
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
            onClick={handleLogoutClick} // Updated to show confirmation dialog
            className="sidebar-link flex items-center gap-3 px-6 py-2.5 text-sm w-full text-gray-300 hover:bg-red-700 hover:text-white"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Area */}
      <div className="flex flex-col flex-1">

        {/* TOP HEADER WITH SCHOOL LOGO AND BELL ICON */}
        <header className="relative flex items-center justify-between p-4 bg-white border-b shadow-sm">
          {/* LEFT SIDE - SCHOOL NAME AND LOGO */}
          <div className="flex items-center gap-4">
            {/* School Logo */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="relative">
                {schoolLogo ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg bg-white p-1">
                    <img 
                      src={`${process.env.REACT_APP_BACKEND_URL}${schoolLogo}`}
                      alt={schoolName || 'School Logo'}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl items-center justify-center shadow-lg hidden">
                      <School className="text-white" size={20} />
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <School className="text-white" size={20} />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              
              {/* Dynamic School Name and Tagline */}
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {schoolName}
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  {schoolTagline}
                </p>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 lg:hidden">
              <button onClick={() => setSidebarOpen(true)} className="text-gray-700">
                <Menu size={24} />
              </button>
              {/* Mobile School Logo */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <School className="text-white" size={16} />
                </div>
                <h1 className="text-lg font-semibold text-gray-800">
                  {schoolName.length > 15 ? `${schoolName.substring(0, 15)}...` : schoolName}
                </h1>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE ICONS */}
          <div className="relative flex items-center gap-4 ml-auto" ref={dropdownRef}>

            {/* Welcome Message - Visible on desktop */}
            <div className="hidden lg:flex flex-col items-end mr-4">
              <p className="text-sm font-medium text-gray-700">Welcome back!</p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.name || user?.role?.replace('_', ' ')}
              </p>
            </div>

            {/* 🔔 BELL ICON */}
            <button
              className="relative p-2 transition-all duration-200 hover:bg-gray-100 rounded-lg group"
              onClick={handleNotificationBellClick}
            >
              <Bell size={22} className="text-gray-700 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-600" />

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[18px] h-[18px] flex items-center justify-center animate-pulse ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Quick Action */}
            <div className="hidden lg:flex items-center gap-2 border-l pl-4 border-gray-200">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || user?.role?.charAt(0)?.toUpperCase()}
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleLogoutClick} // Updated to show confirmation dialog
              className="hidden lg:flex bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md transition-all duration-200"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>

            {/* 🔻 ANIMATED NOTIFICATION DROPDOWN */}
            <div className={`
              absolute right-0 top-12 w-80 bg-white shadow-xl rounded-lg border z-50
              transform transition-all duration-200 ease-out origin-top-right
              ${showNotifDropdown 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
              }
            `}>
              <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
                <h3 className="text-md font-semibold text-gray-800">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 transition-colors duration-150 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifDropdown(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loadingNotifs && (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                )}

                {!loadingNotifs && notifications.length === 0 && (
                  <div className="text-center py-8">
                    <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No notifications</p>
                    <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                  </div>
                )}

                {!loadingNotifs && notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`
                      p-3 border-b border-gray-100 cursor-pointer transition-all duration-200
                      hover:bg-blue-50 active:scale-[0.98] transform
                      ${notification.is_read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-400'}
                      animate-in fade-in-0 slide-in-from-right-2
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-sm text-gray-800 line-clamp-1">
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <span className="flex h-2 w-2 mt-1">
                          <span className="animate-ping absolute h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatNotificationDate(notification.created_at)}
                    </p>
                  </div>
                ))}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 border-t bg-gray-50 rounded-b-lg">
                  <button
                    onClick={() => {
                      setShowNotifDropdown(false);
                      navigate('/announcements');
                    }}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2 transition-colors duration-150 font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-full">
                <AlertTriangle className="text-white" size={32} />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900">
              Confirm Logout
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 mt-2">
              Are you sure you want to logout from your account?
              <br />
              <span className="text-sm text-gray-500 mt-1 block">
                You'll need to sign in again to access your dashboard.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelLogout}
              className="flex-1 h-12 rounded-lg border-gray-300 hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmLogout}
              className="flex-1 h-12 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-md"
            >
              <LogOut size={18} className="mr-2" />
              Yes, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
