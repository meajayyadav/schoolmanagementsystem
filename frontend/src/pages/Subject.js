import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { subjectsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, BookOpen, MoreVertical, Pencil, Trash } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

// ✅ Pagination Component (copied from student.js for consistency)
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

export default function Subject() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [filters, setFilters] = useState({ page: 1, limit: 10 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // ✅ Fetch subjects with pagination
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await subjectsApi.getAll({
        page: filters.page,
        limit: filters.limit,
      });
      const data = Array.isArray(res.data.data) ? res.data.data : res.data;

      setSubjects(data);
      setPagination({
        total: res.data.total || data.length,
        totalPages: Math.ceil((res.data.total || data.length) / filters.limit),
      });
    } catch {
      toast.error('Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [filters.page, filters.limit]);

  // ✅ Create / Update Subject
  const handleSubmit = async () => {
    try {
      if (editing) {
        await subjectsApi.update(editing.id, form);
        toast.success('Subject updated successfully');
      } else {
        await subjectsApi.create(form);
        toast.success('Subject added successfully');
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ name: '', code: '', description: '' });
      fetchSubjects();
    } catch {
      toast.error('Error saving subject');
    }
  };

  // ✅ Delete Subject
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await subjectsApi.remove(id);
      toast.success('Subject deleted');
      fetchSubjects();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">📘 Subjects</h1>
            <p className="text-gray-600">Manage academic subjects across classes</p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ name: '', code: '', description: '' });
              setShowDialog(true);
            }}
          >
            <Plus size={20} className="mr-2" /> Add Subject
          </Button>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* ✅ Top Pagination Header */}
          <div className="flex justify-between items-center px-4 border-b bg-gray-50">
            <h2 className="text-base font-medium text-gray-800 py-3">
              Subject Records
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
          ) : subjects.length ? (
            <>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left w-16">S.No</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, index) => (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {(filters.page - 1) * filters.limit + index + 1}
                      </td>
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3">{s.code}</td>
                      <td className="px-4 py-3">{s.description || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(s);
                                setForm({
                                  name: s.name,
                                  code: s.code,
                                  description: s.description,
                                });
                                setShowDialog(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
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

              {/* ✅ Bottom Summary */}
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
              <BookOpen className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-gray-900">No subjects found</h3>
              <p className="text-gray-500">Add subjects to build your curriculum.</p>
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              <Input
                placeholder="Subject Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder="Code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
