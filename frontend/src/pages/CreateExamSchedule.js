import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { examsApi, classesApi, subjectsApi } from '@/api';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Save,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Award,
  Info,
  Plus,
  RotateCcw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToastContainer, Toast } from '@/components/ui/toast';

export default function CreateExamSchedule() {
  const { user, currentSchool } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    class_id: '',
    subject_id: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    total_marks: '',
    passing_marks: '',
    instructions: '',
    status: 'scheduled'
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Check if we're in edit mode
  const isEditMode = !!location.state?.examToEdit;
  const examToEdit = location.state?.examToEdit;

  // Toast management
  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Load initial data
  useEffect(() => {
    if (user?.role !== 'school_admin') {
      navigate('/exams');
      return;
    }

    // Pre-fill form if in edit mode
    if (isEditMode && examToEdit) {
      setFormData({
        name: examToEdit.name || '',
        description: examToEdit.description || '',
        class_id: examToEdit.class_id || '',
        subject_id: examToEdit.subject_id || '',
        exam_date: examToEdit.exam_date ? examToEdit.exam_date.split('T')[0] : '',
        start_time: examToEdit.start_time || '',
        end_time: examToEdit.end_time || '',
        total_marks: examToEdit.total_marks || '',
        passing_marks: examToEdit.passing_marks || '',
        instructions: examToEdit.instructions || '',
        status: examToEdit.status || 'scheduled'
      });
    }

    loadInitialData();
  }, [user, navigate, isEditMode, examToEdit]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadClasses(), loadSubjects()]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      showToast('Failed to load required data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      const classesData = response.data?.data || response.data || [];
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error) {
      console.error('Failed to load classes:', error);
      throw error;
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectsApi.getAll();
      const subjectsData = response.data?.data || response.data || [];
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      throw error;
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Exam name is required';
    if (!formData.class_id) newErrors.class_id = 'Class is required';
    if (!formData.subject_id) newErrors.subject_id = 'Subject is required';
    if (!formData.exam_date) newErrors.exam_date = 'Exam date is required';
    if (!formData.start_time) newErrors.start_time = 'Start time is required';
    if (!formData.end_time) newErrors.end_time = 'End time is required';

    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = 'End time must be after start time';
    }

    if (formData.exam_date) {
      const examDate = new Date(formData.exam_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (examDate < today) {
        newErrors.exam_date = 'Exam date cannot be in the past';
      }
    }

    if (formData.total_marks && formData.passing_marks) {
      const total = parseInt(formData.total_marks);
      const passing = parseInt(formData.passing_marks);
      if (passing > total) {
        newErrors.passing_marks = 'Passing marks cannot exceed total marks';
      }
      if (passing < 0 || total < 0) {
        newErrors.passing_marks = 'Marks cannot be negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    showToast('Please fix the form errors', 'error');
    return;
  }

  setActionLoading(true);
  
  try {
    const examData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      exam_date: formData.exam_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      total_marks: parseInt(formData.total_marks) || 0,
      passing_marks: parseInt(formData.passing_marks) || 0,
      instructions: formData.instructions.trim(),
      status: formData.status,
      school_id: currentSchool?.id // Multi-tenant support
    };

    console.log('Submitting exam data:', {
      isEditMode,
      examId: isEditMode ? examToEdit?.id : 'N/A',
      examData,
      currentSchoolId: currentSchool?.id
    });

    if (isEditMode && examToEdit?.id) {
      const response = await examsApi.update(examToEdit.id, examData);
      console.log('Update response:', response);
      showToast('Exam updated successfully!');
    } else {
      const response = await examsApi.create(examData);
      console.log('Create response:', response);
      showToast('Exam scheduled successfully!');
    }
    
    setTimeout(() => navigate('/exams'), 1500);
    
  } catch (error) {
    console.error('Failed to save exam:', error);
    console.error('Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    const errorMessage = error.response?.data?.detail || error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} exam. Please try again.`;
    showToast(errorMessage, 'error');
  } finally {
    setActionLoading(false);
  }
};

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      class_id: '',
      subject_id: '',
      exam_date: '',
      start_time: '',
      end_time: '',
      total_marks: '',
      passing_marks: '',
      instructions: '',
      status: 'scheduled'
    });
    setErrors({});
    setTouched({});
  };

  const getDuration = () => {
    if (!formData.start_time || !formData.end_time) return null;
    
    const [startHour, startMinute] = formData.start_time.split(':').map(Number);
    const [endHour, endMinute] = formData.end_time.split(':').map(Number);
    
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    const duration = endTotal - startTotal;
    
    if (duration <= 0) return null;
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  };

  const duration = getDuration();

  // Text content based on mode
  const pageTitle = isEditMode ? 'Edit Exam' : 'Schedule New Exam';
  const pageDescription = isEditMode 
    ? 'Update examination details and scheduling information' 
    : 'Create a new examination schedule for your classes and subjects';
  const submitButtonText = isEditMode ? 'Update Exam' : 'Schedule Exam';
  const submitButtonIcon = isEditMode ? <Save size={18} /> : <Plus size={18} />;

  if (user?.role !== 'school_admin') {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30 p-6 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md shadow-lg border-0">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
            <Button 
              onClick={() => navigate('/exams')} 
              className="bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              Back to Exams
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30 p-4 sm:p-6 lg:p-8">
        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`p-4 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 ${
                toast.type === 'error' 
                  ? 'bg-red-50/95 border-red-200 text-red-800' 
                  : 'bg-green-50/95 border-green-200 text-green-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${
                  toast.type === 'error' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {toast.type === 'error' ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 hover:opacity-70 transition-opacity"
                >
                  <XCircle size={16} className="opacity-60" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* HEADER */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* <Button
                variant="ghost"
                onClick={() => navigate('/exams')}
                className="p-2 hover:bg-white/50 rounded-xl transition-all duration-200"
              >
                <ArrowLeft size={20} />
              </Button> */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{pageTitle}</h1>
                  {isEditMode && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                      Edit Mode
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm sm:text-base">
                  {pageDescription}
                </p>
                {currentSchool && (
                  <p className="text-sm text-gray-500 mt-1">
                    School: <span className="font-medium">{currentSchool.name}</span>
                  </p>
                )}
              </div>
            </div>
            
            {duration && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock size={16} className="text-blue-600" />
                  <span className="font-medium">Duration:</span>
                  <span className="text-blue-700 font-semibold">{duration}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* FORM SECTION */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/80">
                <div className="p-6 border-b border-gray-200/60 bg-white/50 rounded-t-xl">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    Exam Details
                  </h2>
                  <p className="text-gray-600 mt-1 text-sm">
                    Fill in the examination information below
                  </p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                  {/* Basic Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Exam Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          onBlur={() => handleBlur('name')}
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                            errors.name ? 'border-red-300 bg-red-50/50' : 'border-gray-300/80 hover:border-gray-400'
                          }`}
                          placeholder="e.g., Mid-term Examination, Final Exam"
                        />
                        {errors.name && (
                          <p className="text-red-600 text-sm flex items-center gap-1">
                            <Info size={14} />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Class *
                        </label>
                        <select
                          required
                          value={formData.class_id}
                          onChange={(e) => handleInputChange('class_id', e.target.value)}
                          onBlur={() => handleBlur('class_id')}
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                            errors.class_id ? 'border-red-300 bg-red-50/50' : 'border-gray-300/80 hover:border-gray-400'
                          }`}
                        >
                          <option value="">Select Class</option>
                          {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                        {errors.class_id && (
                          <p className="text-red-600 text-sm flex items-center gap-1">
                            <Info size={14} />
                            {errors.class_id}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Subject *
                        </label>
                        <select
                          required
                          value={formData.subject_id}
                          onChange={(e) => handleInputChange('subject_id', e.target.value)}
                          onBlur={() => handleBlur('subject_id')}
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                            errors.subject_id ? 'border-red-300 bg-red-50/50' : 'border-gray-300/80 hover:border-gray-400'
                          }`}
                        >
                          <option value="">Select Subject</option>
                          {subjects.map(subject => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                          ))}
                        </select>
                        {errors.subject_id && (
                          <p className="text-red-600 text-sm flex items-center gap-1">
                            <Info size={14} />
                            {errors.subject_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Schedule Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Schedule & Timing</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Exam Date *
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="date"
                            required
                            value={formData.exam_date}
                            onChange={(e) => handleInputChange('exam_date', e.target.value)}
                            onBlur={() => handleBlur('exam_date')}
                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                              errors.exam_date ? 'border-red-300 bg-red-50/50' : 'border-gray-300/80 hover:border-gray-400'
                            }`}
                          />
                        </div>
                        {errors.exam_date && (
                          <p className="text-red-600 text-sm flex items-center gap-1">
                            <Info size={14} />
                            {errors.exam_date}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Start Time *
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="time"
                            required
                            value={formData.start_time}
                            onChange={(e) => handleInputChange('start_time', e.target.value)}
                            onBlur={() => handleBlur('start_time')}
                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                              errors.start_time ? 'border-red-300 bg-red-50/50' : 'border-gray-300/80 hover:border-gray-400'
                            }`}
                          />
                        </div>
                        {errors.start_time && (
                          <p className="text-red-600 text-sm flex items-center gap-1">
                            <Info size={14} />
                            {errors.start_time}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          End Time *
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="time"
                            required
                            value={formData.end_time}
                            onChange={(e) => handleInputChange('end_time', e.target.value)}
                            onBlur={() => handleBlur('end_time')}
                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                              errors.end_time ? 'border-red-300 bg-red-50/50' : 'border-gray-300/80 hover:border-gray-400'
                            }`}
                          />
                        </div>
                        {errors.end_time && (
                          <p className="text-red-600 text-sm flex items-center gap-1">
                            <Info size={14} />
                            {errors.end_time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Marks Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Marks & Evaluation</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Total Marks
                        </label>
                        <div className="relative">
                          <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="number"
                            value={formData.total_marks}
                            onChange={(e) => handleInputChange('total_marks', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                            placeholder="100"
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Passing Marks
                        </label>
                        <div className="relative">
                          <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="number"
                            value={formData.passing_marks}
                            onChange={(e) => handleInputChange('passing_marks', e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                              errors.passing_marks ? 'border-red-300 bg-red-50/50' : 'border-gray-300/80 hover:border-gray-400'
                            }`}
                            placeholder="35"
                            min="0"
                          />
                        </div>
                        {errors.passing_marks && (
                          <p className="text-red-600 text-sm flex items-center gap-1">
                            <Info size={14} />
                            {errors.passing_marks}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 resize-none"
                        placeholder="Enter exam description and overview..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Instructions
                      </label>
                      <textarea
                        value={formData.instructions}
                        onChange={(e) => handleInputChange('instructions', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 resize-none"
                        placeholder="Enter specific instructions for students (allowed materials, rules, etc.)..."
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200/60">
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex-1"
                      size="lg"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          {isEditMode ? 'Updating...' : 'Scheduling...'}
                        </>
                      ) : (
                        <>
                          {submitButtonIcon}
                          {submitButtonText}
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={actionLoading}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-8 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 flex-1"
                      size="lg"
                    >
                      <RotateCcw size={18} />
                      Reset Form
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/exams')}
                      disabled={actionLoading}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-8 py-3 rounded-xl font-medium transition-all duration-200 flex-1"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* SIDEBAR - QUICK INFO */}
            <div className="space-y-6">
              {/* Exam Summary */}
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/80 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Info size={18} className="text-blue-600" />
                  Exam Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge 
                      className={
                        formData.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        formData.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        formData.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {formData.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {formData.exam_date && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                      <span className="text-sm text-gray-600">Date</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(formData.exam_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  {formData.start_time && formData.end_time && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                      <span className="text-sm text-gray-600">Time</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formData.start_time} - {formData.end_time}
                      </span>
                    </div>
                  )}
                  
                  {duration && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                      <span className="text-sm text-gray-600">Duration</span>
                      <span className="text-sm font-medium text-gray-900">{duration}</span>
                    </div>
                  )}
                  
                  {formData.total_marks && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Total Marks</span>
                      <span className="text-sm font-medium text-gray-900">{formData.total_marks}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Quick Tips */}
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-blue-50/50 border border-blue-200/50">
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Info size={18} className="text-blue-600" />
                    Quick Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Ensure all required fields are filled</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Double-check date and time scheduling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Verify marks distribution</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Provide clear instructions for students</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}