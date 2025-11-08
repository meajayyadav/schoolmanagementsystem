import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { schoolsApi, usersApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Users, Search, MoreVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

// Pagination control (top-right)
const PaginationControl = ({ pagination, filters, setFilters }) => {
  const pageSizes = [5, 10, 15, 25, 50];

  return (
    <div className="flex items-center justify-end gap-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
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

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    role: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    school_id: '',
  });

  const [resetPassword, setResetPassword] = useState('');

  // Load schools for super_admin
  useEffect(() => {
    if (user?.role === 'super_admin') loadSchools();
  }, []);

  // Load users
  useEffect(() => {
    if (user?.role === 'school_admin' || (user?.role === 'super_admin' && selectedSchool))
      loadUsers();
  }, [selectedSchool, filters.page, filters.limit]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        school_id: user.role === 'super_admin' ? selectedSchool : user.school_id,
      };
      const res = await usersApi.getAll(params);
      const data = res.data.data || res.data || [];
      setUsers(data);
      setPagination({
        total: res.data.total || data.length,
        totalPages: Math.ceil((res.data.total || data.length) / filters.limit),
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Add user
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (user.role === 'super_admin' && !payload.school_id)
        return toast.error('Select a school before adding user');

      await usersApi.create(payload);
      toast.success('User created successfully');
      setShowAddDialog(false);
      resetForm();
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add user');
    }
  };

  // Edit user
  const openEditDialog = (u) => {
    setSelectedUser(u);
    setFormData({
      name: u.name || '',
      email: u.email || '',
      role: u.role || '',
      school_id: u.school_id || '',
      password: '',
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await usersApi.update(selectedUser.id, formData);
      toast.success('User updated successfully');
      setShowEditDialog(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user');
    }
  };

  // Reset password
  const openResetDialog = (u) => {
    setSelectedUser(u);
    setResetPassword('');
    setShowResetDialog(true);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      await usersApi.resetPassword(selectedUser.id, resetPassword);
      toast.success('Password reset successfully');
      setShowResetDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password');
    }
  };

  const handleToggleActive = async (id, is_active) => {
    try {
      await usersApi.toggleActive(id, is_active);
      toast.success(`User ${is_active ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const resetForm = () =>
    setFormData({ name: '', email: '', password: '', role: '', school_id: '' });

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">👤 User Management</h1>
            <p className="text-gray-600">Manage system users and roles across schools</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus size={20} className="mr-2" /> Add User
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <Input
              placeholder="Search by name"
              value={filters.name}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, name: e.target.value, page: 1 }))
              }
              className="w-48"
            />
          </div>
          <Input
            placeholder="Email"
            value={filters.email}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, email: e.target.value, page: 1 }))
            }
            className="w-48"
          />
          <Select
            onValueChange={(v) => setFilters((prev) => ({ ...prev, role: v, page: 1 }))}
            value={filters.role}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="school_admin">School Admin</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
          {user.role === 'super_admin' && (
            <Select onValueChange={setSelectedSchool} value={selectedSchool}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id || s.code} value={s.id || s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={loadUsers}>
            Apply
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* ✅ Top pagination bar */}
          <div className="flex justify-between items-center px-4 border-b bg-gray-50">
            <h2 className="text-base font-medium text-gray-800 py-3">User Records</h2>
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
          ) : users.length ? (
            <>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">School</th>
                    <th className="px-4 py-3 text-left">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role}</td>
                      <td className="px-4 py-3">{u.school_name || '-'}</td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={u.is_active}
                          onCheckedChange={(checked) =>
                            handleToggleActive(u.id, checked)
                          }
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
                            <DropdownMenuItem onClick={() => openEditDialog(u)}>
                              ✏️ Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetDialog(u)}>
                              🔐 Reset Password
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
              <h3 className="text-lg font-semibold text-gray-900">No users found</h3>
              <p className="text-gray-500">Try changing filters or add a user.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
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
                    <SelectItem key={s.id || s.code} value={s.id || s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Select
              onValueChange={(v) => setFormData({ ...formData, role: v })}
              value={formData.role}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school_admin">School Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full">
              Add User
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Select
              onValueChange={(v) => setFormData({ ...formData, role: v })}
              value={formData.role}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school_admin">School Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full">
              Update User
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter new password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full">
              Reset Password
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
