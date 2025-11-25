import Layout from '@/components/Layout';
import { useState, useEffect } from 'react';
import { reportCardsApi, examsApi, classesApi } from '@/api';

export default function ReportCards() {
  const [filters, setFilters] = useState({
    school_id: '',
    academic_year: '2024-2025',
    exam_type: '',
    class_id: '',
    section: ''
  });
  
  const [filterOptions, setFilterOptions] = useState({
    examTypes: [],
    classes: [],
    sections: ['A', 'B', 'C', 'D']
  });
  
  const [reportCards, setReportCards] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [loadingFilters, setLoadingFilters] = useState({
    examTypes: false,
    classes: false
  });

  // Load filter options from respective APIs
  useEffect(() => {
    loadExamTypes();
    loadClasses();
  }, []);

  // Load report cards when filters change
  useEffect(() => {
    if (filters.academic_year && filters.exam_type && filters.class_id) {
      loadReportCards();
    }
  }, [filters.academic_year, filters.exam_type, filters.class_id, filters.section]);

  const loadExamTypes = async () => {
    setLoadingFilters(prev => ({ ...prev, examTypes: true }));
    try {
      const response = await examsApi.getAll();
      
      let examTypesData = [];
      
      if (Array.isArray(response.data)) {
        examTypesData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        examTypesData = response.data.data;
      } else {
        console.warn('Unexpected exam types response structure:', response);
      }
      
      // Group exams by name to remove duplicates
      const uniqueExamTypes = examTypesData
        .filter(exam => exam.id && exam.name)
        .reduce((acc, exam) => {
          const existingExam = acc.find(e => e.name === exam.name);
          if (!existingExam) {
            acc.push({
              id: exam.id,
              name: exam.name,
              status: exam.status,
              subject_count: 1
            });
          } else {
            existingExam.subject_count++;
          }
          return acc;
        }, [])
        .map(exam => ({
          ...exam,
          display_name: exam.subject_count > 1 
            ? `${exam.name} (${exam.subject_count} subjects)`
            : exam.name
        }));

      setFilterOptions(prev => ({
        ...prev,
        examTypes: uniqueExamTypes
      }));
    } catch (error) {
      console.error('Error loading exam types:', error);
      setFilterOptions(prev => ({
        ...prev,
        examTypes: []
      }));
    } finally {
      setLoadingFilters(prev => ({ ...prev, examTypes: false }));
    }
  };

  const loadClasses = async () => {
    setLoadingFilters(prev => ({ ...prev, classes: true }));
    try {
      const response = await classesApi.getAll();
      
      const classesData = response.data?.data || [];
      
      setFilterOptions(prev => ({
        ...prev,
        classes: classesData
          .filter(cls => cls.is_active !== false)
          .map(cls => ({
            id: cls.id,
            name: cls.name,
            grade: cls.grade,
            section: cls.section
          }))
      }));
    } catch (error) {
      console.error('Error loading classes:', error);
      setFilterOptions(prev => ({
        ...prev,
        classes: [
          { id: '1', name: 'Class 1' },
          { id: '2', name: 'Class 2' },
          { id: '3', name: 'Class 3' },
          { id: '4', name: 'Class 4' },
          { id: '5', name: 'Class 5' },
          { id: '6', name: 'Class 6' },
          { id: '7', name: 'Class 7' },
          { id: '8', name: 'Class 8' },
          { id: '9', name: 'Class 9' },
          { id: '10', name: 'Class 10' },
          { id: '11', name: 'Class 11' },
          { id: '12', name: 'Class 12' }
        ]
      }));
    } finally {
      setLoadingFilters(prev => ({ ...prev, classes: false }));
    }
  };

  const loadReportCards = async () => {
    setIsLoading(true);
    try {
      const response = await reportCardsApi.getStudentReportCards(filters);
      setReportCards(response.data.report_cards || []);
      setSchoolInfo(response.data.school_info);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error loading report cards:', error);
      setReportCards([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (['academic_year', 'exam_type', 'class_id'].includes(field)) {
      setReportCards([]);
      setSummary(null);
    }
  };

  const handleGeneratePDF = async (format = 'individual') => {
    try {
      const response = await reportCardsApi.generatePdf({
        ...filters,
        format
      });
      alert(`PDF generation started: ${response.data.download_url}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'A': return 'bg-gradient-to-r from-green-400 to-green-500';
      case 'B': return 'bg-gradient-to-r from-blue-400 to-blue-500';
      case 'C': return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
      case 'D': return 'bg-gradient-to-r from-orange-400 to-orange-500';
      case 'E': return 'bg-gradient-to-r from-red-400 to-red-500';
      case 'F': return 'bg-gradient-to-r from-red-600 to-red-700';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColor = (status) => {
    return status === 'PASS' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const LoadingSpinner = ({ size = 'small' }) => (
    <div className={`flex items-center justify-center ${size === 'large' ? 'py-12' : 'py-2'}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${
        size === 'large' ? 'h-8 w-8' : 'h-4 w-4'
      }`}></div>
      {size === 'large' && <span className="ml-2 text-gray-600">Loading...</span>}
    </div>
  );

  // Professional Report Card Component
  const ProfessionalReportCard = ({ reportCard }) => {
    const totalMaxMarks = reportCard.subject_results.reduce((sum, subject) => sum + (subject.max_marks || 100), 0);
    const grandTotal = reportCard.overall_result.total_marks;
    const grandPercentage = reportCard.overall_result.percentage;
    const overallGrade = reportCard.overall_result.grade;

    return (
      <div className="bg-white border-2 border-gray-300 rounded-lg shadow-xl overflow-hidden">
        {/* School Header */}
        <div className="bg-blue-800 text-white py-6 px-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{schoolInfo?.name || 'SCHOOL NAME'}</h1>
          <p className="text-blue-100 text-lg">OFFICIAL REPORT CARD</p>
          <p className="text-blue-200 text-sm mt-1">Affiliated with Board of Education</p>
        </div>

        {/* Student and Academic Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">STUDENT INFORMATION</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span className="font-medium text-gray-600">Name:</span>
                  <span className="font-bold text-gray-900">{reportCard.student_info.name}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="font-medium text-gray-600">Roll No:</span>
                  <span className="font-bold text-gray-900">{reportCard.student_info.roll_number}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="font-medium text-gray-600">Father's Name:</span>
                  <span className="font-bold text-gray-900">{reportCard.student_info.father_name || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">ACADEMIC INFORMATION</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span className="font-medium text-gray-600">Class:</span>
                  <span className="font-bold text-gray-900">{reportCard.academic_info.class_name}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="font-medium text-gray-600">Section:</span>
                  <span className="font-bold text-gray-900">{reportCard.student_info.section}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="font-medium text-gray-600">Academic Year:</span>
                  <span className="font-bold text-gray-900">{reportCard.academic_info.academic_year}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="font-medium text-gray-600">Exam:</span>
                  <span className="font-bold text-gray-900">{reportCard.academic_info.exam_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Performance Table */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-center text-gray-800 mb-6 bg-gray-100 py-2 rounded">
            SUBJECT-WISE PERFORMANCE
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Subject</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Theory</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Practical</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Project</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Oral</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Total</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Max Marks</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Percentage</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Grade</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {reportCard.subject_results.map((subject, index) => (
                  <tr key={subject.subject_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-3 font-medium text-gray-900">
                      {subject.subject_name}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                      {subject.theory_marks}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                      {subject.practical_marks}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                      {subject.project_marks}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                      {subject.oral_marks}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">
                      {subject.total_marks}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                      {subject.max_marks || 100}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                      {subject.percentage}%
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white ${getGradeColor(subject.grade)}`}>
                        {subject.grade}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-gray-900 text-sm">
                      {subject.remarks || 'Satisfactory'}
                    </td>
                  </tr>
                ))}
                
                {/* Grand Total Row */}
                <tr className="bg-blue-50 font-bold">
                  <td className="border border-gray-300 px-4 py-3 text-right" colSpan="5">
                    GRAND TOTAL
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center text-blue-800">
                    {grandTotal}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center text-blue-800">
                    {totalMaxMarks}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center text-blue-800">
                    {grandPercentage}%
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white ${getGradeColor(overallGrade)}`}>
                      {overallGrade}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center text-blue-800">
                    {reportCard.overall_result.status}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{reportCard.overall_result.total_subjects}</div>
              <div className="text-sm text-gray-600">Total Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{reportCard.overall_result.subjects_passed}</div>
              <div className="text-sm text-gray-600">Subjects Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{grandPercentage}%</div>
              <div className="text-sm text-gray-600">Overall Percentage</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${reportCard.overall_result.status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                {reportCard.overall_result.status}
              </div>
              <div className="text-sm text-gray-600">Final Result</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 text-white p-4">
          <div className="flex justify-between items-center text-sm">
            <div>
              <p className="font-semibold">Generated On: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            <div className="text-right">
              <p>Class Teacher</p>
              <p>Principal</p>
            </div>
          </div>
          <div className="text-center mt-2 text-gray-300 text-xs">
            <p>This is a computer generated report card. No signature required.</p>
          </div>
        </div>
      </div>
    );
  };

  const StudentCard = ({ reportCard }) => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {reportCard.student_info.picture ? (
            <img 
              src={reportCard.student_info.picture} 
              alt={reportCard.student_info.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {reportCard.student_info.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{reportCard.student_info.name}</h3>
            <p className="text-sm text-gray-600">Roll No: {reportCard.student_info.roll_number}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reportCard.overall_result.status)}`}>
          {reportCard.overall_result.status}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Class</p>
          <p className="font-medium">{reportCard.academic_info.class_name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Section</p>
          <p className="font-medium">{reportCard.student_info.section}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{reportCard.overall_result.percentage}%</p>
          <p className="text-sm text-gray-600">Percentage</p>
        </div>
        <div className="text-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getGradeColor(reportCard.overall_result.grade)}`}>
            {reportCard.overall_result.grade}
          </span>
          <p className="text-sm text-gray-600 mt-1">Grade</p>
        </div>
      </div>

      <button
        onClick={() => setSelectedStudent(reportCard)}
        className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
      >
        View Detailed Report
      </button>
    </div>
  );

  const isFormValid = () => {
    return filters.academic_year && filters.exam_type && filters.class_id;
  };

  const hasReportCards = reportCards.length > 0;

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="report-cards-page">
        <div className="page-header mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Report Cards</h1>
          <p className="text-gray-600 mt-2">Generate and view student academic reports</p>
        </div>

        {/* Filters Section */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Report Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year
              </label>
              <select
                value={filters.academic_year}
                onChange={(e) => handleFilterChange('academic_year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2023-2024">2023-2024</option>
                <option value="2022-2023">2022-2023</option>
              </select>
            </div>

            {/* Exam Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Type
              </label>
              {loadingFilters.examTypes ? (
                <LoadingSpinner />
              ) : (
                <select
                  value={filters.exam_type}
                  onChange={(e) => handleFilterChange('exam_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Exam</option>
                  {filterOptions.examTypes?.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.display_name || type.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              {loadingFilters.classes ? (
                <LoadingSpinner />
              ) : (
                <select
                  value={filters.class_id}
                  onChange={(e) => handleFilterChange('class_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Class</option>
                  {filterOptions.classes?.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <select
                value={filters.section}
                onChange={(e) => handleFilterChange('section', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sections</option>
                {filterOptions.sections?.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card text-center bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-2xl font-bold">{summary.total_students}</div>
              <div className="text-blue-100">Total Students</div>
            </div>
            <div className="card text-center bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="text-2xl font-bold">{summary.students_passed}</div>
              <div className="text-green-100">Passed</div>
            </div>
            <div className="card text-center bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="text-2xl font-bold">{summary.students_failed}</div>
              <div className="text-red-100">Failed</div>
            </div>
            <div className="card text-center bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-2xl font-bold">{summary.pass_percentage}%</div>
              <div className="text-purple-100">Pass Percentage</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-4 py-2 rounded-md ${
                viewMode === 'detailed' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Detailed View
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleGeneratePDF('individual')}
              disabled={!hasReportCards}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Individual PDFs
            </button>
            <button
              onClick={() => handleGeneratePDF('bulk')}
              disabled={!hasReportCards}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Bulk PDF
            </button>
          </div>
        </div>

        {/* Report Cards Display */}
        <div className="card">
          {isLoading ? (
            <LoadingSpinner size="large" />
          ) : selectedStudent ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Detailed Report Card</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Back to List
                </button>
              </div>
              <ProfessionalReportCard reportCard={selectedStudent} />
            </div>
          ) : hasReportCards ? (
            viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportCards.map((reportCard, index) => (
                  <StudentCard key={reportCard.student_info.id} reportCard={reportCard} />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {reportCards.map((reportCard, index) => (
                  <ProfessionalReportCard key={reportCard.student_info.id} reportCard={reportCard} />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600">
                {isFormValid() 
                  ? 'No report cards found. Exam marks need to be entered first for the selected criteria.' 
                  : 'Please select academic year, exam type, and class to view report cards'
                }
              </p>
              {isFormValid() && (
                <p className="text-sm text-gray-500 mt-2">
                  Make sure exam marks are entered for students in Exam Marks Entry section.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}