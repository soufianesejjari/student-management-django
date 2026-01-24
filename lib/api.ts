import axios from 'axios';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';

// Create Axios Instance
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8009/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add Token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getCookie('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for Token Refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the request is for login (don't refresh token for login requests)
    const isLoginRequest = originalRequest.url?.includes('/auth/token/');

    // Prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest) {
      originalRequest._retry = true;

      try {
        const refresh = getCookie('refresh_token');
        if (!refresh) {
            // No refresh token, logout
            deleteCookie('access_token');
            deleteCookie('refresh_token');
            window.location.href = '/login';
            return Promise.reject(error);
        }

        const response = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
            refresh: refresh
        });

        const { access } = response.data;
        
        // Update cookie
        setCookie('access_token', access);

        // Update header
        axiosInstance.defaults.headers['Authorization'] = `Bearer ${access}`;
        originalRequest.headers['Authorization'] = `Bearer ${access}`;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, force logout
        deleteCookie('access_token');
        deleteCookie('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
    // Generic methods
    get: (url: string, config?: any) => axiosInstance.get(url, config),
    post: (url: string, data?: any, config?: any) => axiosInstance.post(url, data, config),
    put: (url: string, data?: any, config?: any) => axiosInstance.put(url, data, config),
    patch: (url: string, data?: any, config?: any) => axiosInstance.patch(url, data, config),
    delete: (url: string, config?: any) => axiosInstance.delete(url, config),

    auth: {
        login: (data: any) => axiosInstance.post('/auth/token/', data),
        refreshToken: (data: any) => axiosInstance.post('/auth/token/refresh/', data),
    },
    students: {
        list: () => axiosInstance.get('/users/students/').then(res => res.data),
        get: (id: string) => axiosInstance.get(`/users/students/${id}/`).then(res => res.data),
        create: (data: any) => axiosInstance.post('/users/students/', data).then(res => res.data),
        update: (id: string, data: any) => axiosInstance.patch(`/users/students/${id}/`, data).then(res => res.data),
    },
    teachers: {
        list: () => axiosInstance.get('/users/teachers/').then(res => res.data),
    },
    courses: {
        list: () => axiosInstance.get('/academics/courses/').then(res => res.data),
        get: (id: string) => axiosInstance.get(`/academics/courses/${id}/`).then(res => res.data),
        create: (data: any) => axiosInstance.post('/academics/courses/', data).then(res => res.data),
        update: (id: string, data: any) => axiosInstance.patch(`/academics/courses/${id}/`, data).then(res => res.data),
        sessions: (id: string) => axiosInstance.get(`/academics/courses/${id}/sessions/`).then(res => res.data),
    },
    enrollments: {
        list: (params?: any) => axiosInstance.get('/academics/enrollments/', { params }).then(res => res.data),
        create: (data: any) => axiosInstance.post('/academics/enrollments/', data).then(res => res.data),
        get: (id: string) => axiosInstance.get(`/academics/enrollments/${id}/`).then(res => res.data),
        suggestPrice: (data: { student_id: number, course_id: number }) => 
            axiosInstance.post('/academics/enrollments/suggest-price/', data).then(res => res.data),
    },
    subscriptions: {
        list: (params?: any) => axiosInstance.get('/academics/subscriptions/', { params }).then(res => res.data),
    },
    payments: {
        list: (params?: any) => axiosInstance.get('/finances/payments/', { params }).then(res => res.data),
        create: (data: any) => axiosInstance.post('/finances/payments/', data).then(res => res.data),
    },
    subjects: {
        list: () => axiosInstance.get('/academics/subjects/').then(res => res.data),
    },
    rooms: {
        list: () => axiosInstance.get('/planning/rooms/').then(res => res.data),
    },
    planning: {
        createSession: (data: any) => axiosInstance.post('/planning/sessions/', data).then(res => res.data),
        checkAvailability: (data: any) => axiosInstance.post('/planning/check-availability/', data).then(res => res.data),
        suggestSlots: (data: any) => axiosInstance.post('/planning/suggest-slots/', data).then(res => res.data),
        getTeacherSessions: (teacherId: number, year: number, month: number) => 
            axiosInstance.get(`/planning/teacher/${teacherId}/sessions/`, { params: { year, month } }).then(res => res.data),
        updateSessionAttendance: (teacherId: number, data: any) => 
            axiosInstance.patch(`/planning/teacher/${teacherId}/sessions/`, data).then(res => res.data),
    }
};

export default api;
