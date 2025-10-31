import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { schoolsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Building } from 'lucide-react';

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
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
    try {
      const response = await schoolsApi.getAll();
      setSchools(response.data);
    } catch (error) {
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await schoolsApi.create(formData);
      toast.success('School created successfully');
      setShowDialog(false);
      setFormData({
        name: '',
        code: '',
        admin_email: '',
        admin_name: '',
        admin_password: '',
        address: '',
        phone: ''
      });
      loadSchools();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create school');
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="schools-page">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Schools</h1>
            <p className="text-gray-600 mt-2">Manage all registered schools</p>
          </div>
          <Button onClick={() => setShowDialog(true)} data-testid="add-school-btn">
            <Plus size={20} className="mr-2" />
            Add School
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map((school) => (
              <div key={school.id} className="card hover:shadow-lg transition-shadow" data-testid={`school-card-${school.code}`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building className="text-blue-600" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{school.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Code: {school.code}</p>
                    <p className="text-sm text-gray-600">Admin: {school.admin_name}</p>
                    <p className="text-sm text-gray-600">{school.admin_email}</p>
                    {school.phone && <p className="text-sm text-gray-600 mt-2">{school.phone}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && schools.length === 0 && (
          <div className="text-center py-12" data-testid="no-schools-message">
            <Building className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No schools yet</h3>
            <p className="text-gray-600">Add your first school to get started</p>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="add-school-dialog">
          <DialogHeader>
            <DialogTitle>Add New School</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              data-testid="school-name-input"
              placeholder="School Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              data-testid="school-code-input"
              placeholder="School Code (unique)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <Input
              data-testid="admin-name-input"
              placeholder="Admin Name"
              value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
              required
            />
            <Input
              data-testid="admin-email-input"
              type="email"
              placeholder="Admin Email"
              value={formData.admin_email}
              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
              required
            />
            <Input
              data-testid="admin-password-input"
              type="password"
              placeholder="Admin Password"
              value={formData.admin_password}
              onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
              required
            />
            <Input
              data-testid="school-address-input"
              placeholder="Address (optional)"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Input
              data-testid="school-phone-input"
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Button type="submit" className="w-full" data-testid="submit-school-btn">
              Create School
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}