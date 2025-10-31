import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true
});

export const schoolsApi = {
  getAll: () => api.get('/schools'),
  getOne: (id) => api.get(`/schools/${id}`),
  create: (data) => api.post('/schools', data)
};

export const studentsApi = {
  getAll: () => api.get('/students'),
  getOne: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data)
};

export const attendanceApi = {
  mark: (data) => api.post('/attendance', data),
  getByStudent: (studentId) => api.get(`/attendance/student/${studentId}`)
};

export const gradesApi = {
  add: (data) => api.post('/grades', data),
  getByStudent: (studentId) => api.get(`/grades/student/${studentId}`)
};

export const classesApi = {
  getAll: () => api.get('/classes'),
  create: (data) => api.post('/classes', data)
};

export const timetableApi = {
  getByClass: (classId) => api.get(`/timetable/class/${classId}`),
  create: (data) => api.post('/timetable', data)
};

export const feesApi = {
  getByStudent: (studentId) => api.get(`/fees/student/${studentId}`),
  create: (data) => api.post('/fees', data),
  pay: (feeId, paymentMethod) => api.patch(`/fees/${feeId}/pay?payment_method=${paymentMethod}`)
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

export default api;