import Layout from '@/components/Layout';
import { useState, useEffect } from 'react';
import { examMarksApi, examsApi, classesApi, subjectsApi } from '@/api';

export default function ExamMarksEntry() {
  const [filters, setFilters] = useState({
    school_id: '',
    academic_year: '2024-2025',
    exam_type: '',
    class_id: '',
    section: '',
    subject_id: ''
  });
  
  const [filterOptions, setFilterOptions] = useState({
    examTypes: [],
    classes: [],
    sections: ['A', 'B', 'C', 'D'],
    subjects: []
  });
  
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [markDistribution, setMarkDistribution] = useState({});
  const [loadingFilters, setLoadingFilters] = useState({
    examTypes: false,
    classes: false,
    subjects: false
  });
  const [examStatus, setExamStatus] = useState(null);
  const [examInfo, setExamInfo] = useState(null);

  // Load filter options from respective APIs
  useEffect(() => {
    loadExamTypes();
    loadClasses();
    loadSubjects();
  }, []);

  // Check exam status and load students when filters change
useEffect(() => {
  if (filters.class_id && filters.section && filters.subject_id && filters.exam_type && filters.actual_exam_id) {
    checkExamStatusAndLoadStudents();
  }
}, [filters.class_id, filters.section, filters.subject_id, filters.exam_type, filters.actual_exam_id]);

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
    
    // Group by exam name but store all exam data
    const examGroups = examTypesData
      .filter(exam => exam.id && exam.name && exam.subject_id)
      .reduce((groups, exam) => {
        const examName = exam.name.trim();
        if (!groups[examName]) {
          groups[examName] = {
            id: examName, // Use name as ID for grouping
            name: examName,
            exams: [exam] // Store all individual exam records
          };
        } else {
          groups[examName].exams.push(exam);
        }
        return groups;
      }, {});

    const uniqueExamTypes = Object.values(examGroups).map(group => ({
      id: group.id,
      name: group.name,
      display_name: group.exams.length > 1 
        ? `${group.name} (${group.exams.length} subjects)`
        : group.name,
      exams: group.exams, // Store all individual exams
      subject_count: group.exams.length
    }));

    console.log('Grouped exam types with all exams:', uniqueExamTypes);
    
    setFilterOptions(prev => ({
      ...prev,
      examTypes: uniqueExamTypes,
      // Store the mapping for exam-subject relationships
      examSubjectMapping: Object.fromEntries(
        uniqueExamTypes.flatMap(group => 
          group.exams.map(exam => [
            `${group.id}_${exam.subject_id}`, // Create a composite key
            {
              exam_group_id: group.id,
              actual_exam_id: exam.id,
              subject_id: exam.subject_id,
              exam_name: exam.name
            }
          ])
        )
      )
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

  const loadSubjects = async () => {
    setLoadingFilters(prev => ({ ...prev, subjects: true }));
    try {
      const response = await subjectsApi.getAll();
      
      const subjectsData = response.data || [];
      
      setFilterOptions(prev => ({
        ...prev,
        subjects: subjectsData.map(subject => ({
          id: subject.id,
          name: subject.name,
          code: subject.code
        }))
      }));
    } catch (error) {
      console.error('Error loading subjects:', error);
      setFilterOptions(prev => ({
        ...prev,
        subjects: [
          { id: 'math', name: 'Mathematics' },
          { id: 'science', name: 'Science' },
          { id: 'english', name: 'English' },
          { id: 'social', name: 'Social Studies' },
          { id: 'computer', name: 'Computer Science' }
        ]
      }));
    } finally {
      setLoadingFilters(prev => ({ ...prev, subjects: false }));
    }
  };

  // Check exam status before loading students
const checkExamStatusAndLoadStudents = async () => {
  setIsLoading(true);
  try {
    // Use actual_exam_id for the API call
    const statusResponse = await examMarksApi.checkExamStatus({
      ...filters,
      exam_type: filters.actual_exam_id // Use the actual exam ID
    });
    const statusData = statusResponse.data;
    
    setExamStatus(statusData.status);
    setExamInfo({
      name: statusData.exam_name,
      date: statusData.exam_date,
      message: statusData.message
    });

    if (statusData.status === 'completed') {
      // If exam is completed, load students and mark distribution
      await loadStudents();
      await loadMarkDistribution();
    } else {
      // If exam is not completed, clear students
      setStudents([]);
      setMarksData({});
      setMarkDistribution({});
    }
  } catch (error) {
    console.error('Error checking exam status:', error);
    setExamStatus('error');
    setExamInfo({
      message: 'Error checking exam status'
    });
    setStudents([]);
    setMarksData({});
    setMarkDistribution({});
  } finally {
    setIsLoading(false);
  }
};
const loadStudents = async () => {
  try {
    console.log('Loading students with filters:', filters);
    
    // Prepare API parameters with actual_exam_id
    const apiParams = {
      ...filters,
      exam_type: filters.exam_type // Keep the grouped exam type for identification
    };
    
    // Add actual_exam_id if available
    if (filters.actual_exam_id) {
      apiParams.actual_exam_id = filters.actual_exam_id;
    }

    const response = await examMarksApi.getStudentsForMarks(apiParams);
    
    const responseData = response.data || {};
    const studentsData = responseData.students || [];
    const existingMarksData = responseData.existingMarks || [];
    
    console.log('Students response:', responseData);
    console.log('Students found:', studentsData);
    console.log('Existing marks:', existingMarksData);
    
    setStudents(studentsData);
    
    // Load existing marks if any
    if (existingMarksData.length > 0) {
      const existingMarks = {};
      existingMarksData.forEach(mark => {
        existingMarks[mark.student_id] = mark;
      });
      setMarksData(existingMarks);
    } else {
      setMarksData({});
    }
  } catch (error) {
    console.error('Error loading students:', error);
    setStudents([]);
    setMarksData({});
  }
};

const loadMarkDistribution = async () => {
  try {
    const apiParams = {
      subject_id: filters.subject_id,
      exam_type: filters.exam_type, // Keep grouped exam type
      class_id: filters.class_id
    };

    // Add actual_exam_id if available
    if (filters.actual_exam_id) {
      apiParams.actual_exam_id = filters.actual_exam_id;
    }

    const response = await examMarksApi.getMarkDistribution(apiParams);
    
    const distributionData = response.data || {};
    setMarkDistribution(distributionData);
  } catch (error) {
    console.error('Error loading mark distribution:', error);
    setMarkDistribution({
      max_marks: 100,
      theory_max: 80,
      practical_max: 20,
      project_max: 0,
      oral_max: 0
    });
  }
};

const handleFilterChange = (field, value) => {
  const newFilters = {
    ...filters,
    [field]: value
  };

  // Handle exam type and subject selection logic
  if (field === 'exam_type') {
    // When exam type changes, reset subject and clear data
    newFilters.subject_id = '';
    setMarksData({});
    setExamStatus(null);
    setExamInfo(null);
    setStudents([]);
  } 
  else if (field === 'subject_id' && value && filters.exam_type) {
    // When subject is selected, we need to find the actual exam ID
    const compositeKey = `${filters.exam_type}_${value}`;
    const examMapping = filterOptions.examSubjectMapping?.[compositeKey];
    
    if (examMapping) {
      // Store the actual exam ID in a separate state or use it in API calls
      newFilters.actual_exam_id = examMapping.actual_exam_id;
    }
  }

  setFilters(newFilters);
  
  // Reset data when key filters change
  if (['class_id', 'subject_id', 'exam_type'].includes(field)) {
    setMarksData({});
    setExamStatus(null);
    setExamInfo(null);
    if (field !== 'subject_id') { // Don't clear students when just changing subject
      setStudents([]);
    }
  }
};

  // ... rest of the functions remain the same (handleMarksChange, calculateTotal, etc.)

  const handleMarksChange = (studentId, field, value) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        student_id: studentId
      }
    }));
  };

  const calculateTotal = (studentId) => {
    const studentMarks = marksData[studentId] || {};
    const theory = parseFloat(studentMarks.theory_marks) || 0;
    const practical = parseFloat(studentMarks.practical_marks) || 0;
    const project = parseFloat(studentMarks.project_marks) || 0;
    const oral = parseFloat(studentMarks.oral_marks) || 0;
    return theory + practical + project + oral;
  };

  const calculatePercentage = (total) => {
    const maxMarks = markDistribution.max_marks || 100;
    return maxMarks > 0 ? ((total / maxMarks) * 100).toFixed(2) : 0;
  };

  const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 33) return 'E';
    return 'F';
  };

  const handleSubmit = async () => {
  const marksWithValues = Object.values(marksData).filter(mark => 
    mark.theory_marks || mark.practical_marks || mark.project_marks || mark.oral_marks
  );

  if (marksWithValues.length === 0) {
    setSaveStatus('error');
    setTimeout(() => setSaveStatus(''), 3000);
    return;
  }

  setIsLoading(true);
  setSaveStatus('saving');
  
  try {
    const payload = {
      ...filters,
      marks: marksWithValues,
      mark_distribution: markDistribution
    };

    // If we have actual_exam_id, use it for saving marks
    if (filters.actual_exam_id) {
      payload.exam_type = filters.actual_exam_id;
    }

    console.log('Saving marks with payload:', payload);

    await examMarksApi.saveMarks(payload);
    setSaveStatus('success');
  } catch (error) {
    console.error('Error saving marks:', error);
    setSaveStatus('error');
  } finally {
    setIsLoading(false);
    setTimeout(() => setSaveStatus(''), 3000);
  }
};

  const isFormValid = () => {
    return filters.academic_year && filters.exam_type && filters.class_id && 
           filters.section && filters.subject_id;
  };

  const hasStudents = students.length > 0;

  const LoadingSpinner = ({ size = 'small' }) => (
    <div className={`flex items-center justify-center ${size === 'large' ? 'py-12' : 'py-2'}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${
        size === 'large' ? 'h-8 w-8' : 'h-4 w-4'
      }`}></div>
      {size === 'large' && <span className="ml-2 text-gray-600">Loading...</span>}
    </div>
  );

  // Function to get status message
  const getStatusMessage = () => {
    if (!isFormValid()) {
      return 'Please select all filters to check exam status';
    }
    
    if (examStatus === 'completed') {
      return hasStudents ? '' : 'No students found for selected criteria';
    }
    
    return examInfo?.message || 'Checking exam status...';
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="staff-page">
        <div className="page-header mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Exam Marks Entry</h1>
          <p className="text-gray-600 mt-2">Manage and enter student examination marks</p>
        </div>

        {/* Filters Section */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Selection Filters</h2>
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
                <option value="">Select Section</option>
                {filterOptions.sections?.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
          {/* Subject */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Subject
  </label>
  {loadingFilters.subjects ? (
    <LoadingSpinner />
  ) : (
    <select
      value={filters.subject_id}
      onChange={(e) => handleFilterChange('subject_id', e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled={!filters.exam_type}
    >
      <option value="">Select Subject</option>
      {filters.exam_type ? (
        // Show only subjects for the selected exam type
        filterOptions.examTypes
          ?.find(exam => exam.id === filters.exam_type)
          ?.exams.map(exam => (
            <option key={exam.subject_id} value={exam.subject_id}>
              {filterOptions.subjects?.find(s => s.id === exam.subject_id)?.name || `Subject ${exam.subject_id}`}
            </option>
          ))
      ) : (
        // Show all subjects if no exam type selected
        filterOptions.subjects?.map(sub => (
          <option key={sub.id} value={sub.id}>{sub.name}</option>
        ))
      )}
    </select>
  )}
</div>
          </div>
        </div>

        {/* Exam Status Indicator */}
        {examStatus && (
          <div className={`mb-4 p-4 rounded-md border ${
            examStatus === 'completed' 
              ? 'bg-green-100 border-green-400 text-green-700'
              : examStatus === 'scheduled'
              ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  {examStatus === 'completed' ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  ) : examStatus === 'scheduled' ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  )}
                </svg>
                <div>
                  <span className="font-semibold">
                    {examStatus === 'completed' 
                      ? 'Exam Completed - Marks Entry Available'
                      : examStatus === 'scheduled'
                      ? 'Exam Scheduled - Awaiting Completion'
                      : 'Exam Not Available'
                    }
                  </span>
                  {examInfo?.name && (
                    <p className="text-sm mt-1">
                      {examInfo.name} {examInfo.date && `- ${new Date(examInfo.date).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mark Distribution Info */}
        {examStatus === 'completed' && markDistribution.max_marks && (
          <div className="card mb-4 p-4 bg-blue-50 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Mark Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>Total Marks: <span className="font-semibold">{markDistribution.max_marks}</span></div>
              {markDistribution.theory_max > 0 && <div>Theory: <span className="font-semibold">{markDistribution.theory_max}</span></div>}
              {markDistribution.practical_max > 0 && <div>Practical: <span className="font-semibold">{markDistribution.practical_max}</span></div>}
              {markDistribution.project_max > 0 && <div>Project: <span className="font-semibold">{markDistribution.project_max}</span></div>}
              {markDistribution.oral_max > 0 && <div>Oral: <span className="font-semibold">{markDistribution.oral_max}</span></div>}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Student Marks {filters.subject_id && `- ${filterOptions.subjects?.find(s => s.id === filters.subject_id)?.name}`}
          </h2>
          <div className="flex gap-3">
            <button
              disabled={!isFormValid() || examStatus !== 'completed'}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bulk Entry
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid() || !hasStudents || examStatus !== 'completed'}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && saveStatus === 'saving' ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            Marks saved successfully!
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            Error saving marks. Please try again.
          </div>
        )}

        {/* Marks Entry Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <LoadingSpinner size="large" />
          ) : examStatus === 'completed' && hasStudents ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roll No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    {markDistribution.theory_max > 0 && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Theory
                      </th>
                    )}
                    {markDistribution.practical_max > 0 && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Practical
                      </th>
                    )}
                    {markDistribution.project_max > 0 && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                    )}
                    {markDistribution.oral_max > 0 && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Oral
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student, index) => {
                    const total = calculateTotal(student.id);
                    const percentage = calculatePercentage(total);
                    const grade = calculateGrade(percentage);
                    
                    return (
                      <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.roll_number || student.roll_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.full_name || student.name}
                        </td>
                        {markDistribution.theory_max > 0 && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max={markDistribution.theory_max}
                              value={marksData[student.id]?.theory_marks || ''}
                              onChange={(e) => handleMarksChange(student.id, 'theory_marks', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={`0-${markDistribution.theory_max}`}
                            />
                          </td>
                        )}
                        {markDistribution.practical_max > 0 && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max={markDistribution.practical_max}
                              value={marksData[student.id]?.practical_marks || ''}
                              onChange={(e) => handleMarksChange(student.id, 'practical_marks', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={`0-${markDistribution.practical_max}`}
                            />
                          </td>
                        )}
                        {markDistribution.project_max > 0 && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max={markDistribution.project_max}
                              value={marksData[student.id]?.project_marks || ''}
                              onChange={(e) => handleMarksChange(student.id, 'project_marks', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={`0-${markDistribution.project_max}`}
                            />
                          </td>
                        )}
                        {markDistribution.oral_max > 0 && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max={markDistribution.oral_max}
                              value={marksData[student.id]?.oral_marks || ''}
                              onChange={(e) => handleMarksChange(student.id, 'oral_marks', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={`0-${markDistribution.oral_max}`}
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {percentage}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            grade === 'A+' ? 'bg-green-100 text-green-800' :
                            grade === 'A' ? 'bg-green-50 text-green-700' :
                            grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            grade === 'D' ? 'bg-orange-100 text-orange-800' :
                            grade === 'E' ? 'bg-orange-50 text-orange-700' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={marksData[student.id]?.remarks || ''}
                            onChange={(e) => handleMarksChange(student.id, 'remarks', e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Remarks"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <p className="text-gray-600">
                {getStatusMessage()}
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {examStatus === 'completed' && hasStudents && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600">{students.length}</div>
              <div className="text-gray-600">Total Students</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600">
                {students.filter(s => calculateGrade(calculatePercentage(calculateTotal(s.id))) !== 'F').length}
              </div>
              <div className="text-gray-600">Passed</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-red-600">
                {students.filter(s => calculateGrade(calculatePercentage(calculateTotal(s.id))) === 'F').length}
              </div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-purple-600">
                {((students.filter(s => calculateGrade(calculatePercentage(calculateTotal(s.id))) !== 'F').length / students.length) * 100).toFixed(1)}%
              </div>
              <div className="text-gray-600">Pass Percentage</div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}