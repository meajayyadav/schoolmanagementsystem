import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { dashboardApi, studentsApi, classesApi, schoolsApi, feesApi, systemCodesApi } from '@/api';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  School,
  TrendingUp,
  Calendar,
  DollarSign,
  IndianRupeeIcon,
  PieChart,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Eye,
  Download,
  Filter,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  IndianRupee,
  Building,
  Target,
  Clock,
  BarChart3,
  Wallet,
  FileText,
  UserCheck,
  BarChart,
  UsersIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [classDistribution, setClassDistribution] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [feeAnalytics, setFeeAnalytics] = useState({});
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [classWiseFees, setClassWiseFees] = useState([]);
  const [timeRange, setTimeRange] = useState('monthly');
  const [activeSchool, setActiveSchool] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

  // ✅ Load schools for super_admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      (async () => {
        try {
          const res = await schoolsApi.getAll();
          const data = res.data.data || res.data || [];
          setSchools(data);
          if (data.length > 0) {
            setSelectedSchool(data[0].id);
            setActiveSchool(data[0]);
          }
        } catch (err) {
          console.error('Failed to load schools', err);
        }
      })();
    }
  }, [user]);

  // ✅ Update active school when selection changes
  useEffect(() => {
    if (selectedSchool && schools.length > 0) {
      const school = schools.find(s => s.id === selectedSchool);
      setActiveSchool(school);
    }
  }, [selectedSchool, schools]);

  // ✅ Load academic years from system codes
  useEffect(() => {
    if (user) {
      loadAcademicYears();
    }
  }, [user, selectedSchool]);

  // ✅ Load all dashboard data
  useEffect(() => {
    if (user) {
      // Only load if academic years are loaded (or if there are no academic years)
      if (academicYears.length === 0 || selectedAcademicYear) {
        loadDashboardData();
      }
    }
  }, [user, selectedSchool, timeRange, selectedAcademicYear, academicYears.length]);

  const loadAcademicYears = async () => {
    try {
      const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
      
      if (!schoolId) {
        console.warn('No school ID available for fetching academic years');
        return;
      }

      const res = await systemCodesApi.getAll({ school_id: schoolId });
      
      // Filter and extract academic years (code: "AY")
      const academicYearCodes = res.data.filter(
        (c) => c.code === "AY" && Array.isArray(c.items)
      );
      
      // Process academic years
      const academicYearOptions = academicYearCodes.length > 0 
        ? academicYearCodes[0].items.map((item) => ({
            value: item.value || item.label,
            label: item.label
          }))
        : [];

      setAcademicYears(academicYearOptions);

      // Set default academic year (first one, typically current)
      if (academicYearOptions.length > 0 && !selectedAcademicYear) {
        setSelectedAcademicYear(academicYearOptions[0].value);
      }

    } catch (error) {
      console.error('Error loading academic years:', error);
      setAcademicYears([]);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params =
        user.role === 'super_admin' && selectedSchool
          ? { school_id: selectedSchool, period: timeRange }
          : { period: timeRange };
      
      // Add academic_year only if it's selected
      if (selectedAcademicYear) {
        params.academic_year = selectedAcademicYear;
      }

      // Load all data from dashboard API
      const response = await dashboardApi.getStats(params);
      const dashboardData = response.data;
      
      setStats(dashboardData);
      setClassDistribution(dashboardData.class_distribution || []);
      setClassWiseFees(dashboardData.class_wise_fees || []);
      setRecentTransactions(dashboardData.recent_transactions || []);
      
      // Set fee analytics from the dashboard response
      setFeeAnalytics({
        total_collection: dashboardData.total_fee_collected,
        pending_collection: dashboardData.total_fee_pending,
        fee_type_breakdown: dashboardData.fee_breakdown || {},
        monthly_data: dashboardData.monthly_trends || []
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Stats by role with ALL cards
  const superAdminStats = [
    { 
      label: 'Total Schools', 
      value: stats.total_schools || 0, 
      icon: Building, 
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      trend: '+12%',
      trendUp: true,
      description: 'Active institutions',
      route: '/schools'
    },
    { 
      label: 'Total Students', 
      value: stats.total_students || 0, 
      icon: Users, 
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      trend: '+8%',
      trendUp: true,
      description: 'Across all schools',
      route: '/students'
    },
    { 
      label: 'Total Teachers', 
      value: stats.total_teachers || 0, 
      icon: UserCheck, 
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      trend: '+5%',
      trendUp: true,
      description: 'Teaching staff',
      route: '/teachers'
    },
    { 
      label: 'Total Collection', 
      value: `₹${(stats.total_fee_collected || 0).toLocaleString()}`, 
      icon: Wallet, 
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
      trend: '+15%',
      trendUp: true,
      description: 'This academic year',
      route: '/fees'
    },
    { 
      label: 'Pending Fees', 
      value: `₹${(stats.total_fee_pending || 0).toLocaleString()}`, 
      icon: AlertCircle, 
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      trend: '-3%',
      trendUp: false,
      description: 'Outstanding amount',
      route: '/fees'
    },
    { 
      label: 'Collection Rate', 
      value: `${stats.collection_rate || 0}%`, 
      icon: Target, 
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      trend: '+2%',
      trendUp: true,
      description: 'Efficiency metric',
      route: '/viewReports'
    },
    { 
      label: 'Total Profit', 
      value: `₹${(stats.total_profit || 0).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'bg-gradient-to-br from-green-600 to-emerald-600',
      trend: '+20%',
      trendUp: true,
      description: 'Revenue - Expenses',
      route: '/salary'
    },
    { 
      label: 'Total Losses', 
      value: `₹${(stats.total_losses || 0).toLocaleString()}`, 
      icon: AlertCircle, 
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
      trend: '-5%',
      trendUp: false,
      description: 'Pending + Unpaid',
      route: '/salary'
    },
  ];

  const schoolStats = [
    { 
      label: 'Total Students', 
      value: stats.total_students || 0, 
      icon: Users, 
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      trend: '+8%',
      trendUp: true,
      description: 'Enrolled students',
      route: '/students'
    },
    { 
      label: 'Total Teachers', 
      value: stats.total_teachers || 0, 
      icon: UserCheck, 
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      trend: '+5%',
      trendUp: true,
      description: 'Teaching staff',
      route: '/teachers'
    },
    { 
      label: 'Total Classes', 
      value: stats.total_classes || 0, 
      icon: BookOpen, 
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      trend: '+2%',
      trendUp: true,
      description: 'Active classes',
      route: '/classes'
    },
    { 
      label: 'Fee Collected', 
      value: `₹${(stats.total_fee_collected || 0).toLocaleString()}`, 
      icon: Wallet, 
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
      trend: '+15%',
      trendUp: true,
      description: 'Current term',
      route: '/fees'
    },
    { 
      label: 'Pending Fees', 
      value: `₹${(stats.total_fee_pending || 0).toLocaleString()}`, 
      icon: AlertCircle, 
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      trend: '-3%',
      trendUp: false,
      description: 'Requires attention',
      route: '/fees'
    },
    { 
      label: 'Collection Rate', 
      value: `${stats.collection_rate || 0}%`, 
      icon: Target, 
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      trend: '+2%',
      trendUp: true,
      description: 'Performance indicator',
      route: '/viewReports'
    },
    { 
      label: 'Total Profit', 
      value: `₹${(stats.total_profit || 0).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'bg-gradient-to-br from-green-600 to-emerald-600',
      trend: '+20%',
      trendUp: true,
      description: 'Revenue - Expenses',
      route: '/salary'
    },
    { 
      label: 'Total Losses', 
      value: `₹${(stats.total_losses || 0).toLocaleString()}`, 
      icon: AlertCircle, 
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
      trend: '-5%',
      trendUp: false,
      description: 'Pending + Unpaid',
      route: '/salary'
    },
  ];

  const teacherStats = [
    { 
      label: 'Total Students', 
      value: stats.total_students || 0, 
      icon: Users, 
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      trend: '+8%',
      trendUp: true,
      description: 'In your classes',
      route: '/students'
    },
    { 
      label: 'Assigned Classes', 
      value: stats.total_classes || 0, 
      icon: BookOpen, 
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      trend: '+2%',
      trendUp: true,
      description: 'Teaching assignments',
      route: '/classes'
    },
    { 
      label: 'Attendance Rate', 
      value: `${stats.attendance_rate || '95'}%`, 
      icon: UserCheck, 
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      trend: '+1%',
      trendUp: true,
      description: 'This month',
      route: '/attendance'
    },
    { 
      label: 'Performance', 
      value: '92%', 
      icon: TrendingUp, 
      color: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
      trend: '+3%',
      trendUp: true,
      description: 'Overall rating',
      route: '/viewReports'
    },
  ];

  const displayStats =
    user?.role === 'super_admin'
      ? superAdminStats
      : user?.role === 'school_admin'
      ? schoolStats
      : teacherStats;

  // Get first 4 cards for first row and remaining cards for second row
  const firstRowStats = displayStats.slice(0, 4);
  const secondRowStats = displayStats.slice(4);

  // Enhanced fee data with real analytics
  const feeData = [
    { name: 'Collected', value: stats.total_fee_collected || 0, color: '#10b981' },
    { name: 'Pending', value: stats.total_fee_pending || 0, color: '#ef4444' },
  ];

  // Enhanced monthly data with real analytics from backend
  const monthlyCollectionData = feeAnalytics.monthly_data?.length > 0 
    ? feeAnalytics.monthly_data 
    : [
        { month: 'Jan', collected: 45000, pending: 12000 },
        { month: 'Feb', collected: 52000, pending: 15000 },
        { month: 'Mar', collected: 48000, pending: 18000 },
        { month: 'Apr', collected: 61000, pending: 9000 },
        { month: 'May', collected: 55000, pending: 11000 },
        { month: 'Jun', collected: 59000, pending: 8000 },
      ];

  // Fee type breakdown for analytics
  const feeTypeData = feeAnalytics.fee_type_breakdown 
    ? Object.entries(feeAnalytics.fee_type_breakdown).map(([name, data]) => ({
        name,
        collected: data.paid || 0,
        pending: data.pending || 0
      }))
    : [];

  // Quick actions based on role
  const quickActions = [
    ...(user?.role === 'super_admin' ? [{
      title: 'Manage Schools',
      description: 'View and manage all institutions',
      icon: Building,
      color: 'from-blue-500 to-blue-600',
      onClick: () => navigate('/schools')
    }] : []),
    {
      title: 'Collect Fees',
      description: 'Process student fee payments',
      icon: IndianRupee,
      color: 'from-green-500 to-green-600',
      onClick: () => navigate('/fees')
    },
    ...(['school_admin', 'teacher'].includes(user?.role) ? [
      {
        title: 'Mark Attendance',
        description: 'Record daily attendance',
        icon: Calendar,
        color: 'from-purple-500 to-purple-600',
        onClick: () => navigate('/attendance')
      },
    ] : []),
    {
      title: 'View Reports',
      description: 'Analytics and insights',
      icon: BarChart3,
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/viewReports')
    },
    {
      title: 'Student Management',
      description: 'Manage student records',
      icon: Users,
      color: 'from-cyan-500 to-cyan-600',
      onClick: () => navigate('/students')
    }
  ];

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 animate-fade-in" data-testid="dashboard-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* ENHANCED HEADER WITH SCHOOL INFO */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm border">
                  <School className="text-blue-600" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Dashboard Overview
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Welcome back, <span className="font-semibold text-blue-600">{user?.name}</span>! 
                    {activeSchool && ` • ${activeSchool.name}`}
                  </p>
                </div>
              </div>
              {activeSchool && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {activeSchool.type || 'K-12 School'}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {activeSchool.city || 'City'} • {activeSchool.state || 'State'}
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Since {activeSchool.established_year || '2025'}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* ✅ School dropdown for Super Admin */}
              {user?.role === 'super_admin' && (
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              )}
              
              {/* ✅ Academic Year dropdown */}
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              >
                {academicYears.length > 0 ? (
                  academicYears.map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))
                ) : (
                  <option value="">Loading...</option>
                )}
              </select>
              
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* ENHANCED STATS GRID - FIRST ROW WITH 4 CARDS */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* FIRST ROW - 4 CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {firstRowStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card 
                      key={index} 
                      className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm overflow-hidden cursor-pointer"
                      onClick={() => stat.route && navigate(stat.route)}
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900 mb-2">
                              {stat.value}
                            </p>
                            <p className="text-xs text-gray-400 mb-2">{stat.description}</p>
                            <div className={`flex items-center text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                              {stat.trendUp ? 
                                <ArrowUp size={14} className="mr-1" /> : 
                                <ArrowDown size={14} className="mr-1" />
                              }
                              <span>{stat.trend}</span>
                              <span className="text-gray-400 ml-1">from last period</span>
                            </div>
                          </div>
                          <div className={`p-3 rounded-xl ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="text-white" size={20} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* SECOND ROW - REMAINING CARDS */}
              {secondRowStats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {secondRowStats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <Card 
                        key={index} 
                        className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm overflow-hidden cursor-pointer"
                        onClick={() => stat.route && navigate(stat.route)}
                      >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                              <p className="text-2xl font-bold text-gray-900 mb-2">
                                {stat.value}
                              </p>
                              <p className="text-xs text-gray-400 mb-2">{stat.description}</p>
                              <div className={`flex items-center text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                                {stat.trendUp ? 
                                  <ArrowUp size={14} className="mr-1" /> : 
                                  <ArrowDown size={14} className="mr-1" />
                                }
                                <span>{stat.trend}</span>
                                <span className="text-gray-400 ml-1">from last period</span>
                              </div>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className="text-white" size={20} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* ENHANCED QUICK ACTIONS */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="text-blue-600" size={20} />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <div
                          key={index}
                          className="group p-6 rounded-2xl bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
                          onClick={action.onClick}
                        >
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg group-hover:scale-110 transition-transform duration-300 inline-block mb-4`}>
                            <Icon className="text-white" size={24} />
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{action.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* REST OF THE CODE REMAINS EXACTLY THE SAME */}
              {/* ENHANCED ANALYTICS DASHBOARD */}
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 bg-gray-100/50 p-1 rounded-2xl">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <BarChart3 size={16} className="mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="fees" 
                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Wallet size={16} className="mr-2" />
                    Fee Analytics
                  </TabsTrigger>
                  <TabsTrigger 
                    value="classes" 
                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <BookOpen size={16} className="mr-2" />
                    Classes
                  </TabsTrigger>
                  <TabsTrigger 
                    value="transactions" 
                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <FileText size={16} className="mr-2" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ENHANCED FEE COLLECTION CHART */}
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="text-green-600" size={20} />
                          </div>
                          <div>
                            <div>Fee Collection Trend</div>
                            <div className="text-sm text-gray-500 font-normal">Monthly performance overview</div>
                          </div>
                        </CardTitle>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          +{Math.round((stats.collection_rate || 0) - 85)}% this month
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={monthlyCollectionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#6b7280' }}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#6b7280' }}
                              tickFormatter={(value) => `₹${value/1000}k`}
                            />
                            <Tooltip 
                              formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                              contentStyle={{ 
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="collected" 
                              stroke="#10b981" 
                              strokeWidth={3}
                              name="Collected"
                              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="pending" 
                              stroke="#ef4444" 
                              strokeWidth={2}
                              name="Pending"
                              strokeDasharray="5 5"
                              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* ENHANCED FEE DISTRIBUTION */}
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <PieChart className="text-blue-600" size={20} />
                          </div>
                          <div>
                            <div>Fee Distribution</div>
                            <div className="text-sm text-gray-500 font-normal">Collection vs Pending</div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={feeData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                  `${name} ${(percent * 100).toFixed(0)}%`
                                }
                                outerRadius={100}
                                innerRadius={70}
                                dataKey="value"
                              >
                                {feeData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color}
                                    stroke="#fff"
                                    strokeWidth={2}
                                  />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                                contentStyle={{ 
                                  borderRadius: '12px',
                                  border: 'none',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                }}
                              />
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          {feeData.map((item, index) => (
                            <div 
                              key={index} 
                              className="text-center p-4 rounded-xl border border-gray-200 bg-white/50"
                            >
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <div 
                                  className="w-3 h-3 rounded-full shadow-sm" 
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="font-medium text-gray-700">{item.name}</span>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">
                                ₹{item.value.toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* FEE ANALYTICS TAB */}
                <TabsContent value="fees" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* CLASS-WISE FEE COLLECTION */}
                    <Card className="lg:col-span-2 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <CreditCard className="text-purple-600" size={20} />
                          </div>
                          <div>
                            <div>Class-wise Fee Collection</div>
                            <div className="text-sm text-gray-500 font-normal">Performance by class</div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {classWiseFees.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <ReBarChart data={classWiseFees}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="className" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280' }}
                                tickFormatter={(value) => `₹${value/1000}k`}
                              />
                              <Tooltip 
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                                contentStyle={{ 
                                  borderRadius: '12px',
                                  border: 'none',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                }}
                              />
                              <Legend />
                              <Bar 
                                dataKey="totalCollected" 
                                name="Collected" 
                                fill="#10b981" 
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                              />
                              <Bar 
                                dataKey="totalPending" 
                                name="Pending" 
                                fill="#ef4444" 
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                              />
                            </ReBarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <BarChart className="w-12 h-12 mb-4 text-gray-300" />
                            <p>No fee data available for classes</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* FEE COLLECTION SUMMARY */}
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Collection Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {classWiseFees.length > 0 ? (
                          classWiseFees.slice(0, 5).map((classFee, index) => (
                            <div 
                              key={index} 
                              className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-white/50 hover:bg-white transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{classFee.className}</p>
                                <p className="text-sm text-gray-500">{classFee.studentCount || 0} students</p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-600 font-semibold">
                                  ₹{(classFee.totalCollected || 0).toLocaleString()}
                                </p>
                                <p className="text-red-600 text-sm">
                                  ₹{(classFee.totalPending || 0).toLocaleString()} pending
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <p>No class fee data available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* FEE TYPE BREAKDOWN */}
                  {feeTypeData.length > 0 && (
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <PieChart className="text-blue-600" size={20} />
                          </div>
                          <div>
                            <div>Fee Type Breakdown</div>
                            <div className="text-sm text-gray-500 font-normal">Collection by fee type</div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <ReBarChart data={feeTypeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#6b7280' }}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#6b7280' }}
                              tickFormatter={(value) => `₹${value/1000}k`}
                            />
                            <Tooltip 
                              formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                              contentStyle={{ 
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="collected" 
                              name="Collected" 
                              fill="#10b981" 
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar 
                              dataKey="pending" 
                              name="Pending" 
                              fill="#ef4444" 
                              radius={[4, 4, 0, 0]}
                            />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* CLASSES TAB - NEW CONTENT */}
                <TabsContent value="classes" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CLASS DISTRIBUTION CHART */}
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <UsersIcon className="text-green-600" size={20} />
                          </div>
                          <div>
                            <div>Class Distribution</div>
                            <div className="text-sm text-gray-500 font-normal">Students per class</div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {classDistribution.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <ReBarChart data={classDistribution}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280' }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280' }}
                              />
                              <Tooltip />
                              <Bar 
                                dataKey="count" 
                                name="Students" 
                                fill="#3b82f6" 
                                radius={[4, 4, 0, 0]}
                              />
                            </ReBarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <Users className="w-12 h-12 mb-4 text-gray-300" />
                            <p>No class distribution data available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* CLASS PERFORMANCE SUMMARY */}
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Class Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {classDistribution.length > 0 ? (
                          classDistribution.map((classItem, index) => (
                            <div 
                              key={index} 
                              className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-white/50 hover:bg-white transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <BookOpen className="text-blue-600" size={16} />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{classItem.name}</p>
                                  <p className="text-sm text-gray-500">{classItem.count} students</p>
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={
                                  classItem.count > 30 ? 'bg-red-50 text-red-700 border-red-200' :
                                  classItem.count > 20 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                  'bg-green-50 text-green-700 border-green-200'
                                }
                              >
                                {classItem.count > 30 ? 'Large' : classItem.count > 20 ? 'Medium' : 'Small'}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <p>No class data available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* PERFORMANCE METRICS */}
                  {stats.performance_metrics && (
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 border border-gray-200 rounded-xl bg-white/50">
                            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Student-Teacher Ratio</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {stats.performance_metrics.student_teacher_ratio || '0:1'}
                            </p>
                          </div>
                          <div className="text-center p-4 border border-gray-200 rounded-xl bg-white/50">
                            <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Average Class Size</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {stats.performance_metrics.average_class_size || '0'}
                            </p>
                          </div>
                          <div className="text-center p-4 border border-gray-200 rounded-xl bg-white/50">
                            <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Collection Efficiency</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {stats.performance_metrics.fee_collection_efficiency || '0'}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* RECENT TRANSACTIONS TAB */}
                <TabsContent value="transactions">
                  <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <div>Recent Fee Transactions</div>
                          <div className="text-sm text-gray-500 font-normal">Latest payment activities</div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentTransactions.length > 0 ? (
                          recentTransactions.slice(0, 5).map((transaction, index) => (
                            <div 
                              key={index} 
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white/50 hover:bg-white transition-all duration-200 hover:shadow-sm"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${transaction.paid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} shadow-sm`}>
                                  {transaction.paid ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{transaction.student_name}</p>
                                  <p className="text-sm text-gray-500">
                                    {transaction.fee_type} • {transaction.fee_month} • {transaction.class_name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-semibold ${transaction.paid ? 'text-green-600' : 'text-red-600'}`}>
                                  ₹{Math.abs(transaction.amount || 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {transaction.payment_date ? 
                                    new Date(transaction.payment_date).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    }) : 
                                    'Not Paid'
                                  }
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No recent transactions</p>
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full mt-6 border-gray-300 hover:bg-gray-50 rounded-xl py-3"
                        onClick={() => navigate('/fees')}
                      >
                        View All Transactions
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
