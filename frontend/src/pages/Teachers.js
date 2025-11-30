// import { useEffect, useState } from 'react';
// import Layout from '@/components/Layout';
// import { teachersApi, schoolsApi, subjectsApi, classesApi } from '@/api';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import {
//   Select,
//   SelectTrigger,
//   SelectContent,
//   SelectItem,
//   SelectValue,
// } from '@/components/ui/select';
// import { toast } from 'sonner';
// import {
//   Plus,
//   Users,
//   MoreVertical,
//   Pencil,
//   Trash,
//   X,
// } from 'lucide-react';
// import { useAuth } from '@/contexts/AuthContext';
// import { Switch } from '@/components/ui/switch';
// import { MultiSelect } from '@/components/ui/multiselect';

// // ✅ Pagination Component (used inside table container)
// const PaginationControl = ({ pagination, filters, setFilters }) => {
//   const pageSizes = [5, 10, 15, 25, 50];
//   return (
//     <div className="flex items-center justify-end gap-4 p-4 border-t bg-gray-50">
//       <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
//         <span>Rows per page:</span>
//         <Select
//           value={String(filters.limit)}
//           onValueChange={(val) =>
//             setFilters((prev) => ({ ...prev, limit: parseInt(val), page: 1 }))
//           }
//         >
//           <SelectTrigger className="w-20">
//             <SelectValue />
//           </SelectTrigger>
//           <SelectContent>
//             {pageSizes.map((n) => (
//               <SelectItem key={n} value={String(n)}>
//                 {n}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>

//       <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
//         <Button
//           variant="outline"
//           size="sm"
//           disabled={filters.page === 1}
//           onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
//         >
//           Prev
//         </Button>
//         <span>
//           Page {filters.page} of {pagination.totalPages || 1}
//         </span>
//         <Button
//           variant="outline"
//           size="sm"
//           disabled={filters.page >= pagination.totalPages}
//           onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
//         >
//           Next
//         </Button>
//       </div>
//     </div>
//   );
// };

// // ----------------------
// // Main Component
// // ----------------------
// export default function Teachers() {
//   const { user } = useAuth();
//   const [teachers, setTeachers] = useState([]);
//   const [subjects, setSubjects] = useState([]);
//   const [schools, setSchools] = useState([]);
//   const [classes, setClasses] = useState([]);
//   const [selectedSchoolCode, setSelectedSchoolCode] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [showDialog, setShowDialog] = useState(false);
//   const [editing, setEditing] = useState(null);

//   const [formData, setFormData] = useState({
//   name: '',
//   email: '',
//   subjects: [],
//   classes_assigned: [],
//   fee_status: 'Pending',
//   is_active: true,
//   school_id: '',
// });


//   const [filters, setFilters] = useState({
//     name: '',
//     class_assigned: '',
//     subject: '',
//     page: 1,
//     limit: 10,
//   });
//   const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

//   // ----------------------
//   // Data Loading
//   // ----------------------
//   useEffect(() => {
//     if (user?.role === 'super_admin') loadSchools();
//   }, [user]);

//   useEffect(() => {
//     if (
//       user?.role === 'school_admin' ||
//       (user?.role === 'super_admin' && selectedSchoolCode)
//     ) {
//       loadTeachers();
//       loadSubjects();
//       loadClasses();
//     }
//   }, [selectedSchoolCode, filters.page, filters.limit, user]);

//   const loadSchools = async () => {
//     try {
//       const res = await schoolsApi.getAll();
//       setSchools((res.data || []).filter((s) => s && s.code));
//     } catch {
//       toast.error('Failed to load schools');
//     }
//   };

//   const loadClasses = async () => {
//     try {
//       const schoolId =
//         user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
//       if (!schoolId) return;
//       const res = await classesApi.getAll({ school_id: schoolId });
//       setClasses(res.data.data || res.data || []);
//     } catch {
//       toast.error('Failed to load classes');
//     }
//   };

//   const loadSubjects = async () => {
//     try {
//       const schoolId =
//         user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
//       if (!schoolId) return;
//       const res = await subjectsApi.getAll({ school_id: schoolId });
//       setSubjects(res.data.data || res.data || []);
//     } catch {
//       toast.error('Failed to load subjects');
//     }
//   };

//   const loadTeachers = async (overrideFilters = null) => {
//   try {
//     setLoading(true);
//     const params = overrideFilters || { ...filters };
//     if (user.role === 'super_admin') {
//       if (!selectedSchoolCode) return toast.error('Select a school first');
//       params.school_id = selectedSchoolCode;
//     }
//     const res = await teachersApi.getAll(params);
//     setTeachers(res.data.data || res.data || []);
//     setPagination({
//       total: res.data.total || 0,
//       totalPages: res.data.totalPages || 1,
//     });
//   } catch (err) {
//     toast.error(err.response?.data?.detail || 'Failed to load teachers');
//   } finally {
//     setLoading(false);
//   }
// };


//   // ----------------------
//   // CRUD Handlers
//   // ----------------------
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = { ...formData };
//       if (user.role === 'super_admin') {
//         if (!payload.school_id)
//           return toast.error('Select a school before saving');
//       } else {
//         payload.school_id = user.school_id;
//       }

//       if (editing) {
//         await teachersApi.update(editing.id, payload);
//         toast.success('Teacher updated successfully');
//       } else {
//         await teachersApi.create(payload);
//         toast.success('Teacher added successfully');
//       }

//       setShowDialog(false);
//       setEditing(null);
//       resetForm();
//       loadTeachers();
//     } catch (err) {
//       toast.error(err.response?.data?.detail || 'Failed to save teacher');
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!confirm('Are you sure you want to delete this teacher?')) return;
//     try {
//       await teachersApi.delete(id);
//       toast.success('Teacher deleted successfully');
//       loadTeachers();
//     } catch {
//       toast.error('Failed to delete teacher');
//     }
//   };

//   const toggleTeacherStatus = async (teacher) => {
//     try {
//       await teachersApi.update(teacher.id, { is_active: !teacher.is_active });
//       toast.success(`Teacher ${teacher.is_active ? 'deactivated' : 'activated'}`);
//       setTeachers((prev) =>
//         prev.map((t) =>
//           t.id === teacher.id ? { ...t, is_active: !t.is_active } : t
//         )
//       );
//     } catch {
//       toast.error('Failed to update status');
//     }
//   };

//   const resetForm = () => {
//     setFormData({
//       name: '',
//       email:'',
//       subjects: [],
//       classes_assigned: [],
//       fee_status: 'Pending',
//       is_active: true,
//       school_id: '',
//     });
//   };

//   // ----------------------
//   // UI
//   // ----------------------
//   return (
//     <Layout>
//       <div className="animate-fade-in space-y-6">
//         {/* Header */}
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-3xl font-semibold text-gray-900">👩‍🏫 Teachers</h1>
//             <p className="text-gray-600">Manage teacher profiles and subjects</p>
//           </div>
//           <Button
//             onClick={() => {
//               resetForm();
//               setEditing(null);
//               setShowDialog(true);
//             }}
//           >
//             <Plus size={20} className="mr-2" /> Add Teacher
//           </Button>
//         </div>

//         {/* Filter Bar */}
//         <div className="bg-white border rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-3">
//           {user.role === 'super_admin' && (
//             <Select
//               value={selectedSchoolCode}
//               onValueChange={(v) => setSelectedSchoolCode(v)}
//             >
//               <SelectTrigger className="w-[250px]">
//                 <SelectValue placeholder="Select School" />
//               </SelectTrigger>
//               <SelectContent>
//                 {schools.map((s) => (
//                   <SelectItem key={s.code} value={s.code}>
//                     {s.name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           )}

//           <Input
//             placeholder="Search by name"
//             value={filters.name}
//             onChange={(e) =>
//               setFilters({ ...filters, name: e.target.value, page: 1 })
//             }
//             className="w-56"
//           />

//           {/* Subject Dropdown */}
//           <Select
//             value={filters.subject}
//             onValueChange={(v) => setFilters({ ...filters, subject: v, page: 1 })}
//           >
//             <SelectTrigger className="w-56">
//               <SelectValue placeholder="Filter by Subject" />
//             </SelectTrigger>
//             <SelectContent>
//               {subjects.map((s) => (
//                 <SelectItem key={s.id} value={s.name}>
//                   {s.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           {/* Class Dropdown */}
//           <Select
//             value={filters.class_assigned}
//             onValueChange={(v) =>
//               setFilters({ ...filters, class_assigned: v, page: 1 })
//             }
//           >
//             <SelectTrigger className="w-56">
//               <SelectValue placeholder="Filter by Class" />
//             </SelectTrigger>
//             <SelectContent>
//               {classes.map((c) => (
//                 <SelectItem key={c.id} value={c.name || c.class_name}>
//                   {c.name || c.class_name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
// {/* Apply Filters button before Clear */}
// <Button
//   size="sm"
//   onClick={() => {
//     setFilters((prev) => ({ ...prev, page: 1 }));
//     loadTeachers();
//   }}
// >
//   Apply Filters
// </Button>

// <Button
//   variant="outline"
//   size="sm"
//   onClick={() =>
//     setFilters({ name: '', class_assigned: '', subject: '', page: 1, limit: 10 })
//   }
// >
//   <X size={16} className="mr-1" /> Clear
// </Button>

//         </div>

//         {/* Table */}
//         <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
//           <div className="flex justify-between items-center px-4 border-b bg-gray-50">
//     <h2 className="text-base font-medium text-gray-800 py-3">
//       Teacher Records
//     </h2>
//     {/* ✅ Pagination Inside Table Container */}
//               <PaginationControl
//                 pagination={pagination}
//                 filters={filters}
//                 setFilters={setFilters}
//               />
//   </div>
//           {loading ? (
//             <div className="flex justify-center items-center h-64">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//             </div>
//           ) : teachers.length > 0 ? (
//             <>
//               <table className="min-w-full text-sm border-collapse">
//                 <thead className="bg-gray-50 border-b">
//                   <tr>
//                     <th className="px-4 py-3 text-left">Name</th>
//                     <th className="px-4 py-3 text-left">Subjects</th>
//                     <th className="px-4 py-3 text-left">Classes Assigned</th>
//                     <th className="px-4 py-3 text-left">Fee Status</th>
//                     <th className="px-4 py-3 text-left">Active</th>
//                     <th className="px-4 py-3 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {teachers.map((t) => (
//                     <tr key={t.id} className="border-t hover:bg-gray-50">
//                       <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
//                       <td className="px-4 py-3">
//                         {Array.isArray(t.subjects)
//                           ? t.subjects.join(', ')
//                           : t.subject}
//                       </td>
//                       <td className="px-4 py-3">
//                         {Array.isArray(t.classes_assigned)
//                           ? t.classes_assigned.join(', ')
//                           : t.class_assigned}
//                       </td>
//                       <td
//                         className={`px-4 py-3 ${
//                           t.fee_status === 'Paid' ? 'text-green-600' : 'text-red-500'
//                         }`}
//                       >
//                         {t.fee_status}
//                       </td>
//                       <td className="px-4 py-3">
//                         <Switch
//                           checked={t.is_active}
//                           onCheckedChange={() => toggleTeacherStatus(t)}
//                         />
//                       </td>
//                       <td className="px-4 py-3 text-right">
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild>
//                             <Button variant="ghost" size="sm">
//                               <MoreVertical size={18} />
//                             </Button>
//                           </DropdownMenuTrigger>
//                           <DropdownMenuContent align="end">
//                             <DropdownMenuItem
//                               onClick={() => {
//                                 setEditing(t);
//                                 setFormData({
//                                   ...t,
//                                   subjects: t.subjects || [],
//                                   classes_assigned: t.classes_assigned || [],
//                                 });
//                                 setShowDialog(true);
//                               }}
//                             >
//                               <Pencil className="w-4 h-4 mr-2" /> Edit
//                             </DropdownMenuItem>
//                             <DropdownMenuItem
//                               onClick={() => handleDelete(t.id)}
//                               className="text-red-600"
//                             >
//                               <Trash className="w-4 h-4 mr-2" /> Delete
//                             </DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>

              
//             </>
//           ) : (
//             <div className="text-center py-12">
//               <Users className="mx-auto text-gray-400 mb-4" size={64} />
//               <h3 className="text-lg font-semibold text-gray-900">
//                 No teachers found
//               </h3>
//               <p className="text-gray-500">
//                 Add teachers to begin managing your staff.
//               </p>
//             </div>
//           )}
//         </div>

//         {/* Dialog */}
//         <Dialog open={showDialog} onOpenChange={setShowDialog}>
//           <DialogContent className="max-w-lg">
//             <DialogHeader>
//               <DialogTitle>{editing ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
//             </DialogHeader>

//             <form onSubmit={handleSubmit} className="space-y-4">
//               {user.role === 'super_admin' && (
//                 <Select
//                   onValueChange={(v) => setFormData({ ...formData, school_id: v })}
//                   value={formData.school_id}
//                 >
//                   <SelectTrigger className="w-full">
//                     <SelectValue placeholder="Select School" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {schools.map((s) => (
//                       <SelectItem key={s.code} value={s.code}>
//                         {s.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               )}

//               {/* Name */}
// <label className="text-sm font-medium text-gray-700">Full Name</label>
// <Input
//   placeholder="Full Name"
//   value={formData.name}
//   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//   required
// />

// {/* Email */}
// <label className="text-sm font-medium text-gray-700">Email Address</label>
// <Input
//   type="email"
//   placeholder="Email Address"
//   value={formData.email}
//   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//   required
// />


//               <MultiSelect
//                 options={subjects.map((s) => ({
//                   label: s.name,
//                   value: s.name,
//                 }))}
//                 value={formData.subjects}
//                 onChange={(val) => setFormData({ ...formData, subjects: val })}
//                 placeholder="Select Subjects"
//               />

//               <MultiSelect
//                 options={classes.map((c) => ({
//                   label: c.name || c.class_name,
//                   value: c.name || c.class_name,
//                 }))}
//                 value={formData.classes_assigned}
//                 onChange={(val) =>
//                   setFormData({ ...formData, classes_assigned: val })
//                 }
//                 placeholder="Assign Classes"
//               />

//               <Select
//                 onValueChange={(v) => setFormData({ ...formData, fee_status: v })}
//                 value={formData.fee_status}
//               >
//                 <SelectTrigger className="w-full">
//                   <SelectValue placeholder="Fee Status" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="Paid">Paid</SelectItem>
//                   <SelectItem value="Pending">Pending</SelectItem>
//                 </SelectContent>
//               </Select>

//               <Button type="submit" className="w-full">
//                 {editing ? 'Update Teacher' : 'Add Teacher'}
//               </Button>
//             </form>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </Layout>
//   );
// }

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { teachersApi, schoolsApi, subjectsApi, classesApi } from '@/api';
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
  Users,
  MoreVertical,
  Pencil,
  Trash,
  X,
  Search,
  Filter,
  Download,
  Mail,
  BookOpen,
  GraduationCap,
  BadgeCheck,
  BadgeX,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multiselect';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirm } from '@/hooks/use-confirm';

// ✅ Enhanced Pagination Component
const PaginationControl = ({ pagination, filters, setFilters }) => {
  const pageSizes = [5, 10, 15, 25, 50];
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-gray-50/50">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Showing</span>
        <span className="font-semibold text-gray-900">
          {((filters.page - 1) * filters.limit) + 1} - {Math.min(filters.page * filters.limit, pagination.total)}
        </span>
        <span>of</span>
        <span className="font-semibold text-gray-900">{pagination.total}</span>
        <span>teachers</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="hidden sm:inline">Rows per page:</span>
          <Select
            value={String(filters.limit)}
            onValueChange={(val) =>
              setFilters((prev) => ({ ...prev, limit: parseInt(val), page: 1 }))
            }
          >
            <SelectTrigger className="w-20 h-8">
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

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="h-8 w-8 p-0"
          >
            ←
          </Button>
          <div className="flex items-center gap-1 mx-2">
            <span className="text-sm font-medium text-gray-900">
              {filters.page}
            </span>
            <span className="text-sm text-gray-500">/</span>
            <span className="text-sm text-gray-500">{pagination.totalPages || 1}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page >= pagination.totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="h-8 w-8 p-0"
          >
            →
          </Button>
        </div>
      </div>
    </div>
  );
};

// ✅ Teacher Card Component for Mobile View
const TeacherCard = ({ teacher, onEdit, onDelete, onToggleStatus }) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{teacher.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{teacher.email}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(teacher.subjects) && teacher.subjects.length > 0 ? (
                    teacher.subjects.slice(0, 3).map((subject, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No subjects</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(teacher.classes_assigned) && teacher.classes_assigned.length > 0 ? (
                    teacher.classes_assigned.slice(0, 3).map((cls, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {cls}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No classes</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <Badge
                variant={teacher.fee_status === 'Paid' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {teacher.fee_status}
              </Badge>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={teacher.is_active}
                  onCheckedChange={() => onToggleStatus(teacher)}
                  className="scale-90"
                />
                <span className={`text-xs font-medium ${teacher.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {teacher.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(teacher)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Teacher
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(teacher)}>
                {teacher.is_active ? (
                  <BadgeX className="w-4 h-4 mr-2 text-orange-600" />
                ) : (
                  <BadgeCheck className="w-4 h-4 mr-2 text-green-600" />
                )}
                {teacher.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(teacher.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete Teacher
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

// ----------------------
// Main Component
// ----------------------
export default function Teachers() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSchoolCode, setSelectedSchoolCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subjects: [],
    classes_assigned: [],
    fee_status: 'Pending',
    is_active: true,
    school_id: '',
  });

  const [filters, setFilters] = useState({
    name: '',
    class_assigned: '',
    subject: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // ----------------------
  // Data Loading
  // ----------------------
  useEffect(() => {
    if (user?.role === 'super_admin') loadSchools();
  }, [user]);

  useEffect(() => {
    if (
      user?.role === 'school_admin' ||
      (user?.role === 'super_admin' && selectedSchoolCode)
    ) {
      loadTeachers();
      loadSubjects();
      loadClasses();
    }
  }, [selectedSchoolCode, filters.page, filters.limit, user]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools((res.data || []).filter((s) => s && s.code));
    } catch {
      toast.error('Failed to load schools');
    }
  };

  const loadClasses = async () => {
    try {
      const schoolId =
        user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
      if (!schoolId) return;
      const res = await classesApi.getAll({ school_id: schoolId });
      setClasses(res.data.data || res.data || []);
    } catch {
      toast.error('Failed to load classes');
    }
  };

  const loadSubjects = async () => {
    try {
      const schoolId =
        user.role === 'super_admin' ? selectedSchoolCode : user.school_id;
      if (!schoolId) return;
      const res = await subjectsApi.getAll({ school_id: schoolId });
      setSubjects(res.data.data || res.data || []);
    } catch {
      toast.error('Failed to load subjects');
    }
  };

  const loadTeachers = async (overrideFilters = null) => {
    try {
      setLoading(true);
      const params = overrideFilters || { ...filters };
      if (user.role === 'super_admin') {
        if (!selectedSchoolCode) return toast.error('Select a school first');
        params.school_id = selectedSchoolCode;
      }
      const res = await teachersApi.getAll(params);
      setTeachers(res.data.data || res.data || []);
      setPagination({
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1,
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------
  // CRUD Handlers
  // ----------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (user.role === 'super_admin') {
        if (!payload.school_id)
          return toast.error('Select a school before saving');
      } else {
        payload.school_id = user.school_id;
      }
  
      let response;
      if (editing) {
        response = await teachersApi.update(editing.id, payload);
        toast.success('Teacher updated successfully');
      } else {
        response = await teachersApi.create(payload);
        if (response.data.emailSent) {
          toast.success('Teacher added successfully! Temporary password sent via email.');
        } else {
          toast.success('Teacher added successfully! However, failed to send email with temporary password.');
        }
      }
  
      setShowDialog(false);
      setEditing(null);
      resetForm();
      loadTeachers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save teacher');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Teacher',
      description: 'Are you sure you want to delete this teacher? This action cannot be undone.',
    });
    if (!confirmed) return;
    try {
      await teachersApi.delete(id);
      toast.success('Teacher deleted successfully');
      loadTeachers();
    } catch {
      toast.error('Failed to delete teacher');
    }
  };

  const toggleTeacherStatus = async (teacher) => {
    try {
      await teachersApi.update(teacher.id, { is_active: !teacher.is_active });
      toast.success(`Teacher ${teacher.is_active ? 'deactivated' : 'activated'}`);
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacher.id ? { ...t, is_active: !t.is_active } : t
        )
      );
    } catch {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      subjects: [],
      classes_assigned: [],
      fee_status: 'Pending',
      is_active: true,
      school_id: '',
    });
  };

  // Stats calculation
  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.is_active).length,
    inactive: teachers.filter(t => !t.is_active).length,
    paid: teachers.filter(t => t.fee_status === 'Paid').length,
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Teacher Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage teacher profiles, subjects, and class assignments
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex bg-white border rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3"
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-3"
                >
                  Grid
                </Button>
              </div>

              <Button
                onClick={() => {
                  resetForm();
                  setEditing(null);
                  setShowDialog(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 shadow-lg"
              >
                <Plus size={20} className="mr-2" />
                Add Teacher
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BadgeCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fee Paid</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.paid}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Inactive</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.inactive}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BadgeX className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Section */}
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
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      School
                    </label>
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Search Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search teachers..."
                      value={filters.name}
                      onChange={(e) =>
                        setFilters({ ...filters, name: e.target.value, page: 1 })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Subject
                  </label>
                  <Select
                    value={filters.subject}
                    onValueChange={(v) => setFilters({ ...filters, subject: v, page: 1 })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="lg:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Class
                  </label>
                  <Select
                    value={filters.class_assigned}
                    onValueChange={(v) =>
                      setFilters({ ...filters, class_assigned: v, page: 1 })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.name || c.class_name}>
                          {c.name || c.class_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="lg:col-span-1 flex items-end gap-2">
                  <Button
                    onClick={() => loadTeachers()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters({ name: '', class_assigned: '', subject: '', page: 1, limit: 10 })
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

          {/* Content Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Teacher Records
                <Badge variant="secondary" className="ml-2">
                  {pagination.total}
                </Badge>
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : teachers.length > 0 ? (
              <>
                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {teachers.map((teacher) => (
                        <TeacherCard
                          key={teacher.id}
                          teacher={teacher}
                          onEdit={(t) => {
                            setEditing(t);
                            setFormData({
                              ...t,
                              subjects: t.subjects || [],
                              classes_assigned: t.classes_assigned || [],
                            });
                            setShowDialog(true);
                          }}
                          onDelete={handleDelete}
                          onToggleStatus={toggleTeacherStatus}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Teacher</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Subjects</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Classes</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Fee Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {teachers.map((teacher) => (
                          <tr key={teacher.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                  <Users className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{teacher.name}</div>
                                  <div className="text-sm text-gray-500">{teacher.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {Array.isArray(teacher.subjects) && teacher.subjects.length > 0 ? (
                                  teacher.subjects.slice(0, 2).map((subject, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {subject}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">-</span>
                                )}
                                {Array.isArray(teacher.subjects) && teacher.subjects.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{teacher.subjects.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1 max-w-[150px]">
                                {Array.isArray(teacher.classes_assigned) && teacher.classes_assigned.length > 0 ? (
                                  teacher.classes_assigned.slice(0, 2).map((cls, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {cls}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={teacher.fee_status === 'Paid' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {teacher.fee_status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={teacher.is_active}
                                  onCheckedChange={() => toggleTeacherStatus(teacher)}
                                />
                                <span className={`text-sm font-medium ${teacher.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                  {teacher.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
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
                                      setEditing(teacher);
                                      setFormData({
                                        ...teacher,
                                        subjects: teacher.subjects || [],
                                        classes_assigned: teacher.classes_assigned || [],
                                      });
                                      setShowDialog(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit Teacher
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => toggleTeacherStatus(teacher)}
                                  >
                                    {teacher.is_active ? (
                                      <BadgeX className="w-4 h-4 mr-2 text-orange-600" />
                                    ) : (
                                      <BadgeCheck className="w-4 h-4 mr-2 text-green-600" />
                                    )}
                                    {teacher.is_active ? 'Deactivate' : 'Activate'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(teacher.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash className="w-4 h-4 mr-2" />
                                    Delete Teacher
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <PaginationControl
                  pagination={pagination}
                  filters={filters}
                  setFilters={setFilters}
                />
              </>
            ) : (
              <div className="text-center py-16">
                <Users className="mx-auto text-gray-300 mb-4" size={80} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No teachers found
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {selectedSchoolCode || user.school_id
                    ? 'Get started by adding your first teacher to the system.'
                    : 'Please select a school to view teachers.'}
                </p>
                {(selectedSchoolCode || user.school_id) && (
                  <Button
                    onClick={() => {
                      resetForm();
                      setEditing(null);
                      setShowDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={20} className="mr-2" />
                    Add First Teacher
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add/Edit Teacher Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <>
                  <Pencil className="w-5 h-5 text-blue-600" />
                  Edit Teacher
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-green-600" />
                  Add New Teacher
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Update teacher information and assignments.' : 'Add a new teacher to the system.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* School Selection for Super Admin */}
              {user.role === 'super_admin' && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    School *
                  </label>
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Full Name *
                </label>
                <Input
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Email Address *
                </label>
                <Input
                  type="email"
                  placeholder="teacher@school.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Subjects
                </label>
                <MultiSelect
                  options={subjects.map((s) => ({
                    label: s.name,
                    value: s.name,
                  }))}
                  value={formData.subjects}
                  onChange={(val) => setFormData({ ...formData, subjects: val })}
                  placeholder="Select subjects..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Classes Assigned
                </label>
                <MultiSelect
                  options={classes.map((c) => ({
                    label: c.name || c.class_name,
                    value: c.name || c.class_name,
                  }))}
                  value={formData.classes_assigned}
                  onChange={(val) =>
                    setFormData({ ...formData, classes_assigned: val })
                  }
                  placeholder="Assign classes..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fee Status
                </label>
                <Select
                  onValueChange={(v) => setFormData({ ...formData, fee_status: v })}
                  value={formData.fee_status}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <label className="text-sm font-medium text-gray-700">
                  Active Teacher
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editing ? 'Update Teacher' : 'Add Teacher'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </Layout>
  );
}
