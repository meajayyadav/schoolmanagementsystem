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
export const feesApi = {
  getAll: (params) => api.get('/fees', { params }), // ✅ Added
  create: (data) => api.post('/fees', data),
  getByStudent: (student_id) => api.get(`/fees/student/${student_id}`),
  pay: (fee_id, data) => api.patch(`/fees/${fee_id}/pay`, data),
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

export const examsApi = {
  getAll: () => api.get('/exams'),
  create: (data) => api.post('/exams', data)
};

export const reportCardsApi = {
  getByStudent: (studentId) => api.get(`/report-cards/student/${studentId}`),
  create: (data) => api.post('/report-cards', data)
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
  getAll: (params) => api.get('/classes', { params }), // full backend structure
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
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
  getAll: () => api.get('/subjects'),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  remove: (id) => api.delete(`/subjects/${id}`),
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

export default api;