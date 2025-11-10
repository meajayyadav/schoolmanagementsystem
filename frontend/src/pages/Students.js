import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { studentsApi, schoolsApi,classesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Users, Search, MoreVertical, Printer, Pencil, Trash } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from 'react-router-dom';//for navigating one page to another on button click
const PaginationControl = ({ pagination, filters, setFilters }) => {
  const pageSizes = [5, 10, 15, 25, 50];

  return (
    <div className="flex items-center justify-end gap-4 py-3">
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

      <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
        <Button
          variant="outline"
          size="sm"
          disabled={filters.page === 1}
          onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
        >
          Prev
        </Button>

        <span>
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
  );
};
export default function Students() {
  const { user } = useAuth();
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
  if (
    user?.role === 'school_admin' ||
    (user?.role === 'super_admin' && selectedSchoolCode)
  ) {
    loadStudents();
  }
}, [selectedSchoolCode, filters.page, filters.limit, filters.name, filters.roll_number]);
useEffect(() => {
  if (
    user?.role === 'school_admin' ||
    (user?.role === 'super_admin' && selectedSchoolCode)
  ) {
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
  // const handleEdit = (student) => {
  //   setSelectedStudent(student);

  //   // ✅ Safely prefill ISO date strings into "YYYY-MM-DD"
  //   const formattedDOB = student.date_of_birth
  //     ? new Date(student.date_of_birth).toISOString().split('T')[0]
  //     : '';
  //   const formattedEnroll = student.enrollment_date
  //     ? new Date(student.enrollment_date).toISOString().split('T')[0]
  //     : '';

  //   setFormData({
  //     name: student.name || '',
  //     roll_number: student.roll_number || '',
  //     grade_level: student.grade_level || '',
  //     class_section: student.class_section || '',
  //     enrollment_date: formattedEnroll,
  //     father_name: student.father_name || '',
  //     date_of_birth: formattedDOB,
  //     school_id: student.school_id || '',
  //   });

  //   setShowEditDialog(true);
  // };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([key, val]) => val && fd.append(key, val));
      if (imageFile) fd.append('picture', imageFile);

      await studentsApi.update(selectedStudent.id, fd);
      toast.success('Student updated successfully');
      setShowEditDialog(false);
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update student');
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentsApi.delete(studentId);
      toast.success('Student deleted');
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
const getClassName = (id) => {
  return classes.find((cls) => cls.id === id)?.name || '-';
};
const navigate = useNavigate();//navigation one page to another


  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">🎓 Students</h1>
            <p className="text-gray-600">Manage student enrollment and details</p>
          </div>
          {/* <Button onClick={() => setShowDialog(true)}>
            <Plus size={20} className="mr-2" /> Add Student
          </Button> */}
          <Button onClick={() => navigate('/admission')}>
  <Plus size={20} className="mr-2" /> Add Student
</Button>

        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <Input
              placeholder="Search by name"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value, page: 1 })}
              className="w-48"
            />
          </div>
          <Input
            placeholder="Roll number"
            value={filters.roll_number}
            onChange={(e) => setFilters({ ...filters, roll_number: e.target.value, page: 1 })}
            className="w-40"
          />
          {user.role === 'super_admin' && (
            <Select onValueChange={setSelectedSchoolCode} value={selectedSchoolCode}>
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
          <Button variant="outline" onClick={loadStudents}>Apply</Button>
          <Button variant="ghost" onClick={() => setFilters({ name: '', roll_number: '', page: 1, limit: 10 })}>
            Clear
          </Button>
        </div>

        {/* Table */}
     {/* Table */}
<div className="bg-white rounded-lg shadow-sm border overflow-hidden">
  {/* ✅ Top Pagination (Right-Aligned) */}
  <div className="flex justify-between items-center px-4 border-b bg-gray-50">
    <h2 className="text-base font-medium text-gray-800 py-3">
      Student Records
    </h2>
    <PaginationControl
      pagination={pagination}
      filters={filters}
      setFilters={setFilters}
    />
  </div>

  {loading ? (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ) : students.length ? (
    <>
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left w-16">S.No</th>
            <th className="px-4 py-3 text-left">Student Name</th>
            <th className="px-4 py-3 text-left">Class</th>
            <th className="px-4 py-3 text-left">Roll No</th>
            {/* <th className="px-4 py-3 text-left">Grade</th> */}
            <th className="px-4 py-3 text-left">Section</th>
            <th className="px-4 py-3 text-left">Enrollment</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, index) => (
            <tr key={s.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3">{(filters.page - 1) * filters.limit + index + 1}</td>
              <td className="px-4 py-3">{s.name}</td>
            <td className="px-4 py-3">{getClassName(s.class_id)}</td>

              <td className="px-4 py-3">{s.roll_number}</td>
              {/* <td className="px-4 py-3">{s.grade_level}</td> */}
              <td className="px-4 py-3">{s.class_section}</td>
              <td className="px-4 py-3">
                {s.enrollment_date
                  ? new Date(s.enrollment_date).toLocaleDateString()
                  : '-'}
              </td>
              <td className="px-4 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(s)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedStudent(s);
                        setShowIdCard(true);
                      }}
                    >
                      <Printer className="mr-2 h-4 w-4" /> Print ID Card
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600"
                    >
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Bottom Summary (optional) */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
        <p>
          Showing {(filters.page - 1) * filters.limit + 1}–
          {Math.min(filters.page * filters.limit, pagination.total)} of{' '}
          {pagination.total} records
        </p>
      </div>
    </>
  ) : (
    <div className="text-center py-12">
      <Users className="mx-auto text-gray-400 mb-4" size={64} />
      <h3 className="text-lg font-semibold text-gray-900">No students found</h3>
      <p className="text-gray-500">Try changing filters or add a student.</p>
    </div>
  )}
</div>



      </div>

      {/* Add/Edit Student Dialog */}
      <Dialog open={showDialog || showEditDialog} onOpenChange={() => { setShowDialog(false); setShowEditDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? 'Edit Student' : 'Add Student'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={showEditDialog ? handleUpdate : handleSubmit} className="space-y-4">
            {user.role === 'super_admin' && (
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
            )}
            <Input placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input placeholder="Roll Number" value={formData.roll_number} onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })} required />
            <Input placeholder="Father's Name" value={formData.father_name} onChange={(e) => setFormData({ ...formData, father_name: e.target.value })} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Date</label>
              <Input
                type="date"
                value={formData.enrollment_date}
                onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Grade" value={formData.grade_level} onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })} />
              <Input placeholder="Section" value={formData.class_section} onChange={(e) => setFormData({ ...formData, class_section: e.target.value })} />
            </div>

            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
            <Button type="submit" className="w-full">
              {showEditDialog ? 'Update Student' : 'Add Student'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ID Card */}
      {/* ID Card */}
<Dialog open={showIdCard} onOpenChange={setShowIdCard}>
  <DialogContent className="max-w-md">
    <DialogHeader><DialogTitle>Student ID Card</DialogTitle></DialogHeader>

    {selectedStudent && (
      <div ref={idCardRef} className="bg-white border rounded-xl shadow p-6 text-center">
        {/* ✅ Display school name fetched from backend */}
        <div className="bg-blue-600 text-white py-2 rounded-t-lg">
          <h2 className="text-lg font-bold">🏫 {schoolName}</h2>
          <p className="text-sm">Student ID Card</p>
        </div>

        <div className="mt-4 flex flex-col items-center">
          {selectedStudent.picture ? (
            <img
              src={`${process.env.REACT_APP_BACKEND_URL}${selectedStudent.picture}`}
              alt="Student"
              className="h-24 w-24 rounded-full mb-3 object-cover"
            />
          ) : (
            <div className="h-24 w-24 bg-gray-200 rounded-full mb-3" />
          )}
          <h3 className="font-semibold text-xl">{selectedStudent.name}</h3>
          <p className="text-gray-600">Roll: {selectedStudent.roll_number}</p>
          <p className="text-gray-600">
            Grade {selectedStudent.grade_level} - {selectedStudent.class_section}
          </p>
          <p className="text-gray-500 text-sm mt-2">Father: {selectedStudent.father_name}</p>
          <p className="text-sm text-gray-400 mt-2">
            DOB:{' '}
            {selectedStudent.date_of_birth
              ? new Date(selectedStudent.date_of_birth).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Valid for academic year {new Date().getFullYear()}</p>
        </div>
      </div>
    )}

    <Button onClick={handlePrint} className="mt-4 w-full">
      <Printer className="mr-2" /> Print ID Card
    </Button>
  </DialogContent>
</Dialog>

    </Layout>
  );
}
