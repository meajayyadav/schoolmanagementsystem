import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { pendingFeesApi, schoolsApi, systemCodesApi } from '@/api';
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
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertCircle,
  MessageSquare,
  QrCode,
  Download,
  Send,
  Users,
  IndianRupee,
  Phone,
  RefreshCw,
  Filter,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirm } from '@/hooks/use-confirm';

export default function PendingFees() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [schools, setSchools] = useState([]);
  const [selectedSchoolCode, setSelectedSchoolCode] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [upiInfo, setUpiInfo] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);

  // Load initial data
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadSchools();
    } else {
      setSelectedSchoolCode(user?.school_id || '');
    }
  }, [user]);

  useEffect(() => {
    if (selectedSchoolCode) {
      loadAcademicYears();
      loadClasses();
      loadUPIInfo();
    }
  }, [selectedSchoolCode]);

  useEffect(() => {
    if (selectedSchoolCode) {
      loadPendingFees();
    }
  }, [selectedSchoolCode, selectedAcademicYear, selectedMonth, selectedClass]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools((res.data || []).filter((s) => s && s.code));
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadAcademicYears = async () => {
    try {
      const schoolId = user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
      if (!schoolId) return;

      const res = await systemCodesApi.getAll({ school_id: schoolId });
      const academicYearCodes = res.data.filter(
        (c) => c.code === 'AY' && Array.isArray(c.items)
      );

      const academicYearOptions = academicYearCodes.length > 0
        ? academicYearCodes[0].items.map((item) => ({
            value: item.value || item.label,
            label: item.label,
          }))
        : [];

      setAcademicYears(academicYearOptions);
      if (academicYearOptions.length > 0 && !selectedAcademicYear) {
        setSelectedAcademicYear(academicYearOptions[0].value);
      }
    } catch (error) {
      console.error('Error loading academic years:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const params = {};
      if (user.role === 'super_admin' && selectedSchoolCode) {
        params.school_id = selectedSchoolCode;
      }
      
      const res = await pendingFeesApi.getClasses(params);
      setClasses(res.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadUPIInfo = async () => {
    try {
      const params = {};
      if (user.role === 'super_admin' && selectedSchoolCode) {
        params.school_id = selectedSchoolCode;
      }
      const res = await pendingFeesApi.getUPIInfo(params);
      setUpiInfo(res.data);
    } catch {
      // Silently fail
    }
  };

  const loadPendingFees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (user.role === 'super_admin' && selectedSchoolCode) {
        params.school_id = selectedSchoolCode;
      }
      if (selectedAcademicYear) {
        params.academic_year = selectedAcademicYear;
      }
      if (selectedMonth) {
        params.fee_month = selectedMonth;
      }
      if (selectedClass && selectedClass !== 'all') {
        params.class_id = selectedClass;
      }

      const res = await pendingFeesApi.getAll(params);
      setStudents(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load pending fees');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (studentId, checked) => {
    if (checked) {
      setSelectedStudents((prev) => [...prev, studentId]);
    } else {
      setSelectedStudents((prev) => prev.filter((id) => id !== studentId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudents(students.map((student) => student.student_id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSendReminder = async () => {
    if (selectedStudents.length === 0) {
      return toast.error('Please select at least one student');
    }

    const confirmed = await confirm({
      title: 'Send WhatsApp Reminders',
      description: `Are you sure you want to send reminders to ${selectedStudents.length} student(s)?`,
    });
    if (!confirmed) return;

    try {
      setSendingReminders(true);
      const params = {};
      if (user.role === 'super_admin' && selectedSchoolCode) {
        params.school_id = selectedSchoolCode;
      }

      const res = await pendingFeesApi.sendReminder({
        student_ids: selectedStudents,
        message: reminderMessage,
        ...params,
      });

      toast.success(`Reminders sent: ${res.data.success_count} successful, ${res.data.error_count} failed`);
      setShowReminderDialog(false);
      setSelectedStudents([]);
      setReminderMessage('');
      loadPendingFees();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleGenerateQR = async (studentId, feeIds, amount) => {
    try {
      const params = {
        student_id: studentId,
        fee_ids: Array.isArray(feeIds) ? feeIds.join(',') : feeIds,
        amount: amount,
      };
      if (user.role === 'super_admin' && selectedSchoolCode) {
        params.school_id = selectedSchoolCode;
      }

      const res = await pendingFeesApi.getQRCode(params);
      setQrCodeData(res.data);
      setShowQRDialog(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate QR code');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate total pending amount
  const totalPendingAmount = students.reduce((total, student) => total + student.total_pending, 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pending Fees Management
              </h1>
              <p className="text-gray-600 mt-2">
                View and manage pending fees, send reminders via WhatsApp
              </p>
            </div>

            <div className="flex items-center gap-3">
              {upiInfo && (
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">UPI ID</p>
                        <p className="text-sm font-semibold text-gray-900">{upiInfo.upi_id || 'Not Set'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() => {
                  if (students.length === 0) {
                    return toast.error('No students found');
                  }
                  setSelectedStudents(students.map((student) => student.student_id));
                  setShowReminderDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send size={20} className="mr-2" />
                Send Bulk Reminder
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5 text-blue-600" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {user.role === 'super_admin' && (
                  <div>
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
                          <SelectItem key={s.code} value={s.code || `school-${s.code}`}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Academic Year</Label>
                  <Select
                    value={selectedAcademicYear}
                    onValueChange={(v) => setSelectedAcademicYear(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Academic Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year.value} value={year.value || `year-${year.label}`}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Class</Label>
                  <Select
                    value={selectedClass}
                    onValueChange={(v) => setSelectedClass(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id || `class-${cls.name}`}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Fee Month</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-4 flex items-end gap-2">
                  <Button
                    onClick={loadPendingFees}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <IndianRupee className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pending Amount</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPendingAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Selected for Reminder</p>
                    <p className="text-2xl font-bold text-green-600">{selectedStudents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students List */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Students with Pending Fees
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {students.length} student(s) found • Total Pending: {formatCurrency(totalPendingAmount)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={students.length > 0 && selectedStudents.length === students.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <Checkbox disabled />
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Student</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Class</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Contact</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Pending Fees</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Total Amount</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.student_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedStudents.includes(student.student_id)}
                              onCheckedChange={(checked) =>
                                handleSelectStudent(student.student_id, checked)
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{student.student_name}</div>
                            {student.father_name && (
                              <div className="text-xs text-gray-500">Father: {student.father_name}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{student.class_name}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {student.mobile_number ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-700">{student.mobile_number}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No contact</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {student.fees.map((fee, idx) => (
                                <div key={idx} className="text-xs">
                                  <Badge variant="outline" className="mr-1">
                                    {fee.fee_type}
                                  </Badge>
                                  {formatCurrency(fee.amount)}
                                  {fee.fee_month && (
                                    <span className="text-gray-500 ml-1">
                                      ({new Date(fee.fee_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-red-600">
                              {formatCurrency(student.total_pending)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedStudents([student.student_id]);
                                  setShowReminderDialog(true);
                                }}
                                disabled={!student.mobile_number}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Remind
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleGenerateQR(
                                    student.student_id,
                                    student.fees.map((f) => f.fee_id),
                                    student.total_pending
                                  )
                                }
                              >
                                <QrCode className="w-4 h-4 mr-1" />
                                QR
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <AlertCircle className="mx-auto text-gray-300 mb-4" size={80} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Fees</h3>
                  <p className="text-gray-500">All fees have been paid for the selected criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Send WhatsApp Reminder
            </DialogTitle>
            <DialogDescription>
              Send reminder to {selectedStudents.length} selected student(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Custom Message (Optional)</Label>
              <Textarea
                placeholder="Leave empty to use default message..."
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Default message includes student name, pending amount, and UPI payment details
              </p>
            </div>

            {upiInfo && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">School UPI ID:</p>
                <p className="text-lg font-bold text-blue-600">{upiInfo.upi_id}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSendReminder}
                disabled={sendingReminders}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sendingReminders ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Reminders
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReminderDialog(false);
                  setReminderMessage('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              Payment QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this QR code to pay using any UPI app
            </DialogDescription>
          </DialogHeader>

          {qrCodeData && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-gray-200">
                <img
                  src={qrCodeData.qr_code}
                  alt="UPI QR Code"
                  className="w-64 h-64"
                />
              </div>

              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student:</span>
                  <span className="text-sm font-semibold">{qrCodeData.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(qrCodeData.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">UPI ID:</span>
                  <span className="text-sm font-semibold">{qrCodeData.upi_id}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">UPI Payment Link:</p>
                <p className="text-xs font-mono text-blue-600 break-all">{qrCodeData.upi_link}</p>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeData.upi_link);
                  toast.success('UPI link copied to clipboard');
                }}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Copy UPI Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </Layout>
  );
}