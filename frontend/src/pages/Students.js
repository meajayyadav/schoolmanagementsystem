// import { useEffect, useState, useRef } from 'react';
import React, { useState, useEffect, useRef } from "react";
import Layout from '@/components/Layout';
import { studentsApi, schoolsApi, classesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Plus, Users, Search, MoreVertical, Printer, Pencil, Trash, 
  Filter, Download, Upload, School, BookOpen, User, Calendar,
  Mail, Phone, MapPin, IdCard,Receipt,CheckCircle,IndianRupeeIcon
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirm } from '@/hooks/use-confirm';

const PaginationControl = ({ pagination, filters, setFilters }) => {
  const pageSizes = [10, 25, 50, 100];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t bg-gray-50/50">
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

export default function Students() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolCode, setSelectedSchoolCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({ total: 0, active: 0, new: 0 });
const [showBill, setShowBill] = useState(false);
const billRef = useRef();
  const handlePrintBill = useReactToPrint({ 
    content: () => billRef.current,
    onAfterPrint: () => toast.success('Bill printed successfully!')
  });
  const [formData, setFormData] = useState({
    name: '',
    roll_number: '',
    grade_level: '',
    class_section: '',
    enrollment_date: '',
    father_name: '',
    date_of_birth: '',
    school_id: '',
  });

  const idCardRef = useRef();
  const handlePrint = useReactToPrint({ content: () => idCardRef.current });
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ name: '', roll_number: '', page: 1, limit: 10 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        if (user?.school_id) {
          const res = await schoolsApi.getOne(user.school_id);
          setSchoolName(res.data?.name || 'Unknown School');
        } else if (user?.role === 'super_admin') {
          setSchoolName('All Schools (Super Admin)');
        } else {
          setSchoolName('Unknown School');
        }
      } catch (err) {
        console.error('Failed to fetch school name:', err);
        setSchoolName('Unknown School');
      }
    };
    fetchSchool();
  }, [user]);

  useEffect(() => {
    if (user?.role === 'super_admin') loadSchools();
  }, []);

  useEffect(() => {
    if (user?.role === 'school_admin' || user?.role === 'teacher') {
      loadStudents();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'super_admin' && selectedSchoolCode) {
      loadStudents();
    }
  }, [selectedSchoolCode]);

  useEffect(() => {
    if (user?.role === 'school_admin' || (user?.role === 'super_admin' && selectedSchoolCode)) {
      loadClasses();
    }
  }, [user, selectedSchoolCode]);

  const loadClasses = async () => {
    try {
      const params = {};
      if (user.role === 'super_admin' && selectedSchoolCode) {
        params.school_id = selectedSchoolCode;
      } else if (user.role === 'school_admin') {
        params.school_id = user.school_id;
      }
      const res = await classesApi.getAll(params);
      setClasses(res.data.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load classes');
    }
  };

  const handlePrintAndClose = () => {
    handlePrintBill();
    setTimeout(() => {
      setShowBill(false);
      navigate("/students");
    }, 1000);
  };
  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      if (user.role === 'super_admin') {
        if (!selectedSchoolCode) {
          toast.error('Select a school first');
          setLoading(false);
          return;
        }
        params.school_id = selectedSchoolCode;
      }
      const res = await studentsApi.getAll(params);
      const data = Array.isArray(res.data.data) ? res.data.data : res.data;
      setStudents(data);
      setPagination({
        total: res.data.total || data.length,
        totalPages: Math.ceil((res.data.total || data.length) / filters.limit),
      });
      
      // Update stats
      setStats({
        total: data.length,
        active: data.filter(s => s.status === 'active').length,
        new: data.filter(s => {
          const enrollDate = new Date(s.enrollment_date);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return enrollDate > thirtyDaysAgo;
        }).length
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([key, val]) => val && fd.append(key, val));
      if (imageFile) fd.append('picture', imageFile);
      if (user.role === 'super_admin' && !formData.school_id)
        return toast.error('Select a school before adding student');

      await studentsApi.create(fd);
      toast.success('Student added successfully');
      setShowDialog(false);
      resetForm();
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add student');
    }
  };

  const handleEdit = (student) => {
    navigate('/admission', { state: { student } });
  };

  const handleDelete = async (studentId) => {
    const confirmed = await confirm({
      title: 'Delete Student',
      description: 'Are you sure you want to delete this student? This action cannot be undone.',
    });
    if (!confirmed) return;
    try {
      await studentsApi.delete(studentId);
      toast.success('Student deleted successfully');
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete student');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      roll_number: '',
      grade_level: '',
      class_section: '',
      enrollment_date: '',
      father_name: '',
      date_of_birth: '',
      school_id: '',
    });
    setImageFile(null);
  };

  const filteredStudents = students.filter(student => {
    if (activeTab === 'all') return true;
    if (activeTab === 'new') {
      const enrollDate = new Date(student.enrollment_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return enrollDate > thirtyDaysAgo;
    }
    return student.status === activeTab;
  });
// Printable Bill Component
// Printable Bill Component - FIXED VERSION
const PrintableBill = React.forwardRef(({ student, schoolName, admissionFee, monthlyFee }, ref) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const total = (admissionFee || 0) + (monthlyFee || 0);

  return (
    <div ref={ref} className="bg-white p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{schoolName}</h1>
        <p className="text-gray-600 text-lg">Official Fee Receipt</p>
        <p className="text-gray-500 text-sm">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Student Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Student Information</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Name:</span> {student?.name}</p>
            <p><span className="font-medium">Roll No:</span> {student?.roll_number}</p>
            <p><span className="font-medium">Class:</span> {student?.grade_level} - {student?.class_section}</p>
            <p><span className="font-medium">Father's Name:</span> {student?.father_name}</p>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Payment Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Receipt No:</span> {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            <p><span className="font-medium">Academic Year:</span> {new Date().getFullYear()}-{new Date().getFullYear() + 1}</p>
            <p><span className="font-medium">Payment Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Description</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3 border-b">Admission Fee</td>
              <td className="px-4 py-3 text-right border-b">{formatCurrency(admissionFee)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 border-b">Monthly Fee (First Month)</td>
              <td className="px-4 py-3 text-right border-b">{formatCurrency(monthlyFee)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-4 py-3 font-semibold">Total Amount</td>
              <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-4 text-center">
        <div className="grid grid-cols-2 gap-8 text-xs text-gray-500 mb-4">
          <div>
            <p className="font-medium">Student Signature</p>
            <div className="h-12 border-b border-gray-300 mt-2"></div>
          </div>
          <div>
            <p className="font-medium">School Authority</p>
            <div className="h-12 border-b border-gray-300 mt-2"></div>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          This is a computer generated receipt. No signature required.
        </p>
      </div>
    </div>
  );
});
  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Student Management</h1>
            <p className="text-gray-600 mt-1">Manage student enrollment, records, and information</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Download size={16} />
              Export
            </Button>
            
            {/* Add Bulk Upload Button */}
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => navigate('/bulkUpload')}
            >
              <Upload size={16} />
              Bulk Upload
            </Button>
            
            {(user.role === 'super_admin' || user.role === 'school_admin') && (
              <Button onClick={() => navigate('/admission')} className="gap-2">
                <Plus size={16} />
                New Admission
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Students</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Students</p>
                  <p className="text-2xl font-bold text-green-900">{stats.active}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">New This Month</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.new}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter size={18} />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Search by Name</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Student name..."
                      value={filters.name}
                      onChange={(e) => setFilters({ ...filters, name: e.target.value, page: 1 })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Roll Number</label>
                  <Input
                    placeholder="Roll number"
                    value={filters.roll_number}
                    onChange={(e) => setFilters({ ...filters, roll_number: e.target.value, page: 1 })}
                  />
                </div>
              </div>

              {user.role === 'super_admin' && (
                <div className="space-y-2 lg:w-64">
                  <label className="text-sm font-medium text-gray-700">School</label>
                  <Select onValueChange={setSelectedSchoolCode} value={selectedSchoolCode}>
                    <SelectTrigger>
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

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, page: 1 }));
                    loadStudents();
                  }}
                  className="gap-2"
                >
                  <Search size={16} />
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFilters({ name: '', roll_number: '', page: 1, limit: 10 })}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Student Records
              <Badge variant="secondary">{pagination.total} students</Badge>
            </CardTitle>
            <CardDescription>
              Manage and view all student information in one place
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Students</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="new">New This Month</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="animate-pulse bg-gray-200 h-12 w-12 rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="animate-pulse bg-gray-200 h-4 w-1/4 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-4 w-1/3 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStudents.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700 w-16">#</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Student</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Class</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Roll No</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Section</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Admission Date</th>
                        <th className="px-6 py-4 text-right font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredStudents.map((student, index) => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 text-gray-600">
                            {(filters.page - 1) * filters.limit + index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {student.picture ? (
                                <img
                                  src={`${process.env.REACT_APP_BACKEND_URL}${student.picture}`}
                                  alt={student.name}
                                  className="h-10 w-10 rounded-full object-cover border"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{student.name}</p>
                                <p className="text-sm text-gray-500">{student.father_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {student.class_name}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{student.roll_number}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary">{student.class_section}</Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {student.enrollment_date
                              ? new Date(student.enrollment_date).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {(user.role === 'super_admin' || user.role === 'school_admin') && (
                                  <DropdownMenuItem onClick={() => handleEdit(student)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Student
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setShowIdCard(true);
                                  }}
                                >
                                  <IdCard className="mr-2 h-4 w-4" />
                                  ID Card
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setSelectedStudent(student);
                                     setShowBill(true);
                                  }}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print Details
                                </DropdownMenuItem>
                                {(user.role === 'super_admin' || user.role === 'school_admin') && (
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(student.id)}
                                    className="text-red-600"
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
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
              <div className="text-center py-12">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No students found</h3>
                <p className="text-gray-500 mb-4">
                  {filters.name || filters.roll_number 
                    ? 'Try adjusting your search terms' 
                    : 'Get started by adding your first student'
                  }
                </p>
                {(user.role === 'super_admin' || user.role === 'school_admin') && (
                  <Button onClick={() => navigate('/admission')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ID Card Dialog */}
      <Dialog open={showIdCard} onOpenChange={setShowIdCard}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div ref={idCardRef} className="bg-white">
            {/* ID Card Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 text-center">
              <School className="h-8 w-8 mx-auto mb-2" />
              <h2 className="text-xl font-bold">{schoolName}</h2>
              <p className="text-blue-100 text-sm">Official Student ID Card</p>
            </div>

            {/* Student Photo and Info */}
            {selectedStudent && (
              <div className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  {selectedStudent.picture ? (
                    <img
                      src={`${process.env.REACT_APP_BACKEND_URL}${selectedStudent.picture}`}
                      alt="Student"
                      className="h-24 w-24 rounded-full border-4 border-blue-100 object-cover mb-4"
                    />
                  ) : (
                    <div className="h-24 w-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full border-4 border-blue-100 flex items-center justify-center mb-4">
                      <User className="h-12 w-12 text-blue-600" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedStudent.name}</h3>
                  <p className="text-gray-600 mb-2">Roll No: {selectedStudent.roll_number}</p>
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    Grade {selectedStudent.grade_level} - {selectedStudent.class_section}
                  </div>
                </div>

                {/* Student Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Father's Name:</span>
                    <span className="font-medium">{selectedStudent.father_name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Date of Birth:</span>
                    <span className="font-medium">
                      {selectedStudent.date_of_birth
                        ? new Date(selectedStudent.date_of_birth).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Enrollment Date:</span>
                    <span className="font-medium">
                      {selectedStudent.enrollment_date
                        ? new Date(selectedStudent.enrollment_date).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Validity */}
                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-xs text-gray-500">
                    Valid for Academic Year {new Date().getFullYear()}-{new Date().getFullYear() + 1}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Issued by {schoolName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t">
            <Button onClick={handlePrint} className="w-full gap-2">
              <Printer size={16} />
              Print ID Card
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Printable Bill Dialog */}
     {/* Printable Bill Dialog */}
<Dialog open={showBill} onOpenChange={setShowBill}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <IndianRupeeIcon className="h-5 w-5" />
        Fee Receipt
      </DialogTitle>
    </DialogHeader>
    
    <div className="border rounded-lg p-4 bg-gray-50">
      <PrintableBill 
        ref={billRef}
        student={selectedStudent} // Pass the entire student object
        schoolName={schoolName}
        admissionFee={parseFloat(selectedStudent?.admission_fee) || 0}
        monthlyFee={parseFloat(selectedStudent?.monthly_fee) || 0}
      />
    </div>
    
    <DialogFooter className="flex gap-2">
      <Button onClick={handlePrintBill} className="gap-2">
        <Printer className="h-4 w-4" />
        Print Receipt
      </Button>
      <Button onClick={handlePrintAndClose} variant="outline" className="gap-2">
        <CheckCircle className="h-4 w-4" />
        Print & Close
      </Button>
      <Button variant="outline" onClick={() => {
        setShowBill(false);
        navigate("/students");
      }}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
      <ConfirmDialog />
    </Layout>
  );
}
