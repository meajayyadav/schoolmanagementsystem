import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { reportsApi, schoolsApi } from '@/api';
import { 
  Download, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  BookOpen,
  Wallet,
  School,
  FileText,
  IndianRupee,
  Target,
  AlertCircle,
  CheckCircle2,
  Eye,
  Printer,
  Share2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({
    report_type: 'overview',
    school_id: '',
    start_date: '',
    end_date: '',
    class_id: '',
    fee_type: ''
  });

  // Available report types
  const reportTypes = [
    { value: 'overview', label: 'Overview', icon: BarChart3, description: 'Complete school overview' },
    { value: 'fee_analytics', label: 'Fee Analytics', icon: Wallet, description: 'Detailed fee analysis' },
    { value: 'attendance', label: 'Attendance', icon: Users, description: 'Attendance patterns and trends' },
    { value: 'financial', label: 'Financial', icon: IndianRupee, description: 'Financial performance' },
    { value: 'class_wise', label: 'Class-wise', icon: BookOpen, description: 'Class performance comparison' }
  ];

  // ✅ Load schools for super_admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      (async () => {
        try {
          const res = await schoolsApi.getAll();
          const data = res.data.data || res.data || [];
          setSchools(data);
          if (data.length > 0) {
            setFilters(prev => ({ ...prev, school_id: data[0].id }));
          }
        } catch (err) {
          console.error('Failed to load schools', err);
        }
      })();
    }
  }, [user]);

  // ✅ Load initial report
  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async (newFilters = null) => {
    try {
      setGenerating(true);
      const params = newFilters || filters;
      
      // Remove empty filters
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== '')
      );

      const response = await reportsApi.getReportsData(cleanParams);
      
      // ✅ Handle API response structure
      if (response.data.success) {
        setReportData(response.data.data);
      } else {
        console.error('Report generation failed:', response.data.detail);
        setReportData(null);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setReportData(null);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleGenerateReport = () => {
    generateReport(filters);
  };

  const exportReport = async (format = 'pdf') => {
    try {
      const response = await reportsApi.exportReport({
        report_type: filters.report_type,
        format,
        filters
      });
      
      if (response.data.success) {
        // Handle export success - in real app, download the file
        console.log('Export successful:', response.data.data);
        alert(`Report exported successfully as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* HEADER */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Analytics & Reports
              </h1>
              <p className="text-gray-600 mt-2">
                Comprehensive insights and analytics for {user?.role === 'super_admin' ? 'all schools' : 'your school'}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={printReport}
                className="flex items-center gap-2"
              >
                <Printer size={16} />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={() => exportReport('pdf')}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {generating ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                {generating ? 'Generating...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* FILTERS */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter size={20} />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Report Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Type
                  </label>
                  <select
                    value={filters.report_type}
                    onChange={(e) => handleFilterChange('report_type', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {reportTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* School Selector for Super Admin */}
                {user?.role === 'super_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School
                    </label>
                    <select
                      value={filters.school_id}
                      onChange={(e) => handleFilterChange('school_id', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* REPORT CONTENT */}
          {reportData ? (
            <div className="space-y-6">
              {/* Report Metadata */}
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 capitalize">
                        {filters.report_type.replace('_', ' ')} Report
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Generated on {new Date(reportData.metadata?.generated_at).toLocaleDateString()}
                        {reportData.metadata?.school_info && ` • ${reportData.metadata.school_info.name}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {reportData.metadata?.date_range.start_date} to {reportData.metadata?.date_range.end_date}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {reportData.metadata?.report_type}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dynamic Report Content */}
              <ReportContent 
                reportType={filters.report_type} 
                data={reportData} 
              />
            </div>
          ) : (
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Generated</h3>
                <p className="text-gray-600 mb-4">Use the filters above to generate your first report</p>
                <Button onClick={handleGenerateReport} className="bg-blue-600 hover:bg-blue-700">
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ✅ Dynamic Report Content Component
function ReportContent({ reportType, data }) {
  // ✅ Safe data access with fallbacks
  const safeData = data || {};
  
  switch (reportType) {
    case 'overview':
      return <OverviewReport data={safeData} />;
    case 'fee_analytics':
      return <FeeAnalyticsReport data={safeData} />;
    case 'attendance':
      return <AttendanceReport data={safeData} />;
    case 'financial':
      return <FinancialReport data={safeData} />;
    case 'class_wise':
      return <ClassWiseReport data={safeData} />;
    default:
      return <OverviewReport data={safeData} />;
  }
}

// ✅ Overview Report Component
function OverviewReport({ data }) {
  // ✅ Safe data access with fallbacks
  const summary = data?.summary || {};
  const trends = data?.trends || {};
  const charts = data?.charts || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Students"
          value={summary.total_students || 0}
          icon={Users}
          color="blue"
        />
        <SummaryCard
          title="Fee Collection"
          value={`₹${(summary.total_fee_collected || 0).toLocaleString()}`}
          icon={Wallet}
          color="green"
        />
        <SummaryCard
          title="Collection Rate"
          value={`${summary.collection_rate || 0}%`}
          icon={Target}
          color="purple"
        />
        <SummaryCard
          title="Attendance"
          value={`${summary.average_attendance || 0}%`}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Trend Chart */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} />
              Fee Collection Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trends.monthly_fee_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends.monthly_fee_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip formatter={(value) => [`₹${value?.toLocaleString() || 0}`, 'Amount']} />
                  <Line 
                    type="monotone" 
                    dataKey="collected" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    name="Collected"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <BarChart3 className="w-12 h-12 mr-3 text-gray-300" />
                <p>No trend data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Distribution */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart size={20} />
              Fee Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={[
                    { name: 'Collected', value: summary.total_fee_collected || 0 },
                    { name: 'Pending', value: summary.total_fee_pending || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip formatter={(value) => [`₹${value?.toLocaleString() || 0}`, 'Amount']} />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Class Distribution */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen size={20} />
            Class Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {charts.class_distribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.class_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <Users className="w-12 h-12 mr-3 text-gray-300" />
              <p>No class distribution data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ Fee Analytics Report Component
function FeeAnalyticsReport({ data }) {
  // ✅ Safe data access with fallbacks
  const summary = data?.summary || {};
  const detailed_analysis = data?.detailed_analysis || {};
  const insights = data?.insights || {};

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Collection"
          value={`₹${(summary.total_collection || 0).toLocaleString()}`}
          icon={Wallet}
          color="green"
        />
        <SummaryCard
          title="Pending Fees"
          value={`₹${(summary.total_pending || 0).toLocaleString()}`}
          icon={AlertCircle}
          color="red"
        />
        <SummaryCard
          title="Collection Rate"
          value={`${summary.collection_rate || 0}%`}
          icon={Target}
          color="blue"
        />
        <SummaryCard
          title="Avg per Student"
          value={`₹${(summary.average_fee_per_student || 0).toLocaleString()}`}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Class-wise Performance */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Class-wise Fee Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {detailed_analysis.class_wise_performance?.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={detailed_analysis.class_wise_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="className" angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip formatter={(value) => [`₹${value?.toLocaleString() || 0}`, 'Amount']} />
                <Legend />
                <Bar dataKey="totalCollected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalPending" name="Pending" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <BarChart className="w-12 h-12 mb-4 text-gray-300" />
              <p>No class-wise fee data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={20} />
              Top Performing Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.top_performing_classes?.length > 0 ? (
                insights.top_performing_classes.map((cls, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="font-medium">{cls.className || 'Unknown Class'}</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      ₹{(cls.totalCollected || 0).toLocaleString()}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              Need Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.areas_for_improvement?.length > 0 ? (
                insights.areas_for_improvement.map((cls, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="font-medium">{cls.className || 'Unknown Class'}</span>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      ₹{(cls.totalPending || 0).toLocaleString()} pending
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ✅ Attendance Report Component
function AttendanceReport({ data }) {
  const summary = data?.summary || {};
  const detailed_analysis = data?.detailed_analysis || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Average Attendance"
          value={`${summary.average_attendance || 0}%`}
          icon={Users}
          color="green"
        />
        <SummaryCard
          title="Total Present"
          value={summary.total_present || 0}
          icon={CheckCircle2}
          color="blue"
        />
        <SummaryCard
          title="Total Absent"
          value={summary.total_absent || 0}
          icon={AlertCircle}
          color="red"
        />
        <SummaryCard
          title="Attendance Rate"
          value={`${summary.attendance_rate || 0}%`}
          icon={Target}
          color="purple"
        />
      </div>

      {/* Attendance Trends */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Monthly Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {detailed_analysis.monthly_trends?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={detailed_analysis.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                <Area type="monotone" dataKey="attendance_rate" fill="#3b82f6" stroke="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <TrendingUp className="w-12 h-12 mr-3 text-gray-300" />
              <p>No attendance trend data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ Financial Report Component
function FinancialReport({ data }) {
  const summary = data?.summary || {};
  const income_breakdown = data?.income_breakdown || {};

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Income"
          value={`₹${(summary.total_income || 0).toLocaleString()}`}
          icon={Wallet}
          color="green"
        />
        <SummaryCard
          title="Total Expenses"
          value={`₹${(summary.total_expenses || 0).toLocaleString()}`}
          icon={AlertCircle}
          color="red"
        />
        <SummaryCard
          title="Net Profit"
          value={`₹${(summary.net_profit || 0).toLocaleString()}`}
          icon={TrendingUp}
          color="blue"
        />
        <SummaryCard
          title="Profit Margin"
          value={`${summary.profit_margin || 0}%`}
          icon={Target}
          color="purple"
        />
      </div>

      {/* Income vs Expenses */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Income vs Expenses Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {income_breakdown.monthly_income?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={income_breakdown.monthly_income}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip formatter={(value) => [`₹${value?.toLocaleString() || 0}`, 'Amount']} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <BarChart3 className="w-12 h-12 mr-3 text-gray-300" />
              <p>No financial trend data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ Class-wise Report Component
function ClassWiseReport({ data }) {
  const class_reports = data?.class_reports || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Classes"
          value={summary.total_classes || 0}
          icon={BookOpen}
          color="blue"
        />
        <SummaryCard
          title="Avg Collection Rate"
          value={`${summary.average_collection_rate || 0}%`}
          icon={Target}
          color="green"
        />
        <SummaryCard
          title="Avg Attendance"
          value={`${summary.average_attendance || 0}%`}
          icon={Users}
          color="purple"
        />
        <SummaryCard
          title="Best Performing"
          value={summary.best_performing_class?.class_name || 'N/A'}
          icon={CheckCircle2}
          color="orange"
        />
      </div>

      {/* Class Performance Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Class Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {class_reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Class</th>
                    <th className="text-left p-3">Students</th>
                    <th className="text-left p-3">Fee Collected</th>
                    <th className="text-left p-3">Fee Pending</th>
                    <th className="text-left p-3">Collection Rate</th>
                    <th className="text-left p-3">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {class_reports.map((report, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{report.class_name || 'Unknown'}</td>
                      <td className="p-3">{report.student_count || 0}</td>
                      <td className="p-3">₹{(report.fee_collection || 0).toLocaleString()}</td>
                      <td className="p-3">₹{(report.fee_pending || 0).toLocaleString()}</td>
                      <td className="p-3">
                        <Badge 
                          variant="outline" 
                          className={
                            (report.collection_rate || 0) >= 90 ? 'bg-green-50 text-green-700' :
                            (report.collection_rate || 0) >= 75 ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                          }
                        >
                          {report.collection_rate || 0}%
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant="outline" 
                          className={
                            (report.average_attendance || 0) >= 90 ? 'bg-green-50 text-green-700' :
                            (report.average_attendance || 0) >= 80 ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                          }
                        >
                          {report.average_attendance || 0}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No class performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ Reusable Summary Card Component
function SummaryCard({ title, value, icon: Icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
    red: 'from-red-50 to-red-100 text-red-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600'
  };

  return (
    <Card className={`border-0 shadow-sm bg-gradient-to-br ${colorClasses[color]}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <Icon className="w-8 h-8" />
        </div>
      </CardContent>
    </Card>
  );
}