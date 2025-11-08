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
  getAll: () => api.get('/timetable'), // 🆕 super admin
  getByClass: (classId, params = {}) => api.get(`/timetable/class/${classId}`, { params }),
  create: (data) => api.post('/timetable', data),
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
  getAll: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data)
};

export const libraryApi = {
  getBooks: () => api.get('/library/books'),
  addBook: (data) => api.post('/library/books', data),
  issueBook: (data) => api.post('/library/loans', data),
  getStudentLoans: (studentId) => api.get(`/library/loans/student/${studentId}`)
};

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
  getStats: () => api.get('/dashboard/stats')
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



export default api;