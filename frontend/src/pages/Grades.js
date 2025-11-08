// src/pages/Grades.js
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { gradesApi, studentsApi, classesApi, schoolsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList } from 'lucide-react';
export default function Grades() {
  const { user } = useAuth();

  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);

  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const [formData, setFormData] = useState({
    student_id: '',
    class_id: '',
    subject: '',
    score: '',
    max_score: '',
    grade: '',
    remarks: '',
    date: '',
    school_id: '',
  });

  const [filters, setFilters] = useState({
    student_id: '',
    subject: '',
    date: '',
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Load schools (for super_admin)
  useEffect(() => {
    if (user?.role === 'super_admin') loadSchools();
    else {
      // for school_admin, set selectedSchoolId to their school to drive student/class loads
      setSelectedSchoolId(user?.school_id || '');
    }
  }, [user]);

  // load students & classes whenever selectedSchoolId changes
  useEffect(() => {
    if (selectedSchoolId) {
      loadStudents();
      loadClasses();
      loadGrades(); // load grades for default filters when school set
    } else if (user.role === 'super_admin') {
      // super_admin with no selection: show empty list
      setGrades([]);
      setLoading(false);
    }
  }, [selectedSchoolId]);

  // reload grades when filters.page changes
  useEffect(() => {
    if (!user) return;
    // for school_admin or selected school
    if (user.role === 'school_admin' || (user.role === 'super_admin' && selectedSchoolId)) {
      loadGrades();
    }
  }, [filters.page]);

  async function loadSchools() {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch (err) {
      toast.error('Failed to load schools');
    }
  }

  async function loadStudents() {
    try {
      const params = user.role === 'super_admin' ? { school_id: selectedSchoolId } : {};
      const res = await studentsApi.getAll(params);
      // your studentsApi likely returns { data: [...] } or array - normalise:
      const list = res.data?.data || res.data || [];
      setStudents(list);
    } catch (err) {
      toast.error('Failed to load students');
    }
  }

  async function loadClasses() {
    try {
      const params = user.role === 'super_admin' ? { school_id: selectedSchoolId } : {};
      const res = await classesApi.getAll(params);
      const list = res.data?.data || res.data || [];
      setClasses(list);
    } catch (err) {
      toast.error('Failed to load classes');
    }
  }

  async function loadGrades() {
    try {
      // Don't call if super_admin and no school selected
      if (user.role === 'super_admin' && !selectedSchoolId) {
        setGrades([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const params = {
        student_id: filters.student_id,
        subject: filters.subject,
        date: filters.date,
        page: filters.page,
        limit: filters.limit,
      };

      if (user.role === 'super_admin') params.school_id = selectedSchoolId;

      const res = await gradesApi.getAll(params);
      const data = res.data?.data || res.data || [];
      setGrades(data);
      setPagination({
        total: res.data?.total || data.length,
        totalPages: res.data?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setFilters({ ...filters, page: newPage });
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        student_id: formData.student_id,
        class_id: formData.class_id,
        subject: formData.subject,
        score: Number(formData.score),
        max_score: Number(formData.max_score),
        grade: formData.grade || null,
        remarks: formData.remarks || '',
        date: formData.date,
      };
      if (user.role === 'super_admin') {
        if (!formData.school_id) return toast.error('Select a school for this grade');
        payload.school_id = formData.school_id;
      }
      await gradesApi.create(payload);
      toast.success('Grade added');
      setShowDialog(false);
      setFormData({
        student_id: '',
        class_id: '',
        subject: '',
        score: '',
        max_score: '',
        grade: '',
        remarks: '',
        date: '',
        school_id: selectedSchoolId || '',
      });
      loadGrades();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to add grade');
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-6" data-testid="grades-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Grades</h1>
            <p className="text-gray-600">Manage student grades and assessments</p>
          </div>

          <Button onClick={() => setShowDialog(true)}>
            <Plus size={18} className="mr-2" />
            Add Grade
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
          {user.role === 'super_admin' && (
            <Select
              value={selectedSchoolId}
              onValueChange={(v) => {
                setSelectedSchoolId(v);
                // when super admin picks school, set school_id for form default
                setFormData((f) => ({ ...f, school_id: v }));
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={filters.student_id}
            onValueChange={(v) => handleFilterChange('student_id', v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  {st.name} ({st.roll_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Subject"
            value={filters.subject}
            onChange={(e) => handleFilterChange('subject', e.target.value)}
            className="w-48"
          />

          <Input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="w-40"
          />

          <Button variant="outline" onClick={() => { setFilters({ ...filters, page: 1 }); loadGrades(); }}>
            <Search size={16} className="mr-2" /> Apply Filters
          </Button>
        </div>

        {/* Grades Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-56">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : grades.length > 0 ? (
            <>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Student</th>
                    <th className="px-4 py-3 text-left font-semibold">Class</th>
                    <th className="px-4 py-3 text-left font-semibold">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold">Score</th>
                    <th className="px-4 py-3 text-left font-semibold">Grade</th>
                    <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{g.date}</td>
                      <td className="px-4 py-3">{g.student_id}</td>
                      <td className="px-4 py-3">{g.class_id}</td>
                      <td className="px-4 py-3">{g.subject}</td>
                      <td className="px-4 py-3">
                        {g.score}/{g.max_score}
                      </td>
                      <td className="px-4 py-3">{g.grade || '-'}</td>
                      <td className="px-4 py-3">{g.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-50 border-t gap-2">
                <span className="text-sm text-gray-600">
                  Showing {grades.length} of {pagination.total} records
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
                    onChange={(e) => handlePageChange(Number(e.target.value))}
                    className="w-16 text-center"
                  />
                  <span className="text-sm text-gray-500">/ {pagination.totalPages}</span>
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
  <ClipboardList className="mx-auto text-gray-400 mb-4" size={64} />
  <h3 className="text-lg font-semibold text-gray-900">No grades found</h3>
  <p className="text-gray-500">
    Add grades or select a student to view their performance records.
  </p>
</div>
          )}
        </div>
      </div>

      {/* Add Grade Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Grade</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddGrade} className="space-y-3">
            {user.role === 'super_admin' && (
              <Select
                value={formData.school_id}
                onValueChange={(v) => {
                  setFormData({ ...formData, school_id: v });
                  setSelectedSchoolId(v); // load students/classes for this school
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={formData.student_id}
              onValueChange={(v) => setFormData({ ...formData, student_id: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name} ({st.roll_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formData.class_id}
              onValueChange={(v) => setFormData({ ...formData, class_id: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />

            <div className="flex gap-2">
              <Input
                placeholder="Score"
                type="number"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                required
              />
              <Input
                placeholder="Max Score"
                type="number"
                value={formData.max_score}
                onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
                required
              />
            </div>

            <Input
              placeholder="Grade (A/B/C)"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            />

            <Input
              placeholder="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />

            <Input
              placeholder="Remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />

            <Button type="submit" className="w-full">
              Add Grade
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
