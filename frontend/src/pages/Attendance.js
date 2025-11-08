import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { attendanceApi, schoolsApi, classesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarDays, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Attendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [filters, setFilters] = useState({
    student_id: '',
    class_id: '',
    date: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.role === 'super_admin') loadSchools();
  }, [user]);

  useEffect(() => {
    if (user.role === 'school_admin' || (user.role === 'super_admin' && selectedSchool)) {
      loadClasses();
    }
  }, [selectedSchool, user]);

  useEffect(() => {
    if (user.role === 'school_admin' || (user.role === 'super_admin' && selectedSchool)) {
      loadAttendance();
    }
  }, [filters.page, selectedSchool]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadClasses = async () => {
    try {
      const params = {};
      if (user.role === 'super_admin') params.school_id = selectedSchool;
      const res = await classesApi.getAll(params);
      setClasses(res.data.data || res.data || []);
    } catch {
      toast.error('Failed to load classes');
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      if (user.role === 'super_admin') {
        if (!selectedSchool) {
          setAttendance([]);
          setLoading(false);
          return;
        }
        params.school_id = selectedSchool;
      }
      const res = await attendanceApi.getAll(params);
      setAttendance(res.data.data || []);
      setPagination({
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1,
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setFilters({ ...filters, page });
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-6" data-testid="attendance-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">📅 Attendance</h1>
            <p className="text-gray-600">View and track student attendance records</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-3 items-center">
          {user.role === 'super_admin' && (
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={filters.class_id}
            onValueChange={(v) => handleFilterChange('class_id', v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} ({cls.grade})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="w-48"
          />
          <Input
            placeholder="Student ID"
            value={filters.student_id}
            onChange={(e) => handleFilterChange('student_id', e.target.value)}
            className="w-48"
          />

          <Button variant="outline" onClick={loadAttendance}>
            <Search size={16} className="mr-2" /> Apply Filters
          </Button>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : attendance.length > 0 ? (
            <>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Student ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Class</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((rec) => (
                    <tr key={rec.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-3">{rec.date}</td>
                      <td className="px-4 py-3">{rec.student_id}</td>
                      <td className="px-4 py-3">{rec.class_id}</td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          rec.status === 'Present'
                            ? 'text-green-600'
                            : rec.status === 'Absent'
                            ? 'text-red-500'
                            : 'text-yellow-500'
                        }`}
                      >
                        {rec.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-50 border-t gap-2">
                <span className="text-sm text-gray-600">
                  Showing {attendance.length} of {pagination.total} records
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() => handlePageChange(filters.page - 1)}
                  >
                    Prev
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={pagination.totalPages}
                    value={filters.page}
                    onChange={(e) => handlePageChange(Number(e.target.value))}
                    className="w-16 text-center"
                  />
                  <span className="text-sm text-gray-500">/ {pagination.totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= pagination.totalPages}
                    onClick={() => handlePageChange(filters.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <CalendarDays className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-gray-900">No attendance found</h3>
              <p className="text-gray-500">Select filters or date to view attendance records.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
