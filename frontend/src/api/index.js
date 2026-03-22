import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true
});

export const schoolsApi = {
  getAll: () => api.get('/schools'),
  getOne: (id) => api.get(`/schools/${id}`),
  create: (data) => api.post('/schools', data),
  update: (id, data) => api.put(`/schools/${id}`, data),
  delete: (id) => api.delete(`/schools/${id}`),
};


export const studentsApi = {
  getAll: (params) => api.get('/students', { params }),
  create: (data) =>
    api.post('/students', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) =>
    api.put(`/students/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/students/${id}`),
};
// Student Promotion API
export const studentPromotionApi = {
  // Promote students to next class
  promoteStudents: (data) => api.post('/students/promote', data),
  
  // Get student academic history
  getAcademicHistory: (studentId, params = {}) => 
    api.get(`/students/${studentId}/academic-history`, { params }),
  
  // Get promotion batches
  getPromotionBatches: (params = {}) => 
    api.get('/students/promotion-batches', { params }),
  
  // Bulk update student class
  bulkUpdateClass: (data) => api.post('/students/bulk-update-class', data),
};
export const attendanceApi = {
  getAll: (params) => api.get('/attendance', { params }),
  create: (data) => api.post('/attendance', data),
};

export const gradesApi = {
  getAll: (params) => api.get('/grades', { params }), // supports filters & pagination
  create: (data) => api.post('/grades', data),
  getByStudent: (studentId, params = {}) => api.get(`/grades/student/${studentId}`, { params }),
};



export const timetableApi = {
  // 🆕 super admin - get all timetables across all schools
  getAll: () => api.get('/timetable'),
  
  // Get timetable for specific class
  getByClass: (classId, params = {}) => api.get(`/timetable/class/${classId}`, { params }),
  
  // Get single timetable entry by ID
  getById: (id, params = {}) => api.get(`/timetable/${id}`, { params }),
  
  // Create new timetable entry
  create: (data) => api.post('/timetable', data),
  
  // Update existing timetable entry
  update: (id, data) => api.put(`/timetable/${id}`, data),
  
  // Delete timetable entry
  delete: (id, params = {}) => api.delete(`/timetable/${id}`, { params }),
  
  // Filter timetable entries by multiple criteria
  filter: (params = {}) => api.get('/timetable/filter', { params }),
};



// export const feesApi = {
//   getByStudent: (studentId) => api.get(`/fees/student/${studentId}`),
//   create: (data) => api.post('/fees', data),
//   pay: (feeId, paymentMethod) => api.patch(`/fees/${feeId}/pay?payment_method=${paymentMethod}`)
// };
 // frontend global api index.js
export const feesApi = {
  getAll: (params) => api.get('/fees', { params }),
  create: (data) => api.post('/fees', data),
  getByStudent: (studentId) => api.get(`/fees/student/${studentId}`),
  pay: (feeId, data) => api.patch(`/fees/${feeId}/pay`, data),
  updatePayment: (feeId, data) => api.patch(`/fees/${feeId}/payment`, data),
  delete: (schoolId, feeId) => api.delete(`/fees/${schoolId}/${feeId}`),
  getStatistics: (params) => api.get('/fees/statistics', { params }),
  getFeeTypes: (params) => api.get('/fees/types', { params }),
  
  // Fee slip methods with proper parameter handling
  getSlips: (params = {}) => {
    const apiParams = { ...params };
    
    // Clean parameters for API - convert 'all' to empty strings
    Object.keys(apiParams).forEach(key => {
      if (apiParams[key] === 'all') {
        apiParams[key] = '';
      }
    });
    
    // Remove empty values to avoid sending unnecessary params
    Object.keys(apiParams).forEach(key => {
      if (apiParams[key] === '' || apiParams[key] === null || apiParams[key] === undefined) {
        delete apiParams[key];
      }
    });
    
    return api.get('/fee-slip/slips', { params: apiParams });
  },
  
  getSlipStats: (params = {}) => {
    const apiParams = { ...params };
    
    // Clean parameters
    if (apiParams.school_id === 'all') apiParams.school_id = '';
    if (apiParams.start_date === '') delete apiParams.start_date;
    if (apiParams.end_date === '') delete apiParams.end_date;
    
    // Remove empty values
    Object.keys(apiParams).forEach(key => {
      if (apiParams[key] === '' || apiParams[key] === null || apiParams[key] === undefined) {
        delete apiParams[key];
      }
    });
    
    return api.get('/fee-slip/slips/stats', { params: apiParams });
  },
  
  getSlipById: (id) => {
    if (!id) {
      throw new Error('Fee slip ID is required');
    }
    return api.get(`/fee-slip/slips/${id}`);
  },
  
  downloadSlip: (id) => {
    if (!id) {
      throw new Error('Fee slip ID is required');
    }
    return api.get(`/fee-slip/slips/${id}/download`, { 
      responseType: 'blob' 
    });
  },
  
  // Optional: Generate PDF
  generateSlipPdf: (id) => {
    if (!id) {
      throw new Error('Fee slip ID is required');
    }
    return api.get(`/fee-slip/slips/${id}/pdf`, {
      responseType: 'blob'
    });
  }
};



export const announcementsApi = {
  getAll: (params) => api.get('/announcements', { params }),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  getUnreadCount: () => api.get('/announcements/unread-count'),
  markAsRead: (id) => api.post(`/announcements/${id}/mark-read`),

  // ✅ add this new one
  markAllAsRead: () => api.post('/announcements/mark-all-read'),
};

export const libraryApi = {
  // Get books - with school_id for super admin
  getBooks: (params = {}) => {
    return api.get('/library/books', { params });
  },

  // Add book - with school_id for super admin
  addBook: (data) => {
    return api.post('/library/books', data);
  },

  // Update book
  updateBook: (id, data) => {
    return api.put(`/library/books/${id}`, data);
  },

  // Delete book
  deleteBook: (id) => {
    return api.delete(`/library/books/${id}`);
  },

  // Get all loans - with school_id for super admin
  getAllLoans: (params = {}) => {
    return api.get('/library/loans', { params });
  },

  // Get student loans
  getStudentLoans: (studentId) => {
    return api.get(`/library/loans/student/${studentId}`);
  },

  // Issue book
  issueBook: (data) => {
    return api.post('/library/loans/issue', data);
  },

  // Return book
  returnBook: (loanId) => {
    return api.put(`/library/loans/${loanId}/return`);
  },

  // Get overdue loans
  getOverdueLoans: (params = {}) => {
    return api.get('/library/loans/overdue', { params });
  }
}

// api/index.js - Update examsApi
export const examsApi = {
  getAll: () => api.get('/exams'),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  
  // NEW: Add these for exam students and completed exams
  getCompleted: (params = {}) => api.get('/exams/completed', { params }),
  getStudents: (id, params = {}) => api.get(`/exams/${id}/students`, { params })
};

// api/index.js - Add to your existing APIs
export const reportCardsApi = {
  getFilters: (params) => api.get('/report-cards/filters', { params }),
  getStudentReportCards: (params) => api.get('/report-cards/students', { params }),
  generatePdf: (data) => api.post('/report-cards/generate-pdf', data)
};

export const staffApi = {
  getAll: () => api.get('/staff'),
  add: (data) => api.post('/staff', data)
};

export const dashboardApi = {
  getStats: (params = {}) => api.get('/dashboard/stats', { params }),
};

// ✅ Teachers API
export const teachersApi = {
  getAll: (params) => api.get('/teachers', { params }),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
};
// export const classesApi = {
//   getAll: (params) => api.get('/classes', { params }), // ✅ supports ?school_id=
//   create: (data) => api.post('/classes', data),
//   update: (id, data) => api.put(`/classes/${id}`, data), // ✅ for toggle (active/deactive)
//   delete: (id) => api.delete(`/classes/${id}`), // optional
// };
export const classesApi = {
  getAll: (params) => api.get('/classes', { params }),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  // Fix: Use the correct endpoint format
  getBySchool: (schoolId) => api.get(`/classes?school_id=${schoolId}`)
};



// user management
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleActive: (id, is_active) => api.put(`/users/${id}/toggle`, { is_active }),
  updateProfile: (id, data) => api.put(`/users/${id}`, data),

  // ✅ New
  edit: (id, data) => api.put(`/users/${id}/edit`, data),
  resetPassword: (id, new_password) =>
    api.put(`/users/${id}/reset-password`, { new_password }),
};

export const subjectsApi = {
  getAll: (params) => api.get('/subjects', { params }),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  remove: (id) => api.delete(`/subjects/${id}`),
  // Fix: Use the correct endpoint format
  getBySchool: (schoolId) => api.get(`/subjects?school_id=${schoolId}`)
};


export const systemCodesApi = {
  getAll: (params) => api.get('/system-code', { params }),
  create: (data) => api.post('/system-code', data),
  update: (id, data) => api.put(`/system-code/${id}`, data),
  delete: (id) => api.delete(`/system-code/${id}`),
};

export const menusApi = {
  getAll: (params = {}) => api.get('/menus', { params }),
  getMyMenu: () => api.get('/menus/my-menu'),
  create: (data) => api.post('/menus', data),
  update: (id, data) => api.put(`/menus/${id}`, data),
  delete: (id) => api.delete(`/menus/${id}`),
  reorder: (data) => api.put('/menus/reorder', data)
};
// api/index.js - Add this to your existing API file

// api/index.js
export const bulkUploadApi = {
  // Download template
  downloadTemplate: () => 
    api.get('/bulkUpload/students/template', { 
      responseType: 'blob' 
    }),
  
  // Bulk upload students
  bulkUpload: (formData, config) => 
    api.post('/bulkUpload/students', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data' 
      },
      onUploadProgress: config?.onUploadProgress,
      ...config
    }),
};
// api/index.js - Add to your existing API file

export const examMarksApi = {
  getStudentsForMarks: (params) => api.get('/exam-marks/students', { params }),
  getMarkDistribution: (params) => api.get('/exam-marks/distribution', { params }),
  saveMarks: (data) => api.post('/exam-marks', data),
  saveBulkMarks: (data) => api.post('/exam-marks/bulk', data),
  getExistingMarks: (params) => api.get('/exam-marks', { params }),
  
  // NEW: Add exam status check
  checkExamStatus: (params) => api.get('/exam-marks/check-status', { params })
};
// Reports API - Following your exact pattern
export const reportsApi = {
  // 📊 Get reports data with advanced filtering
  getReportsData: (params) => api.get('/reports', { params }),
  
  // 📋 Get available report templates and configurations
  getReportTemplates: () => api.get('/reports/templates'),
  
  // 💾 Export report in various formats (PDF, Excel, CSV)
  exportReport: (data) => api.post('/reports/export', data),
  
  // ⏰ Schedule automated report generation
  scheduleReport: (data) => api.post('/reports/schedule', data),
};

// Salary API
export const salaryApi = {
  // Get all salaries with filtering and pagination
  getAll: (params) => api.get('/salary', { params }),
  
  // Get salary by ID
  getById: (id, params = {}) => api.get(`/salary/${id}`, { params }),
  
  // Create new salary record
  create: (data) => api.post('/salary', data),
  
  // Update salary record
  update: (id, data) => api.put(`/salary/${id}`, data),
  
  // Delete salary record
  delete: (id, params = {}) => api.delete(`/salary/${id}`, { params }),
  
  // Pay salary (mark as paid)
  pay: (id, data) => api.patch(`/salary/${id}/pay`, data),
  
  // Get salary statistics
  getStatistics: (params = {}) => api.get('/salary/statistics', { params }),
  
  // Get employees (teachers/staff) for salary assignment
  getEmployees: (params = {}) => api.get('/salary/employees', { params }),
};

// Pending Fees API
export const pendingFeesApi = {
  // Get all pending fees (single list)
  getAll: (params = {}) => api.get('/pending-fees/all', { params }),
  
  // Get classes for filter dropdown
  getClasses: (params = {}) => api.get('/pending-fees/classes', { params }),
  
  // Get pending fees grouped by class
  getByClass: (params = {}) => api.get('/pending-fees/by-class', { params }),
  
  // Get pending fees grouped by month
  getByMonth: (params = {}) => api.get('/pending-fees/by-month', { params }),
  
  // Send WhatsApp reminder
  sendReminder: (data) => api.post('/pending-fees/send-reminder', data),
  
  // Generate UPI QR code
  getQRCode: (params = {}) => api.get('/pending-fees/qr-code', { params }),
  
  // Get UPI information
  getUPIInfo: (params = {}) => api.get('/pending-fees/upi-info', { params }),
};

export default api;