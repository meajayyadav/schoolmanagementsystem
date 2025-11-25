import React, { useState, useEffect, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { studentsApi, schoolsApi, classesApi } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useReactToPrint } from 'react-to-print';
import { 
  User, School, BookOpen, Calendar, Hash, UserCircle, 
  ArrowLeft, Save, Upload, CheckCircle, IndianRupeeIcon, Receipt, Printer
} from "lucide-react";

// Bill Summary Component
const BillSummary = ({ admissionFee, monthlyFee }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const total = (admissionFee || 0) + (monthlyFee || 0);

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-100 border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <IndianRupeeIcon className="h-5 w-5 text-green-600" />
          Fee Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Admission Fee:</span>
          <span className="font-semibold text-gray-900">{formatCurrency(admissionFee)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Monthly Fee:</span>
          <span className="font-semibold text-gray-900">{formatCurrency(monthlyFee)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between items-center">
          <span className="text-base font-bold text-gray-900">Total Amount:</span>
          <span className="text-lg font-bold text-green-600">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Printable Bill Component
const PrintableBill = React.forwardRef(({ student, schoolName, admissionFee, monthlyFee }, ref) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const total = (admissionFee || 0) + (monthlyFee || 0);

  return (
    <div ref={ref} className="bg-white p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{schoolName}</h1>
        <p className="text-gray-600 text-lg">Official Fee Receipt</p>
        <p className="text-gray-500 text-sm">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Student Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Student Information</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Name:</span> {student?.name}</p>
            <p><span className="font-medium">Roll No:</span> {student?.roll_number}</p>
            <p><span className="font-medium">Class:</span> {student?.grade_level} - {student?.class_section}</p>
            <p><span className="font-medium">Father's Name:</span> {student?.father_name}</p>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Payment Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Receipt No:</span> {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            <p><span className="font-medium">Academic Year:</span> {new Date().getFullYear()}-{new Date().getFullYear() + 1}</p>
            <p><span className="font-medium">Payment Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Description</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3 border-b">Admission Fee</td>
              <td className="px-4 py-3 text-right border-b">{formatCurrency(admissionFee)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 border-b">Monthly Fee (First Month)</td>
              <td className="px-4 py-3 text-right border-b">{formatCurrency(monthlyFee)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-4 py-3 font-semibold">Total Amount</td>
              <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-4 text-center">
        <div className="grid grid-cols-2 gap-8 text-xs text-gray-500 mb-4">
          <div>
            <p className="font-medium">Student Signature</p>
            <div className="h-12 border-b border-gray-300 mt-2"></div>
          </div>
          <div>
            <p className="font-medium">School Authority</p>
            <div className="h-12 border-b border-gray-300 mt-2"></div>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          This is a computer generated receipt. No signature required.
        </p>
      </div>
    </div>
  );
});

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
  const [validationErrors, setValidationErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [showBill, setShowBill] = useState(false);
  const [newStudent, setNewStudent] = useState(null);
  const [schoolName, setSchoolName] = useState('');

  const billRef = useRef();
  const handlePrintBill = useReactToPrint({ 
    content: () => billRef.current,
    onAfterPrint: () => toast.success('Bill printed successfully!')
  });

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
    admission_fee: "",
    monthly_fee: "",
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
        admission_fee: editingStudent.admission_fee || "",
        monthly_fee: editingStudent.monthly_fee || "",
      });

      // Set image preview if exists
      if (editingStudent.picture) {
        setImagePreview(`${process.env.REACT_APP_BACKEND_URL}${editingStudent.picture}`);
      }
    }
  }, [editingStudent, user]);

  // Load schools or classes
  useEffect(() => {
    if (user?.role === "super_admin") loadSchools();
    if (user?.role === "school_admin") {
      setForm((f) => ({ ...f, school_id: user.school_id }));
      loadClasses(user.school_id);
      fetchSchoolName(user.school_id);
    }
  }, [user]);

  useEffect(() => {
    if (form.school_id) {
      loadClasses(form.school_id);
      fetchSchoolName(form.school_id);
    }
  }, [form.school_id]);

  const fetchSchoolName = async (schoolId) => {
    try {
      const res = await schoolsApi.getOne(schoolId);
      setSchoolName(res.data?.name || 'Unknown School');
    } catch (err) {
      console.error('Failed to fetch school name:', err);
      setSchoolName('Unknown School');
    }
  };

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

  // Fetch fee structure when class is selected
  const handleClassChange = async (classId) => {
    setForm((prev) => ({ ...prev, class_id: classId }));
    
    try {
      const selectedClass = classes.find(cls => cls.id === classId);
      if (selectedClass) {
        // Auto-fill the fee fields from class data
        setForm(prev => ({
          ...prev,
          admission_fee: selectedClass.admission_fee || '',
          monthly_fee: selectedClass.monthly_fee || ''
        }));
      }
    } catch (err) {
      console.error('Failed to fetch class fee structure:', err);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // ✅ Remove validation error for this field when user fills it
    setValidationErrors((prev) => {
      const updated = { ...prev };
      if (value && updated[field]) delete updated[field];
      return updated;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = {
      name: "Student Name",
      father_name: "Father's Name",
      roll_number: "Roll Number",
      date_of_birth: "Date of Birth",
      class_id: "Class",
      class_section: "Section",
      enrollment_date: "Admission Date",
    };

    const errors = {};

    // Find first missing field
    const firstMissingField = Object.entries(requiredFields).find(
      ([key]) => !form[key]
    );

    if (firstMissingField) {
      const [key, label] = firstMissingField;
      errors[key] = true;
      setValidationErrors(errors);
      toast.error(`${label} is required`);
      return;
    }

    setValidationErrors({}); // clear previous errors

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '' && v !== null) {
        fd.append(k, v);
      }
    });
    if (imageFile) fd.append("picture", imageFile);

    try {
      setLoading(true);

      if (isEditMode) {
        await studentsApi.update(editingStudent.id, fd);
        toast.success("Student updated successfully!");
        navigate("/students");
      } else {
        if (user.role === "super_admin" && !form.school_id)
          return toast.error("Please select a school before admitting a student");

        const response = await studentsApi.create(fd);
        const createdStudent = response.data?.student || response.data;
        
        toast.success("Student admitted successfully!");
        setNewStudent(createdStudent);
        setShowBill(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save student");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAndClose = () => {
    handlePrintBill();
    setTimeout(() => {
      setShowBill(false);
      navigate("/students");
    }, 1000);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/students")}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button> */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {isEditMode ? "Edit Student" : "Student Admission"}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditMode
                  ? "Update student details and enrollment information"
                  : "Admit new students and manage enrollment details"}
              </p>
            </div>
          </div>
          
          <Badge variant={isEditMode ? "secondary" : "default"} className="text-sm">
            {isEditMode ? "Edit Mode" : "New Admission"}
          </Badge>
        </div>

        {/* Main Form Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-blue-600" />
              Student Information
            </CardTitle>
            <CardDescription>
              {isEditMode 
                ? "Update the student's details below"
                : "Fill in the student's personal and academic information"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* School Selection (Super Admin Only) */}
              {user?.role === "super_admin" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    <Label htmlFor="school_id" className="flex items-center gap-2 text-blue-700 font-medium">
                      <School className="h-4 w-4" />
                      School
                    </Label>
                    <Select
                      value={form.school_id}
                      onValueChange={(val) => handleChange("school_id", val)}
                    >
                      <SelectTrigger className={validationErrors.school_id ? "border-red-500" : ""}>
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
                    {validationErrors.school_id && (
                      <p className="text-red-500 text-sm">Please select a school</p>
                    )}
                  </div>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Personal Info */}
                <div className="space-y-6">
                  {/* Profile Picture Upload */}
                  <div className="flex flex-col items-center space-y-4 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
                    <div className="relative">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                          className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                      ) : (
                        <div className="h-24 w-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                          <UserCircle className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1 rounded-full">
                        <Upload size={16} />
                      </div>
                    </div>
                    <div className="text-center">
                      <Label htmlFor="picture" className="cursor-pointer">
                        <div className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                          <Upload size={16} />
                          Upload Photo
                        </div>
                      </Label>
                      <Input
                        id="picture"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG or GIF • Max 5MB
                      </p>
                    </div>
                  </div>

                  {/* Student Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      Student Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Enter full name"
                      className={validationErrors.name ? "border-red-500" : ""}
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-sm">Student name is required</p>
                    )}
                  </div>

                  {/* Father's Name */}
                  <div className="space-y-2">
                    <Label htmlFor="father_name" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      Father's Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="father_name"
                      value={form.father_name}
                      onChange={(e) => handleChange("father_name", e.target.value)}
                      placeholder="Enter father's name"
                      className={validationErrors.father_name ? "border-red-500" : ""}
                    />
                    {validationErrors.father_name && (
                      <p className="text-red-500 text-sm">Father's name is required</p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Date of Birth <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => handleChange("date_of_birth", e.target.value)}
                      className={validationErrors.date_of_birth ? "border-red-500" : ""}
                    />
                    {validationErrors.date_of_birth && (
                      <p className="text-red-500 text-sm">Date of birth is required</p>
                    )}
                  </div>
                </div>

                {/* Right Column - Academic Info */}
                <div className="space-y-6">
                  {/* Roll Number */}
                  <div className="space-y-2">
                    <Label htmlFor="roll_number" className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-500" />
                      Roll Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="roll_number"
                      value={form.roll_number}
                      onChange={(e) => handleChange("roll_number", e.target.value)}
                      placeholder="e.g., 101"
                      className={validationErrors.roll_number ? "border-red-500" : ""}
                    />
                    {validationErrors.roll_number && (
                      <p className="text-red-500 text-sm">Roll number is required</p>
                    )}
                  </div>

                  {/* Grade Level */}
                  <div className="space-y-2">
                    <Label htmlFor="grade_level" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      Grade / Level
                    </Label>
                    <Input
                      id="grade_level"
                      value={form.grade_level}
                      onChange={(e) => handleChange("grade_level", e.target.value)}
                      placeholder="e.g., 10"
                    />
                  </div>

                  {/* Class Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="class_id" className="flex items-center gap-2">
                      <School className="h-4 w-4 text-gray-500" />
                      Class <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.class_id}
                      onValueChange={handleClassChange}
                    >
                      <SelectTrigger className={validationErrors.class_id ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name || c.class_name} {c.section ? `- ${c.section}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.class_id && (
                      <p className="text-red-500 text-sm">Please select a class</p>
                    )}
                  </div>

                  {/* Section */}
                  <div className="space-y-2">
                    <Label htmlFor="class_section" className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-500" />
                      Section <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="class_section"
                      value={form.class_section}
                      onChange={(e) => handleChange("class_section", e.target.value)}
                      placeholder="e.g., A"
                      className={validationErrors.class_section ? "border-red-500" : ""}
                    />
                    {validationErrors.class_section && (
                      <p className="text-red-500 text-sm">Section is required</p>
                    )}
                  </div>

                  {/* Admission Date */}
                  <div className="space-y-2">
                    <Label htmlFor="enrollment_date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Admission Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="enrollment_date"
                      type="date"
                      value={form.enrollment_date}
                      onChange={(e) => handleChange("enrollment_date", e.target.value)}
                      className={validationErrors.enrollment_date ? "border-red-500" : ""}
                    />
                    {validationErrors.enrollment_date && (
                      <p className="text-red-500 text-sm">Admission date is required</p>
                    )}
                  </div>

                  {/* Fee Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admission_fee" className="flex items-center gap-2">
                        <IndianRupeeIcon className="h-4 w-4 text-gray-500" />
                        Admission Fee
                      </Label>
                      <div className="relative">
                        <IndianRupeeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="admission_fee"
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.admission_fee}
                          onChange={(e) => handleChange("admission_fee", e.target.value)}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthly_fee" className="flex items-center gap-2">
                        <IndianRupeeIcon className="h-4 w-4 text-gray-500" />
                        Monthly Fee
                      </Label>
                      <div className="relative">
                        <IndianRupeeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="monthly_fee"
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.monthly_fee}
                          onChange={(e) => handleChange("monthly_fee", e.target.value)}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill Summary */}
              {(form.admission_fee || form.monthly_fee) && !isEditMode && (
                <BillSummary 
                  admissionFee={parseFloat(form.admission_fee) || 0}
                  monthlyFee={parseFloat(form.monthly_fee) || 0}
                />
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/students")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {isEditMode ? "Updating..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {isEditMode ? "Update Student" : "Admit Student"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Quick Tips Card */}
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-800 mb-2">Quick Tips</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Ensure all required fields (marked with *) are filled</li>
                  <li>• Upload a clear, recent photo for the student ID card</li>
                  <li>• Double-check roll number to avoid duplicates</li>
                  <li>• Verify admission date matches official records</li>
                  <li>• Fees will be automatically populated when you select a class</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Printable Bill Dialog */}
      <Dialog open={showBill} onOpenChange={setShowBill}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupeeIcon className="h-5 w-5" />
              Fee Receipt
            </DialogTitle>
          </DialogHeader>
          
          <div className="border rounded-lg p-4 bg-gray-50">
            <PrintableBill 
              ref={billRef}
              student={newStudent}
              schoolName={schoolName}
              admissionFee={parseFloat(newStudent?.admission_fee) || 0}
              monthlyFee={parseFloat(newStudent?.monthly_fee) || 0}
            />
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button onClick={handlePrintBill} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
            <Button onClick={handlePrintAndClose} variant="outline" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Print & Close
            </Button>
            <Button variant="outline" onClick={() => {
              setShowBill(false);
              navigate("/students");
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
