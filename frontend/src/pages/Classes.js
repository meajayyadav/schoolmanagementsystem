import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { classesApi, schoolsApi, subjectsApi, systemCodesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { Plus, BookOpen, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multiselect';
import { useConfirm } from '@/hooks/use-confirm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// SubjectCell Component
const SubjectCell = ({ subjects }) => {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  const displaySubjects = subjects.slice(0, 2);
  const remainingCount = subjects.length - 2;

  return (
    <div className="flex flex-wrap gap-1 min-w-[120px]">
      {displaySubjects.map((subject, index) => (
        <Badge 
          key={index} 
          variant="secondary" 
          className="text-xs max-w-[100px] truncate px-2 py-1"
        >
          {subject}
        </Badge>
      ))}
      
      {remainingCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-gray-100 px-2 py-1"
            >
              +{remainingCount}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">All Subjects ({subjects.length})</h4>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {subjects.map((subject, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs mb-1"
                  >
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default function Classes() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [systemClasses, setSystemClasses] = useState([]);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    section: '',
    subjects: [],
    admission_fee: '',
    monthly_fee: '',
    is_active: true,
    school_id: '',
  });

  const [filters, setFilters] = useState({
    name: '',
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
        const classCodes = res.data.filter(
          (c) => c.code === "CLS" && Array.isArray(c.items)
        );

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

  useEffect(() => {
    if (user?.role === 'super_admin') loadSchools();
  }, [user]);

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

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

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

  const loadClasses = async () => {
    try {
      setLoading(true);
      const params = {
        name: filters.name,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        subjects: Array.isArray(formData.subjects) ? formData.subjects : [formData.subjects],
        admission_fee: parseFloat(formData.admission_fee) || 0,
        monthly_fee: parseFloat(formData.monthly_fee) || 0,
      };

      if (user.role === 'super_admin') {
        if (!payload.school_id) {
          return toast.error('Select a school before adding a class');
        }
      } else {
        payload.school_id = user.school_id;
      }

      if (editingClass) {
        await classesApi.update(editingClass.id, payload);
        toast.success('Class updated successfully');
      } else {
        await classesApi.create(payload);
        toast.success('Class created successfully');
      }
      
      setShowDialog(false);
      resetForm();
      loadClasses();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ₹{editingClass ? 'update' : 'create'} class`);
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name || '',
      section: cls.section || '',
      subjects: Array.isArray(cls.subjects) ? cls.subjects : [],
      admission_fee: cls.admission_fee?.toString() || '',
      monthly_fee: cls.monthly_fee?.toString() || '',
      is_active: cls.is_active ?? true,
      school_id: cls.school_id || '',
    });
    setShowDialog(true);
  };

  const handleDelete = async (cls) => {
    const confirmed = await confirm({
      title: 'Delete Class',
      description: `Are you sure you want to delete class "${cls.name}"? This action cannot be undone.`,
    });
    if (!confirmed) return;
    
    try {
      await classesApi.delete(cls.id);
      toast.success('Class deleted successfully');
      loadClasses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete class');
    }
  };

  const resetForm = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      section: '',
      subjects: [],
      admission_fee: '',
      monthly_fee: '',
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
        `Class ₹{cls.is_active ? 'deactivated' : 'activated'} successfully`
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-6" data-testid="classes-page">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">📚 Class Management</h1>
            <p className="text-gray-600">Manage all class sections, fees, and subjects</p>
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
              placeholder="Search by class name"
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              className="w-48"
            />
          </div>

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
                setFilters({ name: '', section: '', page: 1, limit: 10 });
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
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[150px]">
                        Class Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">
                        Section
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">
                        Subjects
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[120px]">
                        Admission Fee
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[120px]">
                        Monthly Fee
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[100px]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[80px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => (
                      <tr key={cls.id} className="border-t hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {cls.name}
                        </td>
                        <td className="px-4 py-3">{cls.section || '-'}</td>
                        <td className="px-4 py-3">
                          <SubjectCell subjects={cls.subjects} />
                        </td>
                        <td className="px-4 py-3 font-medium text-green-600">
                          {formatCurrency(cls.admission_fee)}
                        </td>
                        <td className="px-4 py-3 font-medium text-blue-600">
                          {formatCurrency(cls.monthly_fee)}
                        </td>
                        <td className="px-4 py-3">
                          <Switch
                            checked={cls.is_active}
                            onCheckedChange={() => toggleClassStatus(cls)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(cls)}>
                                <Edit size={16} className="mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(cls)}>
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? 'Edit Class' : 'Add New Class'}
            </DialogTitle>
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
              placeholder="Section"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Admission Fee (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.admission_fee}
                  onChange={(e) => setFormData({ ...formData, admission_fee: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Monthly Fee (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.monthly_fee}
                  onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  required
                />
              </div>
            </div>

            <MultiSelect
              options={subjects.map((s) => ({
                label: s.name,
                value: s.name,
              }))}
              value={formData.subjects}
              onChange={(val) => setFormData({ ...formData, subjects: val })}
              placeholder="Select Subjects"
            />

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <label className="text-sm font-medium text-gray-700">
                Active Class
              </label>
            </div>

            <Button type="submit" className="w-full">
              {editingClass ? 'Update Class' : 'Add Class'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </Layout>
  );
}
