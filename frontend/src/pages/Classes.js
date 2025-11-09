import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { classesApi, schoolsApi, subjectsApi,systemCodesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, BookOpen, Search } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multiselect'; // ✅ same multiselect used in Teacher.js

export default function Classes() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [subjects, setSubjects] = useState([]); // ✅ subjects list from API
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
const [systemClasses, setSystemClasses] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    section: '',
    subjects: [],
    is_active: true,
    school_id: '',
  });

  const [filters, setFilters] = useState({
    name: '',
    grade: '',
    section: '',
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });
useEffect(() => {
  async function fetchSystemCodes() {
    try {
      const schoolId =
        user.role === "super_admin" ? formData.school_id : user.school_id;
      if (!schoolId) return;

      const res = await systemCodesApi.getAll({ school_id: schoolId });
      // filter system code group for "CLASS"
      const classCodes = res.data.filter(
        (c) => c.code === "CLS" && Array.isArray(c.items)
      );

      // Flatten the line items into options
      const options =
        classCodes.length > 0 ? classCodes[0].items.map((i) => i.label) : [];
      setSystemClasses(options);
    } catch (err) {
      console.error("❌ Failed to load system codes:", err);
      toast.error("Failed to load class list from system codes");
    }
  }

  fetchSystemCodes();
}, [formData.school_id, user]);
  // 🔹 Load schools and subjects for super admin
  useEffect(() => {
    if (user?.role === 'super_admin') loadSchools();
  }, [user]);

  // 🔹 Load classes when school changes or pagination changes
  useEffect(() => {
    if (
      user?.role === 'school_admin' ||
      (user?.role === 'super_admin' && selectedSchoolId)
    ) {
      loadClasses();
      loadSubjects();
    } else if (user?.role === 'super_admin' && !selectedSchoolId) {
      setClasses([]);
      setSubjects([]);
      setLoading(false);
    }
  }, [selectedSchoolId, filters.page, user]);

  // ✅ Load schools
  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  // ✅ Load subjects by school
  const loadSubjects = async () => {
    try {
      const schoolId =
        user.role === 'super_admin' ? selectedSchoolId : user.school_id;
      if (!schoolId) return;
      const res = await subjectsApi.getAll({ school_id: schoolId });
      setSubjects(res.data.data || res.data || []);
    } catch {
      toast.error('Failed to load subjects');
    }
  };

  // ✅ Load classes list
  const loadClasses = async () => {
    try {
      setLoading(true);
      const params = {
        name: filters.name,
        grade: filters.grade,
        section: filters.section,
        page: filters.page,
        limit: filters.limit,
      };

      if (user.role === 'super_admin') {
        if (!selectedSchoolId) {
          toast.error('Select a school first');
          setLoading(false);
          return;
        }
        params.school_id = selectedSchoolId;
      }

      const res = await classesApi.getAll(params);
      const { data = [], total = 0, totalPages = 1 } = res.data || {};
      setClasses(data);
      setPagination({ total, totalPages });
    } catch (err) {
      console.error('❌ Load classes error:', err);
      toast.error(err.response?.data?.detail || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Create Class
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        subjects: Array.isArray(formData.subjects)
          ? formData.subjects
          : [formData.subjects],
      };

      if (user.role === 'super_admin') {
        if (!payload.school_id) {
          return toast.error('Select a school before adding a class');
        }
      } else {
        payload.school_id = user.school_id;
      }

      await classesApi.create(payload);
      toast.success('Class created successfully');
      setShowDialog(false);
      resetForm();
      loadClasses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create class');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      grade: '',
      section: '',
      subjects: [],
      is_active: true,
      school_id: '',
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setFilters({ ...filters, page: newPage });
  };

  const toggleClassStatus = async (cls) => {
    try {
      await classesApi.update(cls.id, { is_active: !cls.is_active });
      toast.success(
        `Class ${cls.is_active ? 'deactivated' : 'activated'} successfully`
      );
      setClasses((prev) =>
        prev.map((c) =>
          c.id === cls.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-6" data-testid="classes-page">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">📚 Classes</h1>
            <p className="text-gray-600">Manage all class sections and subjects</p>
          </div>
          <Button onClick={() => setShowDialog(true)} data-testid="add-class-btn">
            <Plus size={20} className="mr-2" />
            Add Class
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <Input
              placeholder="Search by name"
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              className="w-48"
            />
          </div>

          <Input
            placeholder="Grade"
            value={filters.grade}
            onChange={(e) => handleFilterChange('grade', e.target.value)}
            className="w-32"
          />

          <Input
            placeholder="Section"
            value={filters.section}
            onChange={(e) => handleFilterChange('section', e.target.value)}
            className="w-32"
          />

          {user.role === 'super_admin' && (
            <Select onValueChange={setSelectedSchoolId} value={selectedSchoolId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadClasses}>
              Apply Filters
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({ name: '', grade: '', section: '', page: 1, limit: 10 });
                if (user.role === 'super_admin') setSelectedSchoolId('');
                loadClasses();
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : classes.length > 0 ? (
            <>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Section
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Subjects
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {cls.name}
                      </td>
                      <td className="px-4 py-3">{cls.grade}</td>
                      <td className="px-4 py-3">{cls.section}</td>
                      <td className="px-4 py-3">
                        {Array.isArray(cls.subjects)
                          ? cls.subjects.join(', ')
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={cls.is_active}
                          onCheckedChange={() => toggleClassStatus(cls)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-between items-center p-4 bg-gray-50 border-t">
                <span className="text-sm text-gray-600">
                  Showing {classes.length} of {pagination.total} classes
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
                  <span className="text-sm">
                    Page {filters.page} / {pagination.totalPages}
                  </span>
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
              <BookOpen className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-gray-900">
                No classes found
              </h3>
              <p className="text-gray-500">
                Select a school or add a new class.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Class Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {user.role === 'super_admin' && (
              <Select
                onValueChange={(v) => setFormData({ ...formData, school_id: v })}
                value={formData.school_id}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
  value={formData.name}
  onValueChange={(v) => setFormData({ ...formData, name: v })}
>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select Class Name" />
  </SelectTrigger>
  <SelectContent>
    {systemClasses.map((cls, idx) => (
      <SelectItem key={idx} value={cls}>
        {cls}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

            <Input
              placeholder="Grade"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              required
            />
            <Input
              placeholder="Section"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              required
            />

            {/* ✅ MultiSelect for Subjects */}
            <MultiSelect
              options={subjects.map((s) => ({
                label: s.name,
                value: s.name,
              }))}
              value={formData.subjects}
              onChange={(val) => setFormData({ ...formData, subjects: val })}
              placeholder="Select Subjects"
            />

            <Button type="submit" className="w-full">
              Add Class
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
