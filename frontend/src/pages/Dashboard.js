import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { dashboardApi } from '@/api';
import { Users, GraduationCap, BookOpen, School, TrendingUp, Calendar, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // assuming you're using shadcn/ui buttons

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const superAdminStats = [
    { label: 'Total Schools', value: stats.total_schools || 0, icon: School, color: 'bg-blue-500' }
  ];

  const schoolStats = [
    { label: 'Total Students', value: stats.total_students || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Teachers', value: stats.total_teachers || 0, icon: GraduationCap, color: 'bg-green-500' },
    { label: 'Total Classes', value: stats.total_classes || 0, icon: BookOpen, color: 'bg-purple-500' }
  ];

  const displayStats = user?.role === 'super_admin' ? superAdminStats : schoolStats;

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="dashboard-page">
        {/* HEADER */}
        <div className="flex items-center justify-between page-header mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.name}! Here's what's happening today.
            </p>
          </div>

          {/* ✅ Logout Button */}
          {/* <Button
            variant="outline"
            className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            onClick={logout}
            data-testid="logout-button"
          >
            <LogOut size={18} />
            Logout
          </Button> */}
        </div>

        {/* MAIN STATS */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="stat-card" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-4 rounded-lg`}>
                      <Icon className="text-white" size={28} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* QUICK ACTIONS */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {user?.role === 'super_admin' && (
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" data-testid="quick-action-add-school">
                <School className="text-blue-600 mb-3" size={32} />
                <h3 className="font-semibold text-gray-900">Add New School</h3>
                <p className="text-sm text-gray-600 mt-1">Register a new school</p>
              </Card>
            )}
            {['school_admin', 'teacher'].includes(user?.role) && (
              <>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" data-testid="quick-action-mark-attendance">
                  <Calendar className="text-green-600 mb-3" size={32} />
                  <h3 className="font-semibold text-gray-900">Mark Attendance</h3>
                  <p className="text-sm text-gray-600 mt-1">Record today's attendance</p>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" data-testid="quick-action-add-grades">
                  <TrendingUp className="text-purple-600 mb-3" size={32} />
                  <h3 className="font-semibold text-gray-900">Add Grades</h3>
                  <p className="text-sm text-gray-600 mt-1">Enter student grades</p>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
