import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { systemCodesApi } from '@/api'; // 🔹 create matching API wrapper
import PaginationControl, { Pagination } from '@/components/ui/pagination'; // 🔹 your reusable pagination component

export default function SystemCodes() {
  const [systemCodes, setSystemCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
  system_code_id: '',
  description: '',
  items: [],
});

  // pagination filters
  const [filters, setFilters] = useState({ page: 1, limit: 10, total: 0 });

  useEffect(() => {
    loadData();
  }, [filters.page, filters.limit, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const offset = (filters.page - 1) * filters.limit;
      const res = await systemCodesApi.getAll({
  limit: filters.limit,
  offset,
  search,
});

// ✅ directly use `res.data.items` instead of res.data.data
setSystemCodes(res.data.items || []);
setFilters((f) => ({ ...f, total: res.data.total || 0 }));

    } catch (err) {
      console.error(err);
      toast.error('Failed to load system codes');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (code = null) => {
    if (code) {
      setEditing(code);
      setForm({ ...code });
    } else {
      setEditing(null);
      setForm({ system_code_id: '', description: '', items: [] });
    }
    setShowDialog(true);
  };

  const handleAddLineItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { code: '', label: '', is_active: true }],
    }));
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...form.items];
    updated[index][field] = value;
    setForm((f) => ({ ...f, items: updated }));
  };

  const handleRemoveLine = (index) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      if (!form.system_code_id || !form.description) {
        toast.error('System Code ID and Description are required');
        return;
      }

      if (editing) {
        await systemCodesApi.update(editing.id, form);
        toast.success('System code updated');
      } else {
        await systemCodesApi.create(form);
        toast.success('System code created');
      }
      setShowDialog(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this system code?')) return;
    try {
      await systemCodesApi.delete(id);
      toast.success('Deleted successfully');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="system-code-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ListChecks className="w-8 h-8 text-primary" /> System Codes
            </h1>
            <p className="text-gray-600 mt-1">
              Manage reusable code sets (fee status, document type, etc.)
            </p>
          </div>
          <Button onClick={() => openDialog()} className="flex items-center gap-2">
            <Plus size={16} /> Add System Code
          </Button>
        </div>

        {/* Search + Table */}
        <div className="bg-white shadow rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="relative w-1/3">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
              <Input
                placeholder="Search system code..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Pagination pagination={filters} filters={filters} setFilters={setFilters} />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded-md">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-3 text-left">System Code ID</th>
                  <th className="p-3 text-left">Description</th>
                  {/* <th className="p-3 text-left">Line Items</th> */}
                  <th className="p-3 text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {systemCodes.map((code) => (
                  <tr key={code.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{code.system_code_id}</td>
                    <td className="p-3">{code.description}</td>
                    {/* <td className="p-3 text-gray-600">
                      {code.items?.length > 0
                        ? code.items.map((it) => it.label).join(', ')
                        : '-'}
                    </td> */}
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openDialog(code)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(code.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && systemCodes.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-500">
                      No system codes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit System Code' : 'Add System Code'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="System Code ID"
                  value={form.system_code_id}
                  disabled={!!editing}
                  onChange={(e) =>
                    setForm({ ...form, system_code_id: e.target.value })
                  }
                />
                <Input
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Line Items</h3>
                  <Button size="sm" variant="outline" onClick={handleAddLineItem}>
                    + Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-3 gap-3 items-center border rounded-lg p-2"
                    >
                      <Input
                        placeholder="Code"
                        value={item.code}
                        onChange={(e) =>
                          handleLineChange(idx, 'code', e.target.value)
                        }
                      />
                      <Input
                        placeholder="Label"
                        value={item.label}
                        onChange={(e) =>
                          handleLineChange(idx, 'label', e.target.value)
                        }
                      />
                      <div className="flex justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
  <input
    type="checkbox"
    checked={item.is_active}
    onChange={(e) =>
      handleLineChange(idx, 'is_active', e.target.checked)
    }
  />
  Active
</label>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveLine(idx)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {form.items.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-2">
                      No line items added.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
