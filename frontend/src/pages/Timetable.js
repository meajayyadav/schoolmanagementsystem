import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, PlusCircle, Clock, BookOpen, User, Edit3, Trash2 } from 'lucide-react';
import { timetableApi, classesApi, schoolsApi, teachersApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Timetable() {
  const { user } = useAuth();

  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);

  const [formData, setFormData] = useState({
    class_id: '',
    day: '',
    subject: '',
    start_time: '',
    end_time: '',
    teacher_id: '',
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
    '12:00-1:00', '1:00-2:00', '2:00-3:00', '3:00-4:00'
  ];

  // 🏫 Load all schools (super admin only)
  useEffect(() => {
    if (user.role === 'super_admin') {
      (async () => {
        try {
          const res = await schoolsApi.getAll();
          setSchools(res.data || []);
        } catch (err) {
          console.error('fetchSchools error', err);
        }
      })();
    }
  }, [user]);

  // 🎓 Load classes for selected school (or user's school)
  useEffect(() => {
    const fetchClasses = async () => {
      const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
      if (!schoolId) {
        setClasses([]);
        return;
      }

      try {
        const res = await classesApi.getAll({ school_id: schoolId });
        setClasses(res.data?.data || []);
      } catch (err) {
        console.error('fetchClasses error', err);
        setClasses([]);
      }
    };

    fetchClasses();
  }, [user, selectedSchool]);

  // 👨‍🏫 Load teachers for selected school
  useEffect(() => {
    const fetchTeachers = async () => {
      const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
      if (!schoolId) {
        setTeachers([]);
        return;
      }

      try {
        const res = await teachersApi.getAll({ school_id: schoolId });
        setTeachers(res.data?.data || res.data || []);
      } catch (err) {
        console.error('fetchTeachers error', err);
        setTeachers([]);
      }
    };

    fetchTeachers();
  }, [user, selectedSchool]);

  // 🕒 Fetch timetable
  useEffect(() => {
    const fetchTimetable = async () => {
      setLoading(true);
      try {
        let res;
        if (user.role === 'super_admin') {
          if (selectedSchool && selectedClass) {
            res = await timetableApi.getByClass(selectedClass, { school_id: selectedSchool });
          } else if (selectedSchool === '') {
            res = await timetableApi.getAll();
          }
        } else {
          if (selectedClass) {
            res = await timetableApi.getByClass(selectedClass, { school_id: user.school_id });
          }
        }
        
        if (res?.data) {
          setTimetables(res.data);
        } else {
          setTimetables([]);
        }
      } catch (err) {
        console.error('fetchTimetable error', err);
        setTimetables([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, [user, selectedSchool, selectedClass]);

  // 👨‍🏫 Fetch teachers based on selected class in the dialog form
  const fetchTeachersByClass = async (classId) => {
    if (!classId) {
      setTeachers([]);
      return;
    }

    try {
      const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
      
      const res = await teachersApi.getAll({ 
        school_id: schoolId,
        class_id: classId 
      });
      
      setTeachers(res.data?.data || res.data || []);
    } catch (err) {
      console.error('fetchTeachersByClass error', err);
      
      // Fallback to all school teachers
      try {
        const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
        const res = await teachersApi.getAll({ school_id: schoolId });
        setTeachers(res.data?.data || res.data || []);
      } catch (fallbackErr) {
        console.error('fallback fetchTeachers error', fallbackErr);
        setTeachers([]);
      }
    }
  };

  // ➕ Add/Update timetable entry
 // ➕ Add/Update timetable entry
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
    const selectedTeacher = teachers.find(t => t.id === formData.teacher_id);
    
    // Fix teacher name handling
    let teacherName = '';
    if (selectedTeacher) {
      // Handle different teacher name formats
      if (selectedTeacher.name) {
        teacherName = selectedTeacher.name;
      } else if (selectedTeacher.first_name && selectedTeacher.last_name) {
        teacherName = `${selectedTeacher.first_name} ${selectedTeacher.last_name}`;
      } else if (selectedTeacher.first_name) {
        teacherName = selectedTeacher.first_name;
      }
    }

    const payload = {
      ...formData,
      class_id: formData.class_id,
      school_id: schoolId,
      teacher_name: teacherName,
    };

    if (editingPeriod) {
      await timetableApi.update(editingPeriod.id, payload);
    } else {
      await timetableApi.create(payload);
      toast.success('Period created successfully');
    }
    
    setShowDialog(false);
    setEditingPeriod(null);
    setFormData({ class_id: '', day: '', subject: '', start_time: '', end_time: '', teacher_id: '' });
    
    // Refresh timetable
    const res = await timetableApi.getByClass(selectedClass, { school_id: schoolId });
    setTimetables(res.data || []);
  } catch (err) {
    console.error('saveTimetable error', err);
    if (!editingPeriod) {
      toast.error('Failed to create period');
    }
  }
};

  // ✏️ Edit period
  const handleEdit = (period) => {
    setEditingPeriod(period);
    setFormData({
      class_id: period.class_id,
      day: period.day,
      subject: period.subject,
      start_time: period.start_time,
      end_time: period.end_time,
      teacher_id: period.teacher_id,
    });
    setShowDialog(true);
  };

  // 🗑️ Delete period
  const handleDelete = async (periodId) => {
    if (!confirm('Are you sure you want to delete this period?')) return;
    
    try {
      await timetableApi.delete(periodId);
      // ❌ No toast for delete operations
      
      // Refresh timetable
      const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
      const res = await timetableApi.getByClass(selectedClass, { school_id: schoolId });
      setTimetables(res.data || []);
    } catch (err) {
      console.error('deleteTimetable error', err);
      // ❌ No toast for delete operations
    }
  };

  // 🎯 Get period for a specific day and time
  const getPeriod = (day, timeSlot) => {
    const [startTime] = timeSlot.split('-');
    return timetables.find(period => 
      period.day === day && 
      period.start_time.startsWith(startTime)
    );
  };

  // Format time for display
  const formatTime = (time) => {
    if (!time) return '';
    return time.length === 5 ? time : `${time}:00`;
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (showDialog && !editingPeriod) {
      setFormData({
        class_id: '',
        day: '',
        subject: '',
        start_time: '',
        end_time: '',
        teacher_id: '',
      });
      setTeachers([]);
    }
  }, [showDialog, editingPeriod]);

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="timetable-page">
        <div className="page-header flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Class Timetable
            </h1>
            <p className="text-gray-600 mt-2">Manage and view class schedules efficiently</p>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto">
            {/* 🏫 Super Admin: School Selector */}
            {user.role === 'super_admin' && (
              <Select onValueChange={setSelectedSchool} value={selectedSchool}>
                <SelectTrigger className="w-full lg:w-48 bg-white">
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 🎓 Class Selector */}
            <Select onValueChange={setSelectedClass} value={selectedClass}>
              <SelectTrigger className="w-full lg:w-48 bg-white">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(classes) && classes.length > 0 ? (
                  classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.grade}-{cls.section})
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500">No classes found</div>
                )}
              </SelectContent>
            </Select>

            {['school_admin', 'super_admin'].includes(user.role) && (
              <Button 
                onClick={() => setShowDialog(true)} 
                className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Period
              </Button>
            )}
          </div>
        </div>

        {/* Class Info Banner */}
        {selectedClass && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-semibold text-blue-800 text-lg">
                  {classes.find(cls => cls.id === selectedClass)?.name} 
                  <span className="text-blue-600 text-sm ml-2">
                    (Grade {classes.find(cls => cls.id === selectedClass)?.grade}-{classes.find(cls => cls.id === selectedClass)?.section})
                  </span>
                </h3>
                {/* <p className="text-blue-600 text-sm">
                  Total Periods: {timetables.length} | School: {user.role === 'super_admin' 
                    ? schools.find(s => s.id === selectedSchool)?.name 
                    : 'Your School'
                  }
                </p> */}
                <p className="text-blue-600 text-sm">
                  Total Periods: {timetables.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-700 text-sm font-medium">
                  {days.length} Days × {timeSlots.length} Periods
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 📅 Professional Timetable Grid */}
        <div className="card mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading timetable...</span>
            </div>
          ) : !selectedClass ? (
            <div className="text-center py-16">
              <CalendarDays className="mx-auto text-gray-300 mb-4" size={80} />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Class</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Please select a class from the dropdown above to view the timetable.
              </p>
            </div>
          ) : timetables.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays className="mx-auto text-gray-300 mb-4" size={80} />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Timetable Found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                No timetable entries found for this class. Add periods to create the schedule.
              </p>
              {['teacher', 'school_admin', 'super_admin'].includes(user.role) && (
                <Button 
                  onClick={() => setShowDialog(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Create First Period
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto p-6">
              {/* Professional Timetable Header */}
              <div className="grid grid-cols-8 gap-3 mb-4 min-w-[900px]">
                <div className="col-span-1">
                  <div className="p-4 bg-gray-100 rounded-lg text-center">
                    <Clock className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                    <span className="font-semibold text-gray-700 text-sm">Time Slots</span>
                  </div>
                </div>
                {days.map(day => (
                  <div key={day} className="text-center p-4 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg shadow-sm">
                    <span className="font-bold text-sm">{day}</span>
                  </div>
                ))}
              </div>

              {/* Professional Timetable Body */}
              <div className="space-y-3 min-w-[900px]">
                {timeSlots.map((timeSlot, timeIndex) => (
                  <div key={timeSlot} className="grid grid-cols-8 gap-3">
                    {/* Time Slot Header */}
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-center">
                        <span className="text-sm font-semibold text-gray-700 block">{timeSlot}</span>
                        <span className="text-xs text-gray-500">Period {timeIndex + 1}</span>
                      </div>
                    </div>

                    {/* Periods for each day */}
                    {days.map(day => {
                      const period = getPeriod(day, timeSlot);
                      return (
                        <div
                          key={`${day}-${timeSlot}`}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 min-h-[100px] flex flex-col justify-between ${
                            period 
                              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-sm hover:shadow-md' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {period ? (
                            <div className="text-center">
                              <div className="flex justify-between items-start mb-2">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                                {['teacher', 'school_admin', 'super_admin'].includes(user.role) && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleEdit(period)}
                                      className="text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(period.id)}
                                      className="text-red-600 hover:text-red-800 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="font-bold text-sm text-gray-800 mb-2">{period.subject}</div>
                              <div className="text-xs text-gray-600 flex items-center justify-center gap-1 mb-1">
  <User className="h-3 w-3" />
  {period.teacher_name && period.teacher_name !== 'undefined undefined' 
    ? period.teacher_name 
    : 'Teacher not assigned'
  }
</div>
                              <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                                {formatTime(period.start_time)} - {formatTime(period.end_time)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-gray-400 h-full flex flex-col justify-center">
                              <div className="text-xs mb-2">Free Period</div>
                              {['teacher', 'school_admin', 'super_admin'].includes(user.role) && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, day, start_time: timeSlot.split('-')[0] }));
                                    setShowDialog(true);
                                  }}
                                  className="text-xs h-6"
                                >
                                  <PlusCircle size={12} className="mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Timetable Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-blue-600">{timetables.length}</div>
                    <div className="text-sm text-gray-600">Total Periods</div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-green-600">
                      {days.length * timeSlots.length - timetables.length}
                    </div>
                    <div className="text-sm text-gray-600">Free Periods</div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Set(timetables.map(p => p.subject)).size}
                    </div>
                    <div className="text-sm text-gray-600">Subjects</div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-orange-600">
                      {new Set(timetables.map(p => p.teacher_name)).size}
                    </div>
                    <div className="text-sm text-gray-600">Teachers</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ➕ Add/Edit Timetable Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingPeriod(null);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                {editingPeriod ? 'Edit Period' : 'Add New Period'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {user.role === 'super_admin' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">School</label>
                  <Select onValueChange={(v) => setSelectedSchool(v)} value={selectedSchool}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select School" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Class</label>
                <Select 
                  onValueChange={async (v) => {
                    setFormData({ ...formData, class_id: v, teacher_id: '' });
                    await fetchTeachersByClass(v);
                  }} 
                  value={formData.class_id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.grade}-{cls.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Day</label>
                <Select onValueChange={(v) => setFormData({ ...formData, day: v })} value={formData.day}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Subject</label>
                <Input
                  placeholder="Enter subject name"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Start Time</label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">End Time</label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Teacher</label>
                <Select 
  onValueChange={(v) => setFormData({ ...formData, teacher_id: v })} 
  value={formData.teacher_id}
  disabled={!formData.class_id || teachers.length === 0}
>
  <SelectTrigger className="w-full">
    <SelectValue 
      placeholder={
        !formData.class_id 
          ? "Select a class first" 
          : teachers.length === 0 
            ? "No teachers available" 
            : "Select Teacher"
      } 
    />
  </SelectTrigger>
  <SelectContent>
    {teachers.length > 0 ? (
      teachers.map((teacher) => {
        // Handle different teacher name formats
        const teacherName = teacher.name || 
                           (teacher.first_name && teacher.last_name ? `${teacher.first_name} ${teacher.last_name}` : 
                           teacher.first_name || 'Unknown Teacher');
        
        return (
          <SelectItem key={teacher.id} value={teacher.id}>
            {teacherName}
            {teacher.subject && ` - ${teacher.subject}`}
          </SelectItem>
        );
      })
    ) : (
      <div className="px-3 py-2 text-gray-500">
        {formData.class_id ? "No teachers assigned to this class" : "Please select a class first"}
      </div>
    )}
  </SelectContent>
</Select>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                disabled={!formData.teacher_id || !formData.class_id}
              >
                {editingPeriod ? 'Update Period' : 'Save Period'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}