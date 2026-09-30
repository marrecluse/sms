// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  login:   (data) => api.post('/auth?action=login', data),
  me:      ()     => api.get('/auth?action=me'),
  logout:  ()     => api.post('/auth?action=logout'),
  refresh: ()     => api.post('/auth?action=refresh'),
};

// ── Users ─────────────────────────────────────────────────
export const usersAPI = {
  list:         (role)      => api.get('/users' + (role ? `?role=${role}` : '')),
  get:          (id)        => api.get(`/users?id=${id}`),
  create:       (data)      => api.post('/users', data),
  update:       (id, d)     => api.put(`/users?id=${id}`, d),
  remove:       (id)        => api.delete(`/users?id=${id}`),
  uploadAvatar: (id, file)  => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(api.post(`/users?action=upload_avatar&id=${id}`, { image: base64, mime_type: file.type }));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }),
};

// ── Dashboard ─────────────────────────────────────────────
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// ── Attendance ────────────────────────────────────────────
export const attendanceAPI = {
  get:    (params) => api.get('/attendance', { params }),
  mark:   (data)   => api.post('/attendance', data),
  update: (id, d)  => api.put(`/attendance?id=${id}`, d),
};

// ── Assignments ───────────────────────────────────────────
export const assignmentsAPI = {
  list:   (params)       => api.get('/assignments', { params }),
  get:    (id)           => api.get(`/assignments?id=${id}`),
  create: (data)         => api.post('/assignments', data),
  update: (id, d)        => api.put(`/assignments?id=${id}`, d),
  remove: (id)           => api.delete(`/assignments?id=${id}`),
  submit: (data)         => api.post('/assignments?action=submit', data),
  grade:  (subId, data)  => api.post(`/assignments?action=grade&submission_id=${subId}`, data),
};

// ── Grades ────────────────────────────────────────────────
export const gradesAPI = {
  get:  (params) => api.get('/grades', { params }),
  save: (data)   => api.post('/grades', data),
};

// ── Notifications ─────────────────────────────────────────
export const notificationsAPI = {
  list:     ()     => api.get('/notifications'),
  create:   (data) => api.post('/notifications', data),
  markRead: (id)   => api.post(`/notifications?action=read${id ? `&id=${id}` : ''}`),
};

// ── Courses ───────────────────────────────────────────────
export const coursesAPI = {
  list:   ()      => api.get('/courses'),
  get:    (id)    => api.get(`/courses?id=${id}`),
  create: (data)  => api.post('/courses', data),
  update: (id, d) => api.put(`/courses?id=${id}`, d),
  remove: (id)    => api.delete(`/courses?id=${id}`),
};

// ── Quizzes ───────────────────────────────────────────────
export const quizzesAPI = {
  list:    (params) => api.get('/quizzes', { params }),
  get:     (id)     => api.get(`/quizzes?id=${id}`),
  create:  (data)   => api.post('/quizzes', data),
  update:  (id, d)  => api.put(`/quizzes?id=${id}`, d),
  remove:  (id)     => api.delete(`/quizzes?id=${id}`),
  attempt: (quizId) => api.post(`/quizzes?action=attempt&quiz_id=${quizId}`),
  submit:  (data)   => api.post('/quizzes?action=submit', data),
  results: (quizId) => api.get(`/quizzes?action=results&quiz_id=${quizId}`),
};

// ── Books / Library ───────────────────────────────────────
export const booksAPI = {
  list:        (params)          => api.get('/books', { params }),
  get:         (id)              => api.get(`/books?id=${id}`),
  add:         (data)            => api.post('/books', data),
  update:      (id, d)           => api.put(`/books?id=${id}`, d),
  remove:      (id)              => api.delete(`/books?id=${id}`),
  issue:       (data)            => api.post('/books?action=issue', data),
  return:      (issueId, data)   => api.post(`/books?action=return&issue_id=${issueId}`, data || {}),
  issued:      (params)          => api.get('/books?action=issued', { params }),
  myIssued:    ()                => api.get('/books?action=my_issued'),
  stats:       ()                => api.get('/books?action=stats'),
  extend:      (issueId, data)   => api.post(`/books?action=extend&issue_id=${issueId}`, data),
  markFinePaid:(issueId)         => api.post(`/books?action=mark_fine_paid&issue_id=${issueId}`),
  allHistory:  (params)          => api.get('/books?action=all_history', { params }),
  myHistory:   ()                => api.get('/books?action=my_history'),
  uploadPdf:      (id, file)          => {
    const fd = new FormData();
    fd.append('pdf', file);
    return api.post(`/books?action=upload_pdf&id=${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removePdf:      (id)                => api.post(`/books?action=remove_pdf&id=${id}`),
  requestBook:    (data)              => api.post('/books?action=request_book', data),
  myRequests:     ()                  => api.get('/books?action=my_requests'),
  allRequests:    (status = 'pending')=> api.get(`/books?action=all_requests&status=${status}`),
  handleRequest:  (id, status, note)  => api.post(`/books?action=handle_request&id=${id}`, { status, note }),
};

// ── Academic ──────────────────────────────────────────────
export const academicAPI = {
  getDepartments:   ()           => api.get('/academic?entity=departments'),
  createDepartment: (data)       => api.post('/academic?entity=departments', data),
  updateDepartment: (id, data)   => api.put(`/academic?entity=departments&id=${id}`, data),
  deleteDepartment: (id)         => api.delete(`/academic?entity=departments&id=${id}`),
  getPrograms:      (deptId)     => api.get('/academic?entity=programs' + (deptId ? `&department_id=${deptId}` : '')),
  createProgram:    (data)       => api.post('/academic?entity=programs', data),
  updateProgram:    (id, data)   => api.put(`/academic?entity=programs&id=${id}`, data),
  deleteProgram:    (id)         => api.delete(`/academic?entity=programs&id=${id}`),
  getSemesters:     ()           => api.get('/academic?entity=semesters'),
  createSemester:   (data)       => api.post('/academic?entity=semesters', data),
  updateSemester:   (id, data)   => api.put(`/academic?entity=semesters&id=${id}`, data),
  deleteSemester:   (id)         => api.delete(`/academic?entity=semesters&id=${id}`),
  getCourses:       (params)     => api.get('/academic?entity=courses', { params }),
  createCourse:     (data)       => api.post('/academic?entity=courses', data),
  updateCourse:     (id, data)   => api.put(`/academic?entity=courses&id=${id}`, data),
  deleteCourse:     (id)         => api.delete(`/academic?entity=courses&id=${id}`),
  getEnrollments:   (params)     => api.get('/academic?entity=enrollments', { params }),
  createEnrollment: (data)       => api.post('/academic?entity=enrollments', data),
  updateEnrollment: (id, data)   => api.put(`/academic?entity=enrollments&id=${id}`, data),
  deleteEnrollment: (id)         => api.delete(`/academic?entity=enrollments&id=${id}`),
  getStats:         ()           => api.get('/academic?entity=stats'),
};

export default api;