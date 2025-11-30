import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { salaryApi, schoolsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  DollarSign,
  MoreVertical,
  Pencil,
  Trash,
  X,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  CreditCard,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirm } from '@/hooks/use-confirm';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Pagination Component
const PaginationControl = ({ pagination, filters, setFilters }) => {
  const pageSizes = [10, 25, 50, 100];
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-gray-50/50">
      <div className="text-sm text-gray-600">
        Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total} records
      </div>
      
      <div className="flex items-center gap-4">
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

        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>

          <span className="min-w-20 text-center">
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
    </div>
  );
};

export default function Salary() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolCode, setSelectedSchoolCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [statistics, setStatistics] = useState(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    employee_type: 'teacher',
    employee_name: '',
    amount: '',
    deductions: '',
    bonuses: '',
    salary_month: '',
    payment_date: '',
    payment_method: 'cash',
    status: 'pending',
    bank_account: '',
    transaction_id: '',
    notes: '',
    school_id: '',
  });

  const [payFormData, setPayFormData] = useState({
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    bank_account: '',
    notes: '',
  });

  const [filters, setFilters] = useState({
    employee_type: '',
    status: '',
    salary_month: '',
    payment_method: '',
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Load initial data
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadSchools();
    }
  }, [user]);

  useEffect(() => {
    if (
      user?.role === 'school_admin' ||
      (user?.role === 'super_admin' && selectedSchoolCode)
    ) {
      loadSalaries();
      loadEmployees();
      loadStatistics();
    }
  }, [selectedSchoolCode, filters.page, filters.limit, filters.status, filters.employee_type, filters.salary_month, user]);

  // Reload employees when school changes and dialog is open
  useEffect(() => {
    if (showDialog && (selectedSchoolCode || user?.school_id)) {
      loadEmployees();
    }
  }, [selectedSchoolCode, showDialog]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools((res.data || []).filter((s) => s && s.code));
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadEmployees = async (employeeType = null) => {
    try {
      const schoolId = user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
      if (!schoolId) return;
      
      const res = await salaryApi.getEmployees({ 
        school_id: schoolId,
        employee_type: employeeType || formData.employee_type 
      });
      setEmployees(res.data || []);
    } catch {
      toast.error('Failed to load employees');
    }
  };

  const loadSalaries = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      if (user.role === 'super_admin') {
        if (!selectedSchoolCode) {
          setLoading(false);
          return;
        }
        params.school_id = selectedSchoolCode;
      }
      
      const res = await salaryApi.getAll(params);
      setSalaries(res.data.data || res.data || []);
      setPagination({
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1,
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load salaries');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const schoolId = user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
      if (!schoolId) return;
      
      const res = await salaryApi.getStatistics({ school_id: schoolId });
      setStatistics(res.data);
    } catch {
      // Silently fail for statistics
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      if (user.role === 'super_admin') {
        if (!payload.school_id) {
          return toast.error('Select a school before saving');
        }
      } else {
        payload.school_id = user.school_id;
      }

      // Convert string numbers to floats
      payload.amount = parseFloat(payload.amount) || 0;
      payload.deductions = parseFloat(payload.deductions) || 0;
      payload.bonuses = parseFloat(payload.bonuses) || 0;

      if (editing) {
        await salaryApi.update(editing.id, payload);
        toast.success('Salary updated successfully');
      } else {
        await salaryApi.create(payload);
        toast.success('Salary record created successfully');
      }

      setShowDialog(false);
      setEditing(null);
      resetForm();
      loadSalaries();
      loadStatistics();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save salary');
    }
  };

  // Handle pay salary
  const handlePaySalary = async () => {
    try {
      const payload = { ...payFormData };
      if (user.role === 'super_admin' && selectedSchoolCode) {
        payload.school_id = selectedSchoolCode;
      }
      
      await salaryApi.pay(selectedSalary.id, payload);
      toast.success('Salary paid successfully');
      setShowPayDialog(false);
      setSelectedSalary(null);
      loadSalaries();
      loadStatistics();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to pay salary');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Salary Record',
      description: 'Are you sure you want to delete this salary record? This action cannot be undone.',
    });
    if (!confirmed) return;
    
    try {
      const params = {};
      if (user.role === 'super_admin' && selectedSchoolCode) {
        params.school_id = selectedSchoolCode;
      }
      
      await salaryApi.delete(id, params);
      toast.success('Salary record deleted successfully');
      loadSalaries();
      loadStatistics();
    } catch {
      toast.error('Failed to delete salary record');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      employee_id: '',
      employee_type: 'teacher',
      employee_name: '',
      amount: '',
      deductions: '',
      bonuses: '',
      salary_month: '',
      payment_date: '',
      payment_method: 'cash',
      status: 'pending',
      bank_account: '',
      transaction_id: '',
      notes: '',
      school_id: '',
    });
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setFormData({
        ...formData,
        employee_id: employee.id,
        employee_name: employee.name,
        employee_type: employee.type,
      });
    }
  };

  // Calculate net amount
  const calculateNetAmount = () => {
    const amount = parseFloat(formData.amount) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const bonuses = parseFloat(formData.bonuses) || 0;
    return amount - deductions + bonuses;
  };

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Salary Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage salary payments for teachers and staff
              </p>
            </div>
            
            <Button
              onClick={() => {
                resetForm();
                setEditing(null);
                setFormData(prev => ({ ...prev, salary_month: getCurrentMonth() }));
                setShowDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              <Plus size={20} className="mr-2" />
              Add Salary Record
            </Button>
          </div>

          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Paid</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(statistics.total_paid || 0)}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(statistics.total_pending || 0)}
                      </p>
                    </div>
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(statistics.total_amount || 0)}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {statistics.overall_stats?.total_records || 0}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5 text-blue-600" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {user.role === 'super_admin' && (
                  <div className="lg:col-span-1">
                    <Label>School</Label>
                    <Select
                      value={selectedSchoolCode}
                      onValueChange={(v) => setSelectedSchoolCode(v)}
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
                  </div>
                )}

                <div className="lg:col-span-1">
                  <Label>Employee Type</Label>
                  <Select
                    value={filters.employee_type || 'all'}
                    onValueChange={(v) => setFilters({ ...filters, employee_type: v === 'all' ? '' : v, page: 1 })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="lg:col-span-1">
                  <Label>Status</Label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v, page: 1 })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="lg:col-span-1">
                  <Label>Salary Month</Label>
                  <Input
                    type="month"
                    value={filters.salary_month}
                    onChange={(e) => setFilters({ ...filters, salary_month: e.target.value, page: 1 })}
                    className="w-full"
                  />
                </div>

                <div className="lg:col-span-1 flex items-end gap-2">
                  <Button
                    onClick={() => loadSalaries()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters({ employee_type: '', status: '', salary_month: '', payment_method: '', page: 1, limit: 10 })
                    }
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Table */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Salary Records
                <Badge variant="secondary" className="ml-2">
                  {pagination.total}
                </Badge>
              </CardTitle>
            </CardHeader>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : salaries.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Employee</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Month</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Payment Date</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {salaries.map((salary) => (
                        <tr key={salary.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{salary.employee_name}</div>
                            <div className="text-sm text-gray-500">{salary.employee_email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={salary.employee_type === 'teacher' ? 'default' : 'secondary'}>
                              {salary.employee_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(salary.net_amount)}
                            </div>
                            {(salary.deductions > 0 || salary.bonuses > 0) && (
                              <div className="text-xs text-gray-500">
                                Base: {formatCurrency(salary.amount)}
                                {salary.deductions > 0 && ` - ${formatCurrency(salary.deductions)}`}
                                {salary.bonuses > 0 && ` + ${formatCurrency(salary.bonuses)}`}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(salary.salary_month)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={salary.status === 'paid' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {salary.status === 'paid' ? (
                                <><CheckCircle className="w-3 h-3 mr-1 inline" /> Paid</>
                              ) : (
                                <><Clock className="w-3 h-3 mr-1 inline" /> Pending</>
                              )}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {salary.payment_date ? formatDate(salary.payment_date) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedSalary(salary);
                                    setShowViewDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {salary.status === 'pending' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedSalary(salary);
                                      setPayFormData({
                                        payment_method: 'cash',
                                        payment_date: new Date().toISOString().split('T')[0],
                                        transaction_id: '',
                                        bank_account: '',
                                        notes: '',
                                      });
                                      setShowPayDialog(true);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditing(salary);
                                    setFormData({
                                      ...salary,
                                      salary_month: salary.salary_month ? salary.salary_month.split('T')[0].substring(0, 7) : '',
                                      payment_date: salary.payment_date ? salary.payment_date.split('T')[0] : '',
                                    });
                                    setShowDialog(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(salary.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash className="w-4 h-4 mr-2" />
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

                <PaginationControl
                  pagination={pagination}
                  filters={filters}
                  setFilters={setFilters}
                />
              </>
            ) : (
              <div className="text-center py-16">
                <DollarSign className="mx-auto text-gray-300 mb-4" size={80} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No salary records found
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {selectedSchoolCode || user.school_id
                    ? 'Get started by adding your first salary record.'
                    : 'Please select a school to view salary records.'}
                </p>
                {(selectedSchoolCode || user.school_id) && (
                  <Button
                    onClick={() => {
                      resetForm();
                      setEditing(null);
                      setFormData(prev => ({ ...prev, salary_month: getCurrentMonth() }));
                      setShowDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={20} className="mr-2" />
                    Add First Salary Record
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add/Edit Salary Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <>
                  <Pencil className="w-5 h-5 text-blue-600" />
                  Edit Salary Record
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-green-600" />
                  Add New Salary Record
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Update salary information.' : 'Create a new salary record for an employee.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user.role === 'super_admin' && (
                <div className="md:col-span-2">
                  <Label>School *</Label>
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
                </div>
              )}

              <div>
                <Label>Employee Type *</Label>
                <Select
                  onValueChange={(v) => {
                    setFormData({ ...formData, employee_type: v, employee_id: '', employee_name: '' });
                    loadEmployees(v);
                  }}
                  value={formData.employee_type}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Employee *</Label>
                <Select
                  onValueChange={handleEmployeeSelect}
                  value={formData.employee_id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter((e) => e.type === formData.employee_type)
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Salary Month *</Label>
                <Input
                  type="month"
                  value={formData.salary_month}
                  onChange={(e) => setFormData({ ...formData, salary_month: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Base Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Deductions</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                />
              </div>

              <div>
                <Label>Bonuses</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.bonuses}
                  onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Net Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(calculateNetAmount())}
                  </span>
                </div>
              </div>

              <div>
                <Label>Status *</Label>
                <Select
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                  value={formData.status}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === 'paid' && (
                <>
                  <div>
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                      value={formData.payment_method}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="online">Online Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Bank Account</Label>
                    <Input
                      placeholder="Account number"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Transaction ID</Label>
                    <Input
                      placeholder="Transaction reference"
                      value={formData.transaction_id}
                      onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editing ? 'Update Salary' : 'Create Salary Record'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditing(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Salary Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Salary as Paid</DialogTitle>
            <DialogDescription>
              Record payment for {selectedSalary?.employee_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Payment Method *</Label>
              <Select
                onValueChange={(v) => setPayFormData({ ...payFormData, payment_method: v })}
                value={payFormData.payment_method}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={payFormData.payment_date}
                onChange={(e) => setPayFormData({ ...payFormData, payment_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Transaction ID</Label>
              <Input
                placeholder="Transaction reference"
                value={payFormData.transaction_id}
                onChange={(e) => setPayFormData({ ...payFormData, transaction_id: e.target.value })}
              />
            </div>

            <div>
              <Label>Bank Account</Label>
              <Input
                placeholder="Account number"
                value={payFormData.bank_account}
                onChange={(e) => setPayFormData({ ...payFormData, bank_account: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Payment notes..."
                value={payFormData.notes}
                onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handlePaySalary}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Paid
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPayDialog(false);
                  setSelectedSalary(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Salary Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salary Details</DialogTitle>
          </DialogHeader>

          {selectedSalary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Employee Name</Label>
                  <p className="font-semibold">{selectedSalary.employee_name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Employee Type</Label>
                  <p className="font-semibold capitalize">{selectedSalary.employee_type}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Base Amount</Label>
                  <p className="font-semibold">{formatCurrency(selectedSalary.amount)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Deductions</Label>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(selectedSalary.deductions || 0)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Bonuses</Label>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(selectedSalary.bonuses || 0)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Net Amount</Label>
                  <p className="font-semibold text-blue-600 text-lg">
                    {formatCurrency(selectedSalary.net_amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Salary Month</Label>
                  <p className="font-semibold">{formatDate(selectedSalary.salary_month)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge
                    variant={selectedSalary.status === 'paid' ? 'default' : 'destructive'}
                  >
                    {selectedSalary.status}
                  </Badge>
                </div>
                {selectedSalary.payment_date && (
                  <>
                    <div>
                      <Label className="text-gray-500">Payment Date</Label>
                      <p className="font-semibold">{formatDate(selectedSalary.payment_date)}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Payment Method</Label>
                      <p className="font-semibold capitalize">
                        {selectedSalary.payment_method?.replace('_', ' ')}
                      </p>
                    </div>
                  </>
                )}
                {selectedSalary.bank_account && (
                  <div>
                    <Label className="text-gray-500">Bank Account</Label>
                    <p className="font-semibold">{selectedSalary.bank_account}</p>
                  </div>
                )}
                {selectedSalary.transaction_id && (
                  <div>
                    <Label className="text-gray-500">Transaction ID</Label>
                    <p className="font-semibold">{selectedSalary.transaction_id}</p>
                  </div>
                )}
              </div>
              {selectedSalary.notes && (
                <div>
                  <Label className="text-gray-500">Notes</Label>
                  <p className="text-sm text-gray-700">{selectedSalary.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </Layout>
  );
}

