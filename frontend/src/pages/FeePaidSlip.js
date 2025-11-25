import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { feesApi, schoolsApi, classesApi, systemCodesApi, studentsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Download,
  Search,
  Filter,
  FileText,
  IndianRupee,
  Users,
  CreditCard,
  Calendar,
  School,
  Loader2,
  Eye,
  BarChart3,
  Printer,
  User
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

export default function FeePaidSlips() {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeSlips, setFeeSlips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Filters
  // Filters
const [filters, setFilters] = useState({
  school_id: 'all',
  class_id: 'all',
  student_id: 'all',
  fee_month: 'all',
  academic_year: 'all',
  payment_method: 'all', // You can remove this too if you want
  start_date: '',
  end_date: '',
  page: 1,
  limit: 10
});

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [academicYears, setAcademicYears] = useState([]);
  const [feeMonths, setFeeMonths] = useState([]);

  // Load schools for super admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadSchools();
    } else {
      setFilters(prev => ({ ...prev, school_id: user?.school_id || 'all' }));
    }
  }, [user]);

  // Load system codes and classes when school is selected
  useEffect(() => {
    if (filters.school_id && filters.school_id !== 'all') {
      loadSystemCodes();
      loadClasses();
    } else {
      setClasses([]);
      setStudents([]);
      setAcademicYears([]);
      setFeeMonths([]);
    }
  }, [filters.school_id]);

  // Load students when class is selected
  useEffect(() => {
    if (filters.class_id && filters.class_id !== 'all' && filters.school_id && filters.school_id !== 'all') {
      loadClassStudents();
    } else {
      setStudents([]);
    }
  }, [filters.class_id, filters.school_id]);

  // Load fee slips when filters change
  useEffect(() => {
    loadFeeSlips();
    if (user.role === 'super_admin') {
      loadStats();
    }
  }, [filters]);

  const loadSchools = async () => {
    try {
      const response = await schoolsApi.getAll();
      setSchools(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadSystemCodes = async () => {
    try {
      const schoolId = user.role === 'super_admin' ? filters.school_id : user.school_id;
      if (schoolId === 'all') return;
      
      const res = await systemCodesApi.getAll({ school_id: schoolId });
      
      // Academic Years
      const ayCodes = res.data.filter(c => c.code === "AY" && Array.isArray(c.items));
      const academicYearOptions = ayCodes.length > 0 
        ? ayCodes[0].items.map(item => ({
            value: item.value || item.label,
            label: item.label
          }))
        : [];

      // Fee Months
      const fmnthCodes = res.data.filter(c => c.code === "FMNTH" && Array.isArray(c.items));
      const feeMonthOptions = fmnthCodes.length > 0 
        ? fmnthCodes[0].items.map(item => ({
            value: item.value || item.label,
            label: item.label
          }))
        : [];

      setAcademicYears(academicYearOptions);
      setFeeMonths(feeMonthOptions);

    } catch (error) {
      console.error('Error loading system codes:', error);
      toast.error('Failed to load academic years and months');
    }
  };

  const loadClasses = async () => {
    try {
      if (filters.school_id === 'all') return;
      
      const response = await classesApi.getBySchool(filters.school_id);
      
      let classesData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          classesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          classesData = response.data.data;
        } else if (Array.isArray(response.data.classes)) {
          classesData = response.data.classes;
        }
      }
      
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
      setClasses([]);
    }
  };

  const loadClassStudents = async () => {
    try {
      setStudentsLoading(true);
      const params = { 
        school_id: filters.school_id,
        class_id: filters.class_id,
        page: 1,
        limit: 100
      };
      
      const response = await studentsApi.getAll(params);
      
      let studentsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          studentsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          studentsData = response.data.data;
        } else if (Array.isArray(response.data.students)) {
          studentsData = response.data.students;
        }
      }
      
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };
const loadFeeSlips = async () => {
  try {
    setLoading(true);
    
    // Prepare API params - convert 'all' to empty string for API
    const apiParams = {
      school_id: filters.school_id === 'all' ? '' : filters.school_id,
      class_id: filters.class_id === 'all' ? '' : filters.class_id,
      student_id: filters.student_id === 'all' ? '' : filters.student_id,
      fee_month: filters.fee_month === 'all' ? '' : filters.fee_month,
      academic_year: filters.academic_year === 'all' ? '' : filters.academic_year,
      payment_method: filters.payment_method === 'all' ? '' : filters.payment_method,
      page: filters.page,
      limit: filters.limit,
      start_date: filters.start_date,
      end_date: filters.end_date
    };
    
    console.log('🔍 Sending API request with params:', apiParams);
    
    const response = await feesApi.getSlips(apiParams);
    console.log('✅ Full API response:', response);
    console.log('📦 Response data:', response.data);
    
    // Handle Axios response structure - data is in response.data
    if (response.data && response.data.success) {
      const responseData = response.data;
      
      // The fee slips array is in responseData.data
      const feeSlipsData = Array.isArray(responseData.data) ? responseData.data : [];
      console.log('📄 Fee slips data to display:', feeSlipsData);
      console.log('📊 Number of fee slips:', feeSlipsData.length);
      
      setFeeSlips(feeSlipsData);
      
      // Set pagination from response
      setPagination({
        page: responseData.page || filters.page,
        limit: responseData.limit || filters.limit,
        total: responseData.total || 0,
        pages: responseData.totalPages || 0
      });
      
      console.log('🎯 Pagination set:', {
        page: responseData.page || 1,
        total: responseData.total || 0,
        pages: responseData.totalPages || 0
      });
    } else {
      console.error('❌ API returned unsuccessful response:', response.data);
      setFeeSlips([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      });
    }
  } catch (error) {
    console.error('💥 Error loading fee slips:', error);
    console.error('🔍 Error details:', error.response?.data || error.message);
    toast.error('Failed to load fee slips');
    setFeeSlips([]);
  } finally {
    setLoading(false);
  }
};
const loadStats = async () => {
  try {
    setStatsLoading(true);
    const response = await feesApi.getSlipStats({
      school_id: filters.school_id === 'all' ? '' : filters.school_id,
      start_date: filters.start_date,
      end_date: filters.end_date
    });
    
    // Handle Axios response structure
    if (response.data && response.data.success) {
      setStats(response.data.data);
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  } finally {
    setStatsLoading(false);
  }
};

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));

    // Reset student selection when class changes
    if (key === 'class_id') {
      setFilters(prev => ({
        ...prev,
        student_id: 'all'
      }));
    }
  };

 const handleDownload = async (slipId, studentName) => {
  try {
    setDownloading(slipId);
    
    try {
      // Try to get the fee slip data
      const response = await feesApi.getSlipById(slipId);
      
      // Handle Axios response structure
      if (response.data && response.data.success) {
        const slip = response.data.data;
        
        if (slip) {
          handlePrint(slip);
          toast.success('Opening print preview for fee slip');
        } else {
          toast.error('Fee slip data not found');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (apiError) {
      console.error('API error:', apiError);
      // Fallback: Use the slip data from the table
      const slip = feeSlips.find(s => s.id === slipId);
      if (slip) {
        handlePrint(slip);
        toast.success('Opening print preview for fee slip');
      } else {
        toast.error('Could not load fee slip details');
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to process fee slip');
  } finally {
    setDownloading(null);
  }
};

  const handlePrint = (slip) => {
    const printWindow = window.open('', '_blank');
    const feeMonth = slip.fee_month || 'N/A';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Slip - ${slip.student_id?.name || slip.student_name || 'Student'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
            .school-name { color: #1e40af; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: bold; margin: 20px 0; text-decoration: underline; }
            .section { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #1e40af; color: white; }
            .total { background-color: #1e40af; color: white; font-weight: bold; }
            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
            .info-table { width: 100%; margin: 10px 0; }
            .info-table td { padding: 5px 0; }
            @media print { 
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${slip.school_id?.name || 'School'}</div>
            <div>${slip.school_id?.address || ''}</div>
            <div>Phone: ${slip.school_id?.phone || 'N/A'} | Email: ${slip.school_id?.email || 'N/A'}</div>
            <div class="title">FEE PAYMENT RECEIPT</div>
          </div>
          
          <div class="section">
            <table class="info-table">
              <tr>
                <td><strong>Receipt No:</strong> ${slip.receipt_number || `FEE-${slip.id?.slice(-6) || 'N/A'}`}</td>
                <td><strong>Payment Date:</strong> ${slip.payment_date ? new Date(slip.payment_date).toLocaleDateString() : 'N/A'}</td>
              </tr>
              <tr>
                <td><strong>Academic Year:</strong> ${slip.academic_year || 'N/A'}</td>
                <td><strong>Fee Month:</strong> ${feeMonth}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <strong>STUDENT INFORMATION</strong>
            <table class="info-table">
              <tr>
                <td><strong>Student Name:</strong> ${slip.student_id?.name || slip.student_name || 'N/A'}</td>
                <td><strong>Admission No:</strong> ${slip.student_id?.admission_number || 'N/A'}</td>
              </tr>
              <tr>
                <td><strong>Class:</strong> ${slip.student_id?.class_id?.name || slip.class_name || 'N/A'} ${slip.student_id?.class_id?.section || ''}</td>
                <td><strong>Roll No:</strong> ${slip.student_id?.roll_number || 'N/A'}</td>
              </tr>
              <tr>
                <td><strong>Father's Name:</strong> ${slip.student_id?.father_name || 'N/A'}</td>
                <td></td>
              </tr>
            </table>
          </div>

          <div class="section">
            <strong>FEE BREAKDOWN</strong>
            <table class="table">
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${slip.fee_breakdown ? Object.entries({
                  'Monthly Fee': slip.fee_breakdown.monthly_fee || 0,
                  'Admission Fee': slip.fee_breakdown.admission_fee || 0,
                  'Registration Fee': slip.fee_breakdown.registration_fee || 0,
                  'Transport': slip.fee_breakdown.transport || 0,
                  'Books': slip.fee_breakdown.books || 0,
                  'Uniform': slip.fee_breakdown.uniform || 0,
                  'Fine': slip.fee_breakdown.fine || 0,
                  'Others': slip.fee_breakdown.others || 0,
                  'Previous Balance': slip.fee_breakdown.previous_balance || 0,
                }).filter(([_, amount]) => amount > 0).map(([label, amount]) => `
                  <tr>
                    <td>${label}</td>
                    <td>${amount.toFixed(2)}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>Total Fee</td>
                    <td>${slip.amount?.toFixed(2) || '0.00'}</td>
                  </tr>
                `}
                ${slip.fee_breakdown?.discount_percent > 0 ? `
                  <tr>
                    <td>Discount (${slip.fee_breakdown.discount_percent}%)</td>
                    <td>-${((slip.amount * slip.fee_breakdown.discount_percent) / 100).toFixed(2)}</td>
                  </tr>
                ` : ''}
                <tr class="total">
                  <td>TOTAL AMOUNT</td>
                  <td>₹${slip.amount?.toFixed(2) || '0.00'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <strong>PAYMENT INFORMATION</strong>
            <table class="info-table">
              <tr>
                <td><strong>Payment Method:</strong> ${(slip.payment_method || '').toUpperCase()}</td>
                <td><strong>Amount Paid:</strong> ₹${slip.amount?.toFixed(2) || '0.00'}</td>
              </tr>
            </table>
          </div>

          <div class="signature">
            <div>
              <div>_________________________</div>
              <div>School Stamp & Signature</div>
            </div>
            <div>
              <div>_________________________</div>
              <div>Parent/Guardian Signature</div>
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            This is a computer generated receipt. No signature required.
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #1e40af; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Print Receipt
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const paymentMethodIcons = {
    cash: '💵',
    card: '💳',
    upi: '📱',
    cheque: '🏦',
    bank_transfer: '🏛️'
  };

  const safeSchools = Array.isArray(schools) ? schools : [];
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeFeeSlips = Array.isArray(feeSlips) ? feeSlips : [];
console.log('🔄 Current safeFeeSlips:', safeFeeSlips);

  console.log('Current fee slips:', safeFeeSlips);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fee Paid Slips</h1>
            <p className="text-gray-600">
              View and download student fee payment receipts
            </p>
          </div>
        </div>

        {/* Statistics Cards - Only for Super Admin */}
        {user.role === 'super_admin' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Collected</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        `₹${(stats.overview?.totalAmount || 0).toLocaleString()}`
                      )}
                    </p>
                  </div>
                  <IndianRupee className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Slips</p>
                    <p className="text-2xl font-bold text-green-900">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        (stats.overview?.totalSlips || 0).toLocaleString()
                      )}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Average Amount</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        `₹${(stats.overview?.averageAmount || 0).toFixed(0)}`
                      )}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Payment Methods</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        (stats.paymentMethods?.length || 0)
                      )}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Card */}
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Filter size={20} />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* School Selector for Super Admin */}
              {user.role === 'super_admin' && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    School
                  </Label>
                  <Select 
                    value={filters.school_id} 
                    onValueChange={(value) => handleFilterChange('school_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All schools" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schools</SelectItem>
                      {safeSchools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Class Selector */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Class
                </Label>
                <Select 
                  value={filters.class_id} 
                  onValueChange={(value) => handleFilterChange('class_id', value)}
                  disabled={!filters.school_id || filters.school_id === 'all'}
                >
                  <SelectTrigger>
                    {safeClasses.length === 0 ? (
                      <div className="text-gray-500">No classes available</div>
                    ) : (
                      <SelectValue placeholder="Select class" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {safeClasses.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} {classItem.section && `- ${classItem.section}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student Selector */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Student
                </Label>
                <Select 
                  value={filters.student_id} 
                  onValueChange={(value) => handleFilterChange('student_id', value)}
                  disabled={!filters.class_id || filters.class_id === 'all' || studentsLoading}
                >
                  <SelectTrigger>
                    {studentsLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading students...
                      </div>
                    ) : safeStudents.length === 0 ? (
                      <div className="text-gray-500">No students available</div>
                    ) : (
                      <SelectValue placeholder="Select student" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {safeStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{student.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {student.admission_number}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Academic Year */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Academic Year
                </Label>
                <Select 
                  value={filters.academic_year} 
                  onValueChange={(value) => handleFilterChange('academic_year', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {academicYears.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Fee Month */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fee Month
                </Label>
                <Select 
                  value={filters.fee_month} 
                  onValueChange={(value) => handleFilterChange('fee_month', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {feeMonths.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            

              {/* Date Range */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  End Date
                </Label>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Info Card (when a specific student is selected) */}
        {filters.student_id && filters.student_id !== 'all' && safeStudents.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      {safeStudents.find(s => s.id === filters.student_id)?.name}
                    </h3>
                    <p className="text-blue-700">
                      Class: {safeClasses.find(c => c.id === filters.class_id)?.name} 
                      {safeClasses.find(c => c.id === filters.class_id)?.section && ` - ${safeClasses.find(c => c.id === filters.class_id)?.section}`}
                    </p>
                    <p className="text-sm text-blue-600">
                      Admission No: {safeStudents.find(s => s.id === filters.student_id)?.admission_number}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
                  {safeFeeSlips.length} Fee Slip{safeFeeSlips.length !== 1 ? 's' : ''} Found
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

   {/* Fee Slips Table */}
<Card>
  <CardHeader className="bg-blue-50 border-b border-blue-200">
    <CardTitle className="flex items-center gap-2 text-blue-800">
      <FileText size={20} />
      Paid Fee Slips
      <Badge variant="outline" className="bg-blue-100 text-blue-800">
        {pagination.total} Records
      </Badge>
    </CardTitle>
  </CardHeader>
  <CardContent className="p-0">
    {loading ? (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading fee slips...</span>
      </div>
    ) : safeFeeSlips.length === 0 ? (
      <div className="text-center py-12">
        <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Fee Slips Found</h3>
        <p className="text-gray-500">
          {filters.student_id && filters.student_id !== 'all' 
            ? `No paid fee slips found for the selected student with current filters`
            : `No paid fee slips match your current filters`
          }
        </p>
        {/* <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
          <p className="text-sm text-gray-600">
            <strong>Current Filters:</strong><br />
            School: {filters.school_id}<br />
            Class: {filters.class_id}<br />
            Student: {filters.student_id}<br />
            Fee Month: {filters.fee_month}<br />
            Academic Year: {filters.academic_year}
          </p>
        </div> */}
      </div>
    ) : (
      <>
        {/* Success Message */}
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm text-green-700">
                ✅ Found {safeFeeSlips.length} fee slip(s)
              </p>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              {user.role === 'super_admin' && <TableHead>School</TableHead>}
              <TableHead>Fee Month</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeFeeSlips.map((slip, index) => {
              console.log(`📋 Rendering slip ${index}:`, {
                id: slip.id,
                student: slip.student_id,
                amount: slip.amount,
                fee_month: slip.fee_month
              });
              
              return (
                <TableRow key={slip.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {slip.receipt_number || `FEE-${slip.id?.slice(-6) || 'N/A'}`}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold">
                        {slip.student_id?.name || 'Unknown Student'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Adm: {slip.student_id?.admission_number || 'N/A'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600">
                      {slip.student_id?.class_id?.name || 'Unknown Class'} 
                      {slip.student_id?.class_id?.section && ` - ${slip.student_id.class_id.section}`}
                    </p>
                  </TableCell>
                  {user.role === 'super_admin' && (
                    <TableCell>
                      <p className="font-medium text-blue-600">
                        {slip.school_id?.name || 'Unknown School'}
                      </p>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{slip.fee_month || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-700">
                        ₹{slip.amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <span>{paymentMethodIcons[slip.payment_method] || '💳'}</span>
                      <span className="capitalize">{slip.payment_method || 'N/A'}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {slip.payment_date ? new Date(slip.payment_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(slip)}
                        className="flex items-center gap-1"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(slip.id, slip.student_id?.name || 'student')}
                        disabled={downloading === slip.id}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {downloading === slip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="border-t p-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                    className={pagination.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {[...Array(pagination.pages)].map((_, i) => (
                  <PaginationItem key={i + 1}>
                    <PaginationLink
                      onClick={() => handleFilterChange('page', i + 1)}
                      isActive={pagination.page === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handleFilterChange('page', Math.min(pagination.pages, pagination.page + 1))}
                    className={pagination.page === pagination.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </>
    )}
  </CardContent>
</Card>
      </div>
    </Layout>
  );
}