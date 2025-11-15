import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { systemCodesApi, schoolsApi } from "@/api";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export default function SystemCodes() {
  const { user } = useAuth();
  const [systemCodes, setSystemCodes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    school_id: "",
    code: "",
    description: "",
    items: [],
  });

  const [filters, setFilters] = useState({ page: 1, limit: 10, total: 0 });

  // 🔹 Load schools for Super Admin
  useEffect(() => {
    if (user?.role === "super_admin") loadSchools();
  }, []);

  // 🔹 Load system codes for selected school
  useEffect(() => {
    if (user?.role === "super_admin" && selectedSchool) {
      loadSystemCodes(selectedSchool);
    } else if (user?.role !== "super_admin") {
      loadSystemCodes();
    }
  }, [filters.page, filters.limit, search, selectedSchool]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load schools");
    }
  };

  const loadSystemCodes = async (schoolId = null) => {
    try {
      setLoading(true);
      const params = {
        limit: filters.limit,
        page: filters.page,
        search,
      };
      if (schoolId) params.school_id = schoolId;

      const res = await systemCodesApi.getAll(params);
      setSystemCodes(res.data.items || res.data || []);
      setFilters((f) => ({
        ...f,
        total: res.data.total || (res.data.items?.length || 0),
      }));
    } catch (err) {
      toast.error("Failed to load system codes");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (code = null) => {
    if (code) {
      setEditing(code);
      setForm({
        id: code.id,
        school_id: code.school_id || selectedSchool,
        code: code.code,
        description: code.description,
        items: code.items || [],
      });
    } else {
      setEditing(null);
      setForm({
        school_id: selectedSchool || "",
        code: "",
        description: "",
        items: [],
      });
    }
    setShowDialog(true);
  };

  const handleAddLineItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { code: "", label: "", is_active: true }],
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

  // 🔹 SAVE (create or update)
  const handleSave = async () => {
    try {
      if (!form.code || !form.description) {
        toast.error("System Code ID and Description are required");
        return;
      }

      if (user.role === "super_admin" && !form.school_id) {
        toast.error("Please select a school to create system code");
        return;
      }

      if (editing) {
        await systemCodesApi.update(form.id, form);
        toast.success("System code updated successfully");
      } else {
        await systemCodesApi.create(form);
        toast.success("System code created successfully");
      }

      setShowDialog(false);
      loadSystemCodes(user.role === "super_admin" ? form.school_id : null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to save system code");
    }
  };

  // 🔹 DELETE
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this system code?")) return;
    try {
      const schoolId = user.role === "super_admin" ? selectedSchool : user.school_id;
      await systemCodesApi.delete(id, schoolId);
      toast.success("Deleted successfully");
      loadSystemCodes(schoolId);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete system code");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-2">
              <ListChecks className="text-primary" /> System Codes
            </h1>
            <p className="text-gray-600">
              Manage reusable code sets (classes, fee statuses, etc.)
            </p>
          </div>
          <Button onClick={() => openDialog()} className="flex items-center gap-2">
            <Plus size={16} /> Add System Code
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 shadow-sm border rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
              <Input
                placeholder="Search system code..."
                className="pl-8 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {user.role === "super_admin" && (
              <Select
                value={selectedSchool || ""}
                onValueChange={(v) => setSelectedSchool(v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by School" />
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
          </div>

          <Pagination pagination={filters} filters={filters} setFilters={setFilters} />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">System Code</th>
                <th className="px-4 py-3 text-left">Description</th>
                {user.role === "super_admin" && (
                  <th className="px-4 py-3 text-left">School</th>
                )}
                <th className="px-4 py-3 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && systemCodes.length > 0 ? (
                systemCodes.map((code) => (
                  <tr key={code.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{code.code}</td>
                    <td className="px-4 py-3">{code.description}</td>
                    {user.role === "super_admin" && (
                      <td className="px-4 py-3 text-gray-600">
                        {code.school_name || "-"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="icon" variant="outline" onClick={() => openDialog(code)}>
                          <Pencil size={16} />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => handleDelete(code.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={user.role === "super_admin" ? 4 : 3}
                    className="text-center py-6 text-gray-500"
                  >
                    {loading ? "Loading..." : "No system codes found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit System Code" : "Add System Code"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {user.role === "super_admin" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Select School</label>
                  <Select
                    value={form.school_id || ""}
                    onValueChange={(v) => setForm({ ...form, school_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="System Code ID"
                  value={form.code}
                  // disabled={!!editing}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                <Input
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Items */}
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
                        onChange={(e) => handleLineChange(idx, "code", e.target.value)}
                      />
                      <Input
                        placeholder="Label"
                        value={item.label}
                        onChange={(e) => handleLineChange(idx, "label", e.target.value)}
                      />
                      <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={item.is_active}
                            onChange={(e) => handleLineChange(idx, "is_active", e.target.checked)}
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
