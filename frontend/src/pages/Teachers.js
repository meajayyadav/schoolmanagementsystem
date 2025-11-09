import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { teachersApi, schoolsApi, subjectsApi, classesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Users,
  MoreVertical,
  Pencil,
  Trash,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multiselect';

// ✅ Pagination Component (used inside table container)
const PaginationControl = ({ pagination, filters, setFilters }) => {
  const pageSizes = [5, 10, 15, 25, 50];
  return (
    <div className="flex items-center justify-end gap-4 p-4 border-t bg-gray-50">
      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
        <span>Rows per page:</span>
        <Select
          value={String(filters.limit)}
          onValueChange={(val) =>
            setFilters((prev) => ({ ...prev, limit: parseInt(val), page: 1 }))
          }
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
        <Button
          variant="outline"
          size="sm"
          disabled={filters.page === 1}
          onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
        >
          Prev
        </Button>
        <span>
          Page {filters.page} of {pagination.totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={filters.page >= pagination.totalPages}
          onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

// ----------------------
// Main Component
// ----------------------
export default function Teachers() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSchoolCode, setSelectedSchoolCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    subjects: [],
    classes_assigned: [],
    fee_status: 'Pending',
    is_active: true,
    school_id: '',
  });

  const [filters, setFilters] = useState({
    name: '',
    class_assigned: '',
    subject: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // ----------------------
  // Data Loading
  // ----------------------
  useEffect(() => {
    if (user?.role === 'super_admin') loadSchools();
  }, [user]);

  useEffect(() => {
    if (
      user?.role === 'school_admin' ||
      (user?.role === 'super_admin' && selectedSchoolCode)
    ) {
      loadTeachers();
      loadSubjects();
      loadClasses();
    }
  }, [selectedSchoolCode, filters.page, filters.limit, user]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools((res.data || []).filter((s) => s && s.code));
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadClasses = async () => {
    try {
      const schoolId =
        user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
      if (!schoolId) return;
      const res = await classesApi.getAll({ school_id: schoolId });
      setClasses(res.data.data || res.data || []);
    } catch {
      toast.error('Failed to load classes');
    }
  };

  const loadSubjects = async () => {
    try {
      const schoolId =
        user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
      if (!schoolId) return;
      const res = await subjectsApi.getAll({ school_id: schoolId });
      setSubjects(res.data.data || res.data || []);
    } catch {
      toast.error('Failed to load subjects');
    }
  };

  const loadTeachers = async (overrideFilters = null) => {
  try {
    setLoading(true);
    const params = overrideFilters || { ...filters };
    if (user.role === 'super_admin') {
      if (!selectedSchoolCode) return toast.error('Select a school first');
      params.school_id = selectedSchoolCode;
    }
    const res = await teachersApi.getAll(params);
    setTeachers(res.data.data || res.data || []);
    setPagination({
      total: res.data.total || 0,
      totalPages: res.data.totalPages || 1,
    });
  } catch (err) {
    toast.error(err.response?.data?.detail || 'Failed to load teachers');
  } finally {
    setLoading(false);
  }
};


  // ----------------------
  // CRUD Handlers
  // ----------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (user.role === 'super_admin') {
        if (!payload.school_id)
          return toast.error('Select a school before saving');
      } else {
        payload.school_id = user.school_id;
      }

      if (editing) {
        await teachersApi.update(editing.id, payload);
        toast.success('Teacher updated successfully');
      } else {
        await teachersApi.create(payload);
        toast.success('Teacher added successfully');
      }

      setShowDialog(false);
      setEditing(null);
      resetForm();
      loadTeachers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save teacher');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await teachersApi.delete(id);
      toast.success('Teacher deleted successfully');
      loadTeachers();
    } catch {
      toast.error('Failed to delete teacher');
    }
  };

  const toggleTeacherStatus = async (teacher) => {
    try {
      await teachersApi.update(teacher.id, { is_active: !teacher.is_active });
      toast.success(`Teacher ${teacher.is_active ? 'deactivated' : 'activated'}`);
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacher.id ? { ...t, is_active: !t.is_active } : t
        )
      );
    } catch {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subjects: [],
      classes_assigned: [],
      fee_status: 'Pending',
      is_active: true,
      school_id: '',
    });
  };

  // ----------------------
  // UI
  // ----------------------
  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">👩‍🏫 Teachers</h1>
            <p className="text-gray-600">Manage teacher profiles and subjects</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setEditing(null);
              setShowDialog(true);
            }}
          >
            <Plus size={20} className="mr-2" /> Add Teacher
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-3">
          {user.role === 'super_admin' && (
            <Select
              value={selectedSchoolCode}
              onValueChange={(v) => setSelectedSchoolCode(v)}
            >
              <SelectTrigger className="w-[250px]">
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

          <Input
            placeholder="Search by name"
            value={filters.name}
            onChange={(e) =>
              setFilters({ ...filters, name: e.target.value, page: 1 })
            }
            className="w-56"
          />

          {/* Subject Dropdown */}
          <Select
            value={filters.subject}
            onValueChange={(v) => setFilters({ ...filters, subject: v, page: 1 })}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Class Dropdown */}
          <Select
            value={filters.class_assigned}
            onValueChange={(v) =>
              setFilters({ ...filters, class_assigned: v, page: 1 })
            }
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.name || c.class_name}>
                  {c.name || c.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
{/* Apply Filters button before Clear */}
<Button
  size="sm"
  onClick={() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    loadTeachers();
  }}
>
  Apply Filters
</Button>

<Button
  variant="outline"
  size="sm"
  onClick={() =>
    setFilters({ name: '', class_assigned: '', subject: '', page: 1, limit: 10 })
  }
>
  <X size={16} className="mr-1" /> Clear
</Button>

        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="flex justify-between items-center px-4 border-b bg-gray-50">
    <h2 className="text-base font-medium text-gray-800 py-3">
      Teacher Records
    </h2>
    {/* ✅ Pagination Inside Table Container */}
              <PaginationControl
                pagination={pagination}
                filters={filters}
                setFilters={setFilters}
              />
  </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : teachers.length > 0 ? (
            <>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Subjects</th>
                    <th className="px-4 py-3 text-left">Classes Assigned</th>
                    <th className="px-4 py-3 text-left">Fee Status</th>
                    <th className="px-4 py-3 text-left">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-4 py-3">
                        {Array.isArray(t.subjects)
                          ? t.subjects.join(', ')
                          : t.subject}
                      </td>
                      <td className="px-4 py-3">
                        {Array.isArray(t.classes_assigned)
                          ? t.classes_assigned.join(', ')
                          : t.class_assigned}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          t.fee_status === 'Paid' ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {t.fee_status}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={t.is_active}
                          onCheckedChange={() => toggleTeacherStatus(t)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(t);
                                setFormData({
                                  ...t,
                                  subjects: t.subjects || [],
                                  classes_assigned: t.classes_assigned || [],
                                });
                                setShowDialog(true);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(t.id)}
                              className="text-red-600"
                            >
                              <Trash className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-gray-900">
                No teachers found
              </h3>
              <p className="text-gray-500">
                Add teachers to begin managing your staff.
              </p>
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
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
                      <SelectItem key={s.code} value={s.code}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Input
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />

              <MultiSelect
                options={subjects.map((s) => ({
                  label: s.name,
                  value: s.name,
                }))}
                value={formData.subjects}
                onChange={(val) => setFormData({ ...formData, subjects: val })}
                placeholder="Select Subjects"
              />

              <MultiSelect
                options={classes.map((c) => ({
                  label: c.name || c.class_name,
                  value: c.name || c.class_name,
                }))}
                value={formData.classes_assigned}
                onChange={(val) =>
                  setFormData({ ...formData, classes_assigned: val })
                }
                placeholder="Assign Classes"
              />

              <Select
                onValueChange={(v) => setFormData({ ...formData, fee_status: v })}
                value={formData.fee_status}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Fee Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit" className="w-full">
                {editing ? 'Update Teacher' : 'Add Teacher'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
