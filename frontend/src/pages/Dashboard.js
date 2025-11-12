import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { dashboardApi, studentsApi, classesApi, schoolsApi } from '@/api';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  School,
  TrendingUp,
  Calendar,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [classDistribution, setClassDistribution] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');

  // ✅ Load schools for super_admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      (async () => {
        try {
          const res = await schoolsApi.getAll();
          const data = res.data.data || res.data || [];
          setSchools(data);
          if (data.length > 0) setSelectedSchool(data[0].id);
        } catch (err) {
          console.error('Failed to load schools', err);
        }
      })();
    }
  }, [user]);

  // ✅ Load stats whenever school or user changes
  useEffect(() => {
    if (user) loadStats();
  }, [user, selectedSchool]);

  const loadStats = async () => {
    try {
      const params =
        user.role === 'super_admin' && selectedSchool
          ? { school_id: selectedSchool }
          : {};
      const response = await dashboardApi.getStats(params);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load class distribution whenever school changes
  useEffect(() => {
    if (user) loadDistribution();
  }, [user, selectedSchool]);

  const loadDistribution = async () => {
    try {
      setLoading(true);
      const classParams =
        user.role === 'super_admin' && selectedSchool
          ? { school_id: selectedSchool }
          : {};

      const classRes = await classesApi.getAll(classParams);
      const classList = classRes.data.data || classRes.data || [];

      const studentRes = await studentsApi.getAll(classParams);
      const studentList = studentRes.data.data || studentRes.data || [];

      const distribution = classList.map((cls) => {
        const count = studentList.filter(
          (s) => s.class_id === cls.id || s.class_name === cls.name
        ).length;
        return { name: cls.name, count };
      });

      setClassDistribution(distribution);
    } catch (err) {
      console.error('Failed to load class distribution:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Stats by role (unchanged)
  const superAdminStats = [
    { label: 'Total Schools', value: stats.total_schools || 0, icon: School, color: 'bg-blue-500' },
    { label: 'Total Students', value: stats.total_students || 0, icon: Users, color: 'bg-green-500' },
    { label: 'Total Teachers', value: stats.total_teachers || 0, icon: GraduationCap, color: 'bg-purple-500' },
    { label: 'Total Fee Collection', value: stats.total_fee_collected || 0, icon: DollarSign, color: 'bg-amber-500' },
    { label: 'Pending Fees', value: stats.total_fee_pending || 0, icon: TrendingUp, color: 'bg-red-500' },
  ];

  const schoolStats = [
    { label: 'Total Students', value: stats.total_students || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Teachers', value: stats.total_teachers || 0, icon: GraduationCap, color: 'bg-green-500' },
    { label: 'Total Classes', value: stats.total_classes || 0, icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Total Fee Collected', value: stats.total_fee_collected || 0, icon: DollarSign, color: 'bg-amber-500' },
    { label: 'Pending Fees', value: stats.total_fee_pending || 0, icon: TrendingUp, color: 'bg-red-500' },
  ];

  const teacherStats = [
    { label: 'Total Students', value: stats.total_students || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Teachers', value: stats.total_teachers || 0, icon: GraduationCap, color: 'bg-green-500' },
    { label: 'Total Classes', value: stats.total_classes || 0, icon: BookOpen, color: 'bg-purple-500' },
  ];

  const displayStats =
    user?.role === 'super_admin'
      ? superAdminStats
      : user?.role === 'school_admin'
      ? schoolStats
      : teacherStats;

  const feeData = [
    { name: 'Collected', value: stats.total_fee_collected || 0 },
    { name: 'Pending', value: stats.total_fee_pending || 0 },
  ];

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="dashboard-page">
        {/* HEADER */}
        <div className="flex items-center justify-between page-header mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.name}! Here's your overview.
            </p>
          </div>
        </div>

        {/* ✅ School dropdown for Super Admin */}
        {user?.role === 'super_admin' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select School
            </label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full md:w-1/3 border rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* STATS GRID */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={index}
                    className="stat-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {typeof stat.value === 'number'
                            ? stat.value.toLocaleString()
                            : stat.value}
                        </p>
                      </div>
                      <div className={`${stat.color} p-4 rounded-lg`}>
                        <Icon className="text-white" size={28} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* QUICK ACTIONS */}
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {user?.role === 'super_admin' && (
                  <Card
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate('/schools')}
                  >
                    <School className="text-blue-600 mb-3" size={32} />
                    <h3 className="font-semibold text-gray-900">Manage Schools</h3>
                    <p className="text-sm text-gray-600 mt-1">View and add new schools</p>
                  </Card>
                )}

                {['school_admin', 'teacher'].includes(user?.role) && (
                  <>
                    <Card
                      className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate('/attendance')}
                    >
                      <Calendar className="text-green-600 mb-3" size={32} />
                      <h3 className="font-semibold text-gray-900">Mark Attendance</h3>
                      <p className="text-sm text-gray-600 mt-1">Record today’s attendance</p>
                    </Card>

                    <Card
                      className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate('/grades')}
                    >
                      <TrendingUp className="text-purple-600 mb-3" size={32} />
                      <h3 className="font-semibold text-gray-900">Add Grades</h3>
                      <p className="text-sm text-gray-600 mt-1">Enter student grades</p>
                    </Card>
                  </>
                )}
              </div>
            </div>

            {/* ANALYTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
              {['super_admin', 'school_admin'].includes(user?.role) && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="text-blue-600" size={24} />
                    <h3 className="text-xl font-semibold text-gray-800">Fee Collection Overview</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={feeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={120}
                        dataKey="value"
                      >
                        {feeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* CLASS DISTRIBUTION */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Class Distribution</h2>
                {loading ? (
                  <div className="h-64 flex justify-center items-center">
                    <div className="animate-spin h-10 w-10 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : classDistribution.length === 0 ? (
                  <p className="text-gray-500 text-center h-64 flex items-center justify-center">
                    No data available
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`${value}`, 'Total Students']}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                          contentStyle={{
                            borderRadius: '8px',
                            borderColor: '#3b82f6',
                          }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
