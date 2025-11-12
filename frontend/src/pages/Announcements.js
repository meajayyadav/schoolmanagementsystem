import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { announcementsApi, schoolsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bell, AlertCircle, Plus, Building2, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({ id: null, title: '', content: '', priority: 'medium', school_id: '' });
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user.role === 'super_admin') loadSchools();
    loadAnnouncements();
  }, [selectedSchool]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const params = {};
      if (user.role !== 'super_admin') {
        params.school_id = user.school_id;
      } else if (selectedSchool) {
        params.school_id = selectedSchool;
      }

      const response = await announcementsApi.getAll(params);
      setAnnouncements(response.data || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!form.title || !form.content || !form.priority) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        school_id:
          user.role === 'super_admin' ? form.school_id || selectedSchool : user.school_id,
        created_by: user.id,
      };

      if (form.id) {
        await announcementsApi.update(form.id, payload);
        toast.success('Announcement updated successfully');
      } else {
        await announcementsApi.create(payload);
        toast.success('Announcement created successfully');
      }

      setOpenDialog(false);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementsApi.delete(id);
      toast.success('Announcement deleted');
      loadAnnouncements();
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const openEditDialog = (announcement) => {
    setForm({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      school_id: announcement.school_id || '',
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setForm({ id: null, title: '', content: '', priority: 'medium', school_id: '' });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'badge-danger';
      case 'low':
        return 'badge-info';
      default:
        return 'badge-warning';
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-600 mt-1">School-wide notifications and updates</p>
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'super_admin' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {selectedSchool
                      ? schools.find((s) => s.id === selectedSchool)?.name
                      : 'Select School'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {schools.map((school) => (
                    <DropdownMenuItem
                      key={school.id}
                      onClick={() => setSelectedSchool(school.id)}
                    >
                      {school.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {(user.role === 'school_admin' || user.role === 'super_admin') && (
              <Button
                onClick={() => {
                  resetForm();
                  setOpenDialog(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus size={18} />
                New Announcement
              </Button>
            )}
          </div>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="card hover:shadow-lg transition-shadow p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Icon */}
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`p-3 rounded-lg ${
                        announcement.priority === 'high' ? 'bg-red-100' : 'bg-blue-100'
                      }`}
                    >
                      {announcement.priority === 'high' ? (
                        <AlertCircle className="text-red-600" size={24} />
                      ) : (
                        <Bell className="text-blue-600" size={24} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {announcement.title}
                        </h3>
                        <span className={`badge ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{announcement.content}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(announcement.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Edit / Delete buttons */}
                  {(user.role === 'school_admin' || user.role === 'super_admin') && (
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                        onClick={() => openEditDialog(announcement)}
                      >
                        <Edit2 size={16} /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 size={16} /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No announcements yet</h3>
            <p className="text-gray-600">Create your first announcement</p>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {form.id ? 'Edit Announcement' : 'New Announcement'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {user.role === 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select School <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border rounded-lg p-2"
                    value={form.school_id}
                    onChange={(e) => setForm({ ...form, school_id: e.target.value })}
                  >
                    <option value="">Select a school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full border rounded-lg p-2 h-28"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Enter announcement details"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleCreateOrUpdate}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Saving...'
                    : form.id
                    ? 'Update Announcement'
                    : 'Create Announcement'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
