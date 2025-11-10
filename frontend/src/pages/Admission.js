import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { studentsApi, schoolsApi, classesApi } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Admission() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Check if editing
  const editingStudent = location.state?.student || null;

  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [isEditMode, setIsEditMode] = useState(!!editingStudent);

  const [form, setForm] = useState({
    name: "",
    father_name: "",
    class_id: "",
    date_of_birth: "",
    roll_number: "",
    grade_level: "",
    class_section: "",
    enrollment_date: "",
    school_id: "",
  });

  // ✅ Prefill form if editing
  useEffect(() => {
    if (editingStudent) {
      setForm({
        name: editingStudent.name || "",
        father_name: editingStudent.father_name || "",
        date_of_birth: editingStudent.date_of_birth
          ? new Date(editingStudent.date_of_birth).toISOString().split("T")[0]
          : "",
        roll_number: editingStudent.roll_number || "",
        grade_level: editingStudent.grade_level || "",
        class_id: editingStudent.class_id || "",
        class_section: editingStudent.class_section || "",
        enrollment_date: editingStudent.enrollment_date
          ? new Date(editingStudent.enrollment_date).toISOString().split("T")[0]
          : "",
        school_id: editingStudent.school_id || user.school_id || "",
      });
    }
  }, [editingStudent, user]);

  // Load schools or classes
  useEffect(() => {
    if (user?.role === "super_admin") loadSchools();
    if (user?.role === "school_admin") {
      setForm((f) => ({ ...f, school_id: user.school_id }));
      loadClasses(user.school_id);
    }
  }, [user]);

  useEffect(() => {
    if (form.school_id) loadClasses(form.school_id);
  }, [form.school_id]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch {
      toast.error("Failed to load schools");
    }
  };

  const loadClasses = async (schoolId) => {
    try {
      if (!schoolId) return;
      const res = await classesApi.getAll({ school_id: schoolId });
      setClasses(res.data.data || res.data || []);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (imageFile) fd.append("picture", imageFile);

    try {
      setLoading(true);

      if (isEditMode) {
        // ✅ Update existing student
        await studentsApi.update(editingStudent.id, fd);
        toast.success("Student updated successfully!");
      } else {
        // ✅ Create new student
        if (user.role === "super_admin" && !form.school_id)
          return toast.error("Please select a school");

        await studentsApi.create(fd);
        toast.success("Student admitted successfully!");
      }

      navigate("/students"); // ✅ Redirect back
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">
            {isEditMode ? "Edit Student" : "Student Admission"}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditMode
              ? "Update student details and enrollment information"
              : "Admit new students and manage enrollment details"}
          </p>
        </div>

        <div className="card">
          <form
  onSubmit={handleSubmit}
  className="grid grid-cols-1 md:grid-cols-2 gap-6"
>
  {/* ✅ School (only for Super Admin) */}
  {user?.role === "super_admin" && (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        School
      </label>
      <Select
        value={form.school_id}
        onValueChange={(val) => handleChange("school_id", val)}
      >
        <SelectTrigger>
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

  {/* ✅ Student Name */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Student Name
    </label>
    <Input
      value={form.name}
      onChange={(e) => handleChange("name", e.target.value)}
      placeholder="Enter full name"
      required
    />
  </div>

  {/* ✅ Father's Name */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Father's Name
    </label>
    <Input
      value={form.father_name}
      onChange={(e) => handleChange("father_name", e.target.value)}
      placeholder="Enter father's name"
    />
  </div>

  {/* ✅ Roll Number */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Roll Number
    </label>
    <Input
      value={form.roll_number}
      onChange={(e) => handleChange("roll_number", e.target.value)}
      placeholder="e.g., 101"
    />
  </div>

  {/* ✅ Date of Birth */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Date of Birth
    </label>
    <Input
      type="date"
      value={form.date_of_birth}
      onChange={(e) => handleChange("date_of_birth", e.target.value)}
    />
  </div>

  {/* ✅ Grade */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Grade / Level
    </label>
    <Input
      value={form.grade_level}
      onChange={(e) => handleChange("grade_level", e.target.value)}
      placeholder="e.g., 10"
    />
  </div>

  {/* ✅ Class */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Class
    </label>
    <Select
      value={form.class_id}
      onValueChange={(val) => handleChange("class_id", val)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Class" />
      </SelectTrigger>
      <SelectContent>
        {classes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name || c.class_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* ✅ Section */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Section
    </label>
    <Input
      value={form.class_section}
      onChange={(e) => handleChange("class_section", e.target.value)}
      placeholder="e.g., A"
    />
  </div>

  {/* ✅ Enrollment Date */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Enrollment Date
    </label>
    <Input
      type="date"
      value={form.enrollment_date}
      onChange={(e) => handleChange("enrollment_date", e.target.value)}
    />
  </div>

  {/* ✅ Profile Picture */}
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">
      Profile Picture
    </label>
    <Input
      type="file"
      accept="image/*"
      onChange={(e) => setImageFile(e.target.files[0])}
    />
  </div>

  {/* ✅ Submit Button */}
  <div className="md:col-span-2 flex justify-end mt-4">
    <Button type="submit" disabled={loading}>
      {loading
        ? isEditMode
          ? "Updating..."
          : "Admitting..."
        : isEditMode
        ? "Update Student"
        : "Admit Student"}
    </Button>
  </div>
</form>

        </div>
      </div>
    </Layout>
  );
}
