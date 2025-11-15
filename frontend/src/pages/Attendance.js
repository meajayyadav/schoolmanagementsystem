import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { attendanceApi, schoolsApi, classesApi, studentsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarDays, Check, X, Clock, Users, School, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Attendance() {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState({});
  const [existingAttendance, setExistingAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0 });

  // Calculate stats whenever attendance changes
  useEffect(() => {
    if (Object.keys(attendance).length > 0) {
      const present = Object.values(attendance).filter(status => status === 'Present').length;
      const absent = Object.values(attendance).filter(status => status === 'Absent').length;
      const leave = Object.values(attendance).filter(status => status === 'Leave').length;
      setStats({ present, absent, leave });
    }
  }, [attendance]);

  // Load schools for super admin
  useEffect(() => {
    if (user.role === 'super_admin') loadSchools();
  }, [user]);

  // Load classes
  useEffect(() => {
    if (user.role === 'school_admin' || user.role === 'teacher' || (user.role === 'super_admin' && selectedSchool)) {
      loadClasses();
    }
  }, [selectedSchool, user]);

  // Load students + attendance
  useEffect(() => {
    if (selectedClass) loadStudentsAndAttendance();
  }, [selectedClass, date]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadClasses = async () => {
    try {
      const params = {};
      if (user.role === 'super_admin') params.school_id = selectedSchool;
      const res = await classesApi.getAll(params);
      setClasses(res.data.data || res.data || []);
      setSelectedClass(''); // Reset class when school changes
    } catch {
      toast.error('Failed to load classes');
    }
  };

  const loadStudentsAndAttendance = async () => {
    try {
      setLoading(true);
      const params = { class_id: selectedClass, date };
      if (user.role === 'super_admin') params.school_id = selectedSchool;

      const [studentsRes, attendanceRes] = await Promise.all([
        studentsApi.getAll({ class_id: selectedClass, ...(user.role === 'super_admin' && { school_id: selectedSchool }) }),
        attendanceApi.getAll(params),
      ]);

      const list = studentsRes.data.data || studentsRes.data || [];
      const attendanceList = attendanceRes.data.data || attendanceRes.data || [];

      setStudents(list);

      if (attendanceList.length > 0) {
        setExistingAttendance(attendanceList);
        setAttendance({});
        // Calculate stats for existing attendance
        const present = attendanceList.filter(a => a.status === 'Present').length;
        const absent = attendanceList.filter(a => a.status === 'Absent').length;
        const leave = attendanceList.filter(a => a.status === 'Leave').length;
        setStats({ present, absent, leave });
      } else {
        const attObj = {};
        list.forEach((s) => (attObj[s.id] = 'Present'));
        setAttendance(attObj);
        setExistingAttendance([]);
      }
    } catch (err) {
      toast.error('Failed to load students or attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleMark = (studentId, status) => {
    setAttendance({ ...attendance, [studentId]: status });
  };

  const handleSubmit = async () => {
    try {
      if (!selectedClass || !date) {
        toast.error('Please select class and date');
        return;
      }

      setLoading(true);
      for (const student of students) {
        const payload = {
          student_id: student.id,
          class_id: selectedClass,
          date,
          status: attendance[student.id],
        };
        if (user.role === 'super_admin') payload.school_id = selectedSchool;
        await attendanceApi.create(payload);
      }

      toast.success('Attendance marked successfully!');
      await loadStudentsAndAttendance();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Leave':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusVariant = (status, currentStatus) => {
    return attendance[status] === currentStatus ? 'default' : 'outline';
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="attendance-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Attendance Management</h1>
            <p className="text-gray-600 mt-1">Mark and view student attendance records</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <School className="h-5 w-5" />
              Select Filters
            </CardTitle>
            <CardDescription>Choose school, class and date to manage attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              {user.role === 'super_admin' && (
                <div className="space-y-2 flex-1 min-w-0">
                  <label className="text-sm font-medium text-gray-700">School</label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
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

              <div className="space-y-2 flex-1 min-w-0">
                <label className="text-sm font-medium text-gray-700">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSchool && user.role === 'super_admin'}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        {(selectedClass && (existingAttendance.length > 0 || Object.keys(attendance).length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-green-50 to-green-50/50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Present</p>
                    <p className="text-2xl font-bold text-green-900">{stats.present}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-50 to-red-50/50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Absent</p>
                    <p className="text-2xl font-bold text-red-900">{stats.absent}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">On Leave</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.leave}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Table */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5" />
              Student Attendance
              {selectedClass && (
                <Badge variant="secondary" className="ml-2">
                  {students.length} Students
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : existingAttendance.length > 0 ? (
              // =================== EXISTING ATTENDANCE TABLE ===================
              <>
                <div className="bg-green-50 border-b px-6 py-3 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-medium">
                    Attendance already marked for {new Date(date).toLocaleDateString()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Roll No.</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Student Name</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {existingAttendance.map((a) => {
                        const student = students.find((s) => s.id === a.student_id);
                        return (
                          <tr key={a.student_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{student?.roll_number || '-'}</td>
                            <td className="px-6 py-4 text-gray-800">{student?.name}</td>
                            <td className="px-6 py-4 text-center">
                              <Badge className={getStatusColor(a.status)}>
                                {a.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : students.length > 0 ? (
              // =================== NEW ATTENDANCE TABLE ===================
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Roll No.</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Student Name</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-700">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{student.roll_number || '-'}</td>
                          <td className="px-6 py-4 text-gray-800">{student.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2 flex-wrap">
                              <Button
                                variant={getStatusVariant(student.id, 'Present')}
                                size="sm"
                                onClick={() => handleMark(student.id, 'Present')}
                                className="gap-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Present
                              </Button>
                              <Button
                                variant={getStatusVariant(student.id, 'Absent')}
                                size="sm"
                                onClick={() => handleMark(student.id, 'Absent')}
                                className="gap-1"
                              >
                                <X className="h-3.5 w-3.5"  />
                                Absent
                              </Button>
                              <Button
                                variant={getStatusVariant(student.id, 'Leave')}
                                size="sm"
                                onClick={() => handleMark(student.id, 'Leave')}
                                className="gap-1"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                Leave
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Ready to save attendance for {students.length} students
                  </div>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="min-w-32"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Attendance'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              // =================== EMPTY STATE ===================
              <div className="text-center py-12 px-6">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedClass ? 'No students found' : 'Select a class'}
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  {selectedClass 
                    ? 'There are no students enrolled in this class yet.' 
                    : 'Choose a class from the filters above to view students and mark attendance.'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
