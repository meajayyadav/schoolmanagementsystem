// src/pages/Schools.jsx
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { schoolsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Building, Pencil, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    domain: '', // <-- new
    admin_email: '',
    admin_name: '',
    admin_password: '',
    address: '',
    phone: ''
  });

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const response = await schoolsApi.getAll();
      setSchools(response.data || []);
    } catch (error) {
      console.error('loadSchools error', error);
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (school = null) => {
    if (school) {
      setIsEditing(true);
      setSelectedSchool(school);
      setFormData({
        name: school.name || '',
        code: school.code || '',
        domain: school.custom_domain || school.domain || '', // handle different backend key names
        admin_email: school.admin_email || '',
        admin_name: school.admin_name || '',
        admin_password: '',
        address: school.address || '',
        phone: school.phone || '',
      });
    } else {
      setIsEditing(false);
      setSelectedSchool(null);
      setFormData({
        name: '',
        code: '',
        domain: '',
        admin_email: '',
        admin_name: '',
        admin_password: '',
        address: '',
        phone: '',
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && selectedSchool) {
        // Only send fields allowed for update
        const payload = {
          name: formData.name,
          // code is not editable
          custom_domain: formData.domain || null,
          admin_email: formData.admin_email,
          admin_name: formData.admin_name,
          address: formData.address,
          phone: formData.phone,
        };
        await schoolsApi.update(selectedSchool.id, payload);
        toast.success('School updated successfully');
      } else {
        // Create payload
        const payload = {
          name: formData.name,
          code: formData.code,
          custom_domain: formData.domain || null,
          admin_email: formData.admin_email,
          admin_name: formData.admin_name,
          admin_password: formData.admin_password,
          address: formData.address,
          phone: formData.phone,
        };
        await schoolsApi.create(payload);
        toast.success('School created successfully');
      }
      setShowDialog(false);
      loadSchools();
    } catch (error) {
      console.error('School save error', error);
      const message = error?.response?.data?.detail || error?.message || 'Operation failed';
      toast.error(message);
    }
  };

  const handleDelete = async (school) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `This will permanently delete "${school.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await schoolsApi.delete(school.id);
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'School has been deleted successfully.',
        timer: 1500,
        showConfirmButton: false,
      });
      loadSchools();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete school');
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="schools-page">
        <div className="page-header flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Schools</h1>
            <p className="text-gray-600 mt-2">Manage all registered schools</p>
          </div>
          <Button onClick={() => handleOpenDialog()} data-testid="add-school-btn">
            <Plus size={20} className="mr-2" />
            Add School
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : schools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map((school) => (
              <div
                key={school.id}
                className="card relative hover:shadow-lg transition-shadow p-4 rounded-lg border bg-white"
              >
                <div className="absolute top-3 right-3 flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenDialog(school)}
                  >
                    <Pencil size={18} className="text-blue-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(school)}
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </Button>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building className="text-blue-600" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{school.name}</h3>
                    <p className="text-sm text-gray-600 mb-1">Code: {school.code}</p>
                    { (school.custom_domain || school.domain) && (
                      <p className="text-sm text-gray-600 mb-1">Domain: {school.custom_domain || school.domain}</p>
                    )}
                    <p className="text-sm text-gray-600">Admin: {school.admin_name}</p>
                    <p className="text-sm text-gray-600">{school.admin_email}</p>
                    {school.phone && <p className="text-sm text-gray-600 mt-2">{school.phone}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12" data-testid="no-schools-message">
            <Building className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No schools yet</h3>
            <p className="text-gray-600">Add your first school to get started</p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="school-dialog">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit School' : 'Add New School'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="School Name" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input placeholder="School Code" value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required disabled={isEditing} />
            <Input placeholder="Domain (example: www.dps.in or dps.in)" value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })} />
            <Input placeholder="Admin Name" value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })} required />
            <Input type="email" placeholder="Admin Email" value={formData.admin_email}
              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })} required />
            {!isEditing && (
              <Input type="password" placeholder="Admin Password" value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })} required />
            )}
            <Input placeholder="Address" value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            <Input placeholder="Phone" value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Button type="submit" className="w-full">
              {isEditing ? 'Update School' : 'Create School'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
