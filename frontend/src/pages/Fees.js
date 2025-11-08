import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { feesApi, schoolsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, CreditCard, Search } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';

export default function Fees() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolCode, setSelectedSchoolCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    description: '',
    paid: false,
    payment_method: '',
    school_id: '',
  });

  const [filters, setFilters] = useState({
    student_id: '',
    status: '',
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    if (user?.role === 'super_admin') loadSchools();
  }, [user]);

  useEffect(() => {
  if (
    user?.role === 'school_admin' ||
    (user?.role === 'super_admin' && selectedSchoolCode)
  ) {
    loadFees();
  }
}, [selectedSchoolCode, filters.page, user]);


  const loadSchools = async () => {
    try {
      const response = await schoolsApi.getAll();
      setSchools(response.data || []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadFees = async () => {
    try {
      setLoading(true);
      const params = {
        student_id: filters.student_id,
        status: filters.status,
        page: filters.page,
        limit: filters.limit,
      };

      if (user.role === 'super_admin') {
        if (!selectedSchoolCode) {
          toast.error('Select a school first');
          setLoading(false);
          return;
        }
        params.school_id = selectedSchoolCode;
      }

      const response = await feesApi.getAll(params);
      setFees(response.data.data || response.data || []);
      setPagination({
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1,
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };

      if (user.role === 'super_admin' && !payload.school_id) {
        return toast.error('Select a school before adding a fee');
      }

      await feesApi.create(payload);
      toast.success('Fee record created successfully');
      setShowDialog(false);
      setFormData({
        student_id: '',
        amount: '',
        description: '',
        paid: false,
        payment_method: '',
        school_id: '',
      });
      loadFees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add fee');
    }
  };

  const togglePaymentStatus = async (fee) => {
    try {
      if (!fee.id) return toast.error('Invalid fee record');
      const newStatus = !fee.paid;

      if (newStatus) {
        await feesApi.pay(fee.id, { payment_method: 'Cash' });
      } else {
        toast.error('Unpay operation not supported');
        return;
      }

      toast.success('Payment updated successfully');
      setFees((prev) =>
        prev.map((f) => (f.id === fee.id ? { ...f, paid: true } : f))
      );
    } catch (err) {
      toast.error('Failed to update payment status');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setFilters({ ...filters, page: newPage });
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-6" data-testid="fees-page">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">💰 Fees</h1>
            <p className="text-gray-600">
              Manage student fees and payment status
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)} data-testid="add-fee-btn">
            <Plus size={20} className="mr-2" />
            Add Fee
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <Input
              placeholder="Search by student ID"
              value={filters.student_id}
              onChange={(e) => handleFilterChange('student_id', e.target.value)}
              className="w-48"
            />
          </div>

          <Select
            onValueChange={(v) => handleFilterChange('status', v)}
            value={filters.status}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          {user.role === 'super_admin' && (
            <Select
              onValueChange={setSelectedSchoolCode}
              value={selectedSchoolCode}
            >
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

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadFees}>
              Apply Filters
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({ student_id: '', status: '', page: 1, limit: 10 });
                if (user.role === 'super_admin') setSelectedSchoolCode('');
                setFees([]);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Fees Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : fees.length > 0 ? (
            <>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Student ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Payment Method
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Mark Paid
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <tr
                      key={fee.id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {fee.student_id}
                      </td>
                      <td className="px-4 py-3">₹{fee.amount}</td>
                      <td className="px-4 py-3">{fee.description || '-'}</td>
                      <td
                        className={`px-4 py-3 ${
                          fee.paid ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {fee.paid ? 'Paid' : 'Pending'}
                      </td>
                      <td className="px-4 py-3">
                        {fee.payment_method || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={fee.paid}
                          onCheckedChange={() => togglePaymentStatus(fee)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-50 border-t gap-2">
                <span className="text-sm text-gray-600">
                  Showing {fees.length} of {pagination.total} fee records
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
                    onChange={(e) =>
                      handlePageChange(Number(e.target.value))
                    }
                    className="w-16 text-center"
                  />
                  <span className="text-sm text-gray-500">
                    / {pagination.totalPages}
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
              <CreditCard className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-gray-900">
                No fees found
              </h3>
              <p className="text-gray-500">
                Select a school or add a new fee record.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Fee Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="add-fee-dialog" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Fee Record</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {user.role === 'super_admin' && (
              <Select
                onValueChange={(v) =>
                  setFormData({ ...formData, school_id: v })
                }
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
              placeholder="Student ID"
              value={formData.student_id}
              onChange={(e) =>
                setFormData({ ...formData, student_id: e.target.value })
              }
              required
            />
            <Input
              placeholder="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
            />
            <Input
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            <Select
              onValueChange={(v) =>
                setFormData({ ...formData, payment_method: v })
              }
              value={formData.payment_method}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit" className="w-full">
              Add Fee Record
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
