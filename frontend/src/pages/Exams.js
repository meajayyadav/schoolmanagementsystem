import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { examsApi, classesApi, subjectsApi, schoolsApi } from '@/api';
import { Link, useNavigate } from 'react-router-dom'; 
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  Download,
  Eye,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Building
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Exams() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Check user permissions
  const isSuperAdmin = user?.role === 'super_admin';
  const isSchoolAdmin = user?.role === 'school_admin';

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
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadExams(),
        loadClasses(),
        loadSubjects(),
        ...(isSuperAdmin ? [loadSchools()] : [])
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadExams = async () => {
    try {
      const response = await examsApi.getAll();
      const examsData = response.data || [];
      setExams(Array.isArray(examsData) ? examsData : []);
    } catch (error) {
      console.error('Failed to load exams:', error);
      setExams([]);
      showToast('Failed to load exams', 'error');
    }
  };

  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      const classesData = response.data?.data || response.data || [];
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error) {
      console.error('Failed to load classes:', error);
      setClasses([]);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectsApi.getAll();
      const subjectsData = response.data?.data || response.data || [];
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      setSubjects([]);
    }
  };

  const loadSchools = async () => {
    try {
      const response = await schoolsApi.getAll();
      const schoolsData = response.data || [];
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
    } catch (error) {
      console.error('Failed to load schools:', error);
      setSchools([]);
      showToast('Failed to load schools', 'error');
    }
  };

  const handleEditClick = (exam) => {
    navigate('/createExam', { state: { examToEdit: exam } });
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
    
    setActionLoading(true);
    try {
      await examsApi.delete(examId);
      await loadExams();
      showToast('Exam deleted successfully!');
    } catch (error) {
      console.error('Failed to delete exam:', error);
      showToast('Failed to delete exam. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter function
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = !filterClass || exam.class_id === filterClass;
    
    const examStatus = exam.status || getExamStatus(exam);
    const matchesStatus = !filterStatus || examStatus === filterStatus;
    
    // School filter for super admin
    const matchesSchool = !filterSchool || exam.school_id === filterSchool || exam.school_name?.includes(filterSchool);
    
    return matchesSearch && matchesClass && matchesStatus && matchesSchool;
  });

  const getExamStatus = (exam) => {
    if (exam.status && exam.status !== 'scheduled') {
      return exam.status;
    }
    
    if (!exam.exam_date) return 'scheduled';
    
    const now = new Date();
    const examDate = new Date(exam.exam_date);
    const isToday = examDate.toDateString() === now.toDateString();
    
    if (isToday) return 'in_progress';
    if (examDate < now) return 'completed';
    return 'scheduled';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'in_progress': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Clock size={14} />;
      case 'in_progress': return <AlertCircle size={14} />;
      case 'completed': return <CheckCircle2 size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Scheduled';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Not set';
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getClassName = (classId) => {
    return classes.find(c => c.id === classId)?.name || 'Unknown Class';
  };

  const getSubjectName = (subjectId) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
  };

  const getSchoolName = (exam) => {
    // For super admin, show school name if available
    if (isSuperAdmin && exam.school_name) {
      return exam.school_name;
    }
    if (isSuperAdmin && exam.school_id) {
      const school = schools.find(s => s.id === exam.school_id);
      return school?.name || 'Unknown School';
    }
    return null;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/30 p-4 sm:p-6 lg:p-8" data-testid="exams-page">
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Exam Management</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              {isSuperAdmin ? 'Manage examinations across all schools' : 'Schedule and manage examinations across all classes'}
            </p>
            {isSuperAdmin && (
              <p className="text-sm text-gray-500 mt-1">
                Super Admin Mode - Viewing all schools
              </p>
            )}
          </div>
          
          {(isSchoolAdmin || isSuperAdmin) && (
            <Button
              onClick={() => navigate('/createExam')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
              disabled={actionLoading}
            >
              <Plus size={20} />
              Schedule Exam
            </Button>
          )}
        </div>

        {/* FILTERS AND SEARCH */}
        <Card className="p-4 sm:p-6 mb-6 border border-gray-200/60 bg-white shadow-sm">
          <div className={`grid grid-cols-1 ${isSuperAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            {/* School Filter (Super Admin Only) */}
            {isSuperAdmin && (
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={filterSchool}
                  onChange={(e) => setFilterSchool(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">All Schools</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            )}

            {/* Class Filter */}
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>

            {/* Export Button */}
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 h-12 flex items-center gap-2 font-medium"
            >
              <Download size={18} />
              Export
            </Button>
          </div>
        </Card>

        {/* STATS SUMMARY */}
        {!loading && exams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 border border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Total Exams</p>
                  <p className="text-2xl font-bold text-blue-700">{exams.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 border border-amber-200 bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertCircle className="text-amber-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">In Progress</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {exams.filter(exam => getExamStatus(exam) === 'in_progress').length}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 border border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Scheduled</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {exams.filter(exam => getExamStatus(exam) === 'scheduled').length}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 border border-green-200 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Completed</p>
                  <p className="text-2xl font-bold text-green-700">
                    {exams.filter(exam => getExamStatus(exam) === 'completed').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* EXAMS GRID */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredExams.length === 0 ? (
          <Card className="p-12 text-center border border-gray-200/60 bg-white shadow-sm">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {exams.length === 0 ? 'No exams scheduled' : 'No exams found'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {exams.length === 0 
                ? 'Get started by scheduling your first examination for your classes.' 
                : 'Try adjusting your search terms or filters to find what you\'re looking for.'}
            </p>
            {(isSchoolAdmin || isSuperAdmin) && (
              <Button 
                onClick={() => navigate('/createExam')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
              >
                <Plus size={20} className="mr-2" />
                Schedule Your First Exam
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredExams.map((exam) => {
              const status = getExamStatus(exam);
              const className = getClassName(exam.class_id);
              const subjectName = getSubjectName(exam.subject_id);
              const schoolName = getSchoolName(exam);
              
              return (
                <Card key={exam.id} className="p-6 border border-gray-200/60 bg-white hover:shadow-lg transition-all duration-200 group">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {exam.name}
                      </h3>
                      <div className="text-gray-600 text-sm mt-1 space-y-1">
                        <p className="truncate">{className} • {subjectName}</p>
                        {isSuperAdmin && schoolName && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Building size={12} />
                            {schoolName}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(status)} flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium`}>
                      {getStatusIcon(status)}
                      {getStatusText(status)}
                    </Badge>
                  </div>

                  {/* Description */}
                  {exam.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {exam.description}
                    </p>
                  )}

                  {/* Exam Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-700">
                        {formatDate(exam.exam_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-700">
                        {formatTime(exam.start_time)} - {formatTime(exam.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <BookOpen className="text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-700">
                        Marks: {exam.total_marks || 'N/A'} (Pass: {exam.passing_marks || 'N/A'})
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedExam(exam);
                        setShowViewModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-2 px-3 py-2"
                    >
                      <Eye size={16} />
                      View Details
                    </Button>
                    
                    {(isSchoolAdmin || isSuperAdmin) && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          onClick={() => handleEditClick(exam)}
                          disabled={actionLoading}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 p-2"
                        >
                          <Edit3 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteExam(exam.id)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* VIEW EXAM MODAL */}
        {showViewModal && selectedExam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="p-6 border-b border-gray-200 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedExam.name}</h2>
                  <div className="text-gray-600 space-y-1">
                    <p>{getClassName(selectedExam.class_id)} • {getSubjectName(selectedExam.subject_id)}</p>
                    {isSuperAdmin && getSchoolName(selectedExam) && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Building size={14} />
                        {getSchoolName(selectedExam)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Badge className={`${getStatusColor(getExamStatus(selectedExam))} flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium`}>
                    {getStatusIcon(getExamStatus(selectedExam))}
                    {getStatusText(getExamStatus(selectedExam))}
                  </Badge>
                  <Button
                    variant="ghost"
                    onClick={() => setShowViewModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} />
                  </Button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-gray-400 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Exam Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedExam.exam_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="text-gray-400 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Timing</p>
                      <p className="font-medium text-gray-900">
                        {formatTime(selectedExam.start_time)} - {formatTime(selectedExam.end_time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <BookOpen className="text-gray-400 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Total Marks</p>
                      <p className="font-medium text-gray-900">{selectedExam.total_marks || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-gray-400 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Passing Marks</p>
                      <p className="font-medium text-gray-900">{selectedExam.passing_marks || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {selectedExam.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedExam.description}</p>
                  </div>
                )}

                {selectedExam.instructions && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Instructions</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{selectedExam.instructions}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => setShowViewModal(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}