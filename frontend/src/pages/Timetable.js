import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, PlusCircle } from 'lucide-react';
import { timetableApi, classesApi, schoolsApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';

export default function Timetable() {
  const { user } = useAuth();

  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [timetables, setTimetables] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    class_id: '',
    day: '',
    subject: '',
    start_time: '',
    end_time: '',
    teacher_name: '',
  });

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

  // 🎓 Load classes for selected school (or user’s school)
  useEffect(() => {
  const fetchClasses = async () => {
  const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
  if (!schoolId) {
    setClasses([]); // reset dropdown when no school selected
    return;
  }

  try {
    const res = await classesApi.getAll({ school_id: schoolId });
    // ✅ fix: your data is nested inside res.data.data
    setClasses(res.data?.data || []);
    console.log('Fetched classes:', res.data?.data);
  } catch (err) {
    console.error('fetchClasses error', err);
    setClasses([]);
  }
};

  fetchClasses();
}, [user, selectedSchool]);



  // 🕒 Fetch timetable
  useEffect(() => {
    const fetchTimetable = async () => {
      setLoading(true);
      try {
        if (user.role === 'super_admin') {
          if (selectedSchool && selectedClass) {
            const res = await timetableApi.getByClass(selectedClass, { school_id: selectedSchool });
            setTimetables(res.data || []);
          } else if (selectedSchool === '') {
            const res = await timetableApi.getAll();
            setTimetables(res.data || []);
          } else {
            setTimetables([]);
          }
        } else {
          if (!selectedClass) {
            setTimetables([]);
            return;
          }
          const res = await timetableApi.getByClass(selectedClass, { school_id: user.school_id });
          setTimetables(res.data || []);
        }
      } catch (err) {
        console.error('fetchTimetable error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, [user, selectedSchool, selectedClass]);

  // ➕ Add timetable entry
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const schoolId = user.role === 'super_admin' ? selectedSchool : user.school_id;
      await timetableApi.create({
        ...formData,
        class_id: selectedClass || formData.class_id,
        school_id: schoolId,
      });
      setShowDialog(false);
      setFormData({ class_id: '', day: '', subject: '', start_time: '', end_time: '', teacher_name: '' });
      const res = await timetableApi.getByClass(selectedClass, { school_id: schoolId });
      setTimetables(res.data || []);
    } catch (err) {
      console.error('createTimetable error', err);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="timetable-page">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Timetable</h1>
            <p className="text-gray-600 mt-2">Manage class schedules and timetables</p>
          </div>

          <div className="flex items-center gap-4">
            {/* 🏫 Super Admin: School Selector */}
            {user.role === 'super_admin' && (
              <Select onValueChange={setSelectedSchool} value={selectedSchool}>
                <SelectTrigger className="w-48">
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
  <SelectTrigger className="w-48">
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
            {['teacher', 'school_admin', 'super_admin'].includes(user.role) && (
              <Button onClick={() => setShowDialog(true)}>
                <PlusCircle className="mr-2" /> Add Timetable
              </Button>
            )}
          </div>
        </div>

        {/* 📅 Table or Empty State */}
        <div className="card mt-6">
          {loading ? (
            <p className="text-center text-gray-500 py-6">Loading timetable...</p>
          ) : timetables.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-gray-900">No timetable found</h3>
              <p className="text-gray-500">
                Select a class or add timetable entries to view schedules.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    {user.role === 'super_admin' && <th className="p-3 text-left">School</th>}
                    <th className="p-3 text-left">Class</th>
                    <th className="p-3 text-left">Day</th>
                    <th className="p-3 text-left">Subject</th>
                    <th className="p-3 text-left">Start Time</th>
                    <th className="p-3 text-left">End Time</th>
                    <th className="p-3 text-left">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {timetables.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-gray-50">
                      {user.role === 'super_admin' && <td className="p-3">{row.school_name || '-'}</td>}
                      <td className="p-3">{row.class_name || row.class_id}</td>
                      <td className="p-3">{row.day}</td>
                      <td className="p-3">{row.subject}</td>
                      <td className="p-3">{row.start_time}</td>
                      <td className="p-3">{row.end_time}</td>
                      <td className="p-3">{row.teacher_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ➕ Add Timetable Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Timetable Entry</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {user.role === 'super_admin' && (
                <Select
                  onValueChange={(v) => setSelectedSchool(v)}
                  value={selectedSchool}
                >
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
              )}

              <Select
                onValueChange={(v) => setFormData({ ...formData, class_id: v })}
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

              <Input
                placeholder="Day (e.g., Monday)"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                required
              />
              <Input
                placeholder="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
              <Input
                type="time"
                placeholder="Start Time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
              <Input
                type="time"
                placeholder="End Time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
              <Input
                placeholder="Teacher Name"
                value={formData.teacher_name}
                onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                required
              />

              <Button type="submit" className="w-full">
                Save Entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
