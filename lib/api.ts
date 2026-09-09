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

// Share identical write requests while the first one is still running. This
// prevents rapid double-clicks from creating or updating the same record twice.
const inFlightMutations = new Map<string, Promise<any>>();

const mutationRequest = (
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: any,
  config?: any,
) => {
  const key = `${method}:${url}:${JSON.stringify(data ?? null)}:${JSON.stringify(config?.params ?? null)}`;
  const existingRequest = inFlightMutations.get(key);
  if (existingRequest) return existingRequest;

  const request = axiosInstance.request({ ...config, method, url, data });
  inFlightMutations.set(key, request);

  const release = () => {
    if (inFlightMutations.get(key) === request) {
      inFlightMutations.delete(key);
    }
  };
  request.then(release, release);

  return request;
};

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
    post: (url: string, data?: any, config?: any) => mutationRequest('post', url, data, config),
    put: (url: string, data?: any, config?: any) => mutationRequest('put', url, data, config),
    patch: (url: string, data?: any, config?: any) => mutationRequest('patch', url, data, config),
    delete: (url: string, config?: any) => mutationRequest('delete', url, config?.data, config),

    auth: {
        login: (data: any) => mutationRequest('post', '/auth/token/', data),
        refreshToken: (data: any) => mutationRequest('post', '/auth/token/refresh/', data),
    },
    users: {
        /** Current authenticated user profile */
        me: () => axiosInstance.get('/users/users/me/').then(res => res.data),
        /** Update own profile (username/email/name/avatar — no password) */
        updateMe: (data: Partial<{ username: string; email: string; first_name: string; last_name: string }>) =>
            mutationRequest('patch', '/users/users/me/update/', data).then(res => res.data),
        /** Change own password (requires current password) */
        changePassword: (data: { current_password: string; new_password: string }) =>
            mutationRequest('post', '/users/users/me/change-password/', data).then(res => res.data),
    },
    students: {
        list: () => axiosInstance.get('/users/students/').then(res => res.data),
        get: (id: string) => axiosInstance.get(`/users/students/${id}/`).then(res => res.data),
        create: (data: any) => mutationRequest('post', '/users/students/', data).then(res => res.data),
        update: (id: string, data: any) => mutationRequest('patch', `/users/students/${id}/`, data).then(res => res.data),
    },
    teachers: {
        list: () => axiosInstance.get('/users/teachers/').then(res => res.data),
    },
    courses: {
        list: () => axiosInstance.get('/academics/courses/').then(res => res.data),
        get: (id: string) => axiosInstance.get(`/academics/courses/${id}/`).then(res => res.data),
        create: (data: any) => mutationRequest('post', '/academics/courses/', data).then(res => res.data),
        update: (id: string, data: any) => mutationRequest('patch', `/academics/courses/${id}/`, data).then(res => res.data),
        sessions: (id: string) => axiosInstance.get(`/academics/courses/${id}/sessions/`).then(res => res.data),
    },
    academicYears: {
        list: () => axiosInstance.get('/academics/academic-years/').then(res => res.data),
        current: () => axiosInstance.get('/academics/academic-years/current/').then(res => res.data),
        create: (data: any) => mutationRequest('post', '/academics/academic-years/', data).then(res => res.data),
        update: (id: number, data: any) => mutationRequest('patch', `/academics/academic-years/${id}/`, data).then(res => res.data),
        activate: (id: number) => mutationRequest('post', `/academics/academic-years/${id}/activate/`).then(res => res.data),
    },
    enrollments: {
        list: (params?: any) => axiosInstance.get('/academics/enrollments/', { params }).then(res => res.data),
        create: (data: any) => mutationRequest('post', '/academics/enrollments/', data).then(res => res.data),
        get: (id: string) => axiosInstance.get(`/academics/enrollments/${id}/`).then(res => res.data),
        update: (id: string | number, data: any) => mutationRequest('patch', `/academics/enrollments/${id}/`, data).then(res => res.data),
        offerSettings: (student_id?: number) =>
            axiosInstance.get('/academics/offer-settings/', { params: student_id ? { student_id } : {} }).then(res => res.data),
        updateOfferSettings: (data: {
            enabled?: boolean;
            free_course_id?: number | null;
            max_times?: number;
            school?: Record<string, string>;
            student_fees?: { registration_fee?: number | string; insurance_fee?: number | string };
        }) =>
            mutationRequest('patch', '/academics/offer-settings/update/', data).then(res => res.data),
        suggestPrice: (data: { student_id: number, course_id: number }) =>
            mutationRequest('post', '/academics/enrollments/suggest-price/', data).then(res => res.data),
    },
    subscriptions: {
        list: (params?: any) => axiosInstance.get('/academics/subscriptions/', { params }).then(res => res.data),
        syncDue: (data?: any) => mutationRequest('post', '/academics/subscriptions/sync-due/', data || {}).then(res => res.data),
    },
    studentFees: {
        list: (params?: any) => axiosInstance.get('/academics/student-fees/', { params }).then(res => res.data),
        update: (id: string | number, data: any) => mutationRequest('patch', `/academics/student-fees/${id}/`, data).then(res => res.data),
    },
    payments: {
        list: (params?: any) => axiosInstance.get('/finances/payments/', { params }).then(res => res.data),
        create: (data: any) => mutationRequest('post', '/finances/payments/', data).then(res => res.data),
    },
    subjects: {
        list: () => axiosInstance.get('/academics/subjects/').then(res => res.data),
    },
    rooms: {
        list: () => axiosInstance.get('/planning/rooms/').then(res => res.data),
    },
    planning: {
        createSession: (data: any) => mutationRequest('post', '/planning/sessions/', data).then(res => res.data),
        checkAvailability: (data: any) => mutationRequest('post', '/planning/check-availability/', data).then(res => res.data),
        suggestSlots: (data: any) => mutationRequest('post', '/planning/suggest-slots/', data).then(res => res.data),
        getTeacherSessions: (teacherId: number, year: number, month: number) => 
            axiosInstance.get(`/planning/teacher/${teacherId}/sessions/`, { params: { year, month } }).then(res => res.data),
        updateSessionAttendance: (teacherId: number, data: any) => 
            mutationRequest('patch', `/planning/teacher/${teacherId}/sessions/`, data).then(res => res.data),
    },
    // -----------------------------------------------------------------------
    // Role & permission management (admin only)
    // -----------------------------------------------------------------------
    secretaires: {
        /** List all secretaire users */
        list: () => axiosInstance.get('/users/secretaires/').then(res => res.data),
        /** Get single secretaire */
        get: (id: number) => axiosInstance.get(`/users/secretaires/${id}/`).then(res => res.data),
        /** Create a new secretaire account */
        create: (data: { username: string; email: string; first_name: string; last_name: string; password?: string }) =>
            mutationRequest('post', '/users/secretaires/', data).then(res => res.data),
        /** Update basic info of a secretaire */
        update: (id: number, data: Partial<{ username: string; email: string; first_name: string; last_name: string; is_active: boolean }>) =>
            mutationRequest('patch', `/users/secretaires/${id}/`, data).then(res => res.data),
        /** Delete a secretaire account */
        delete: (id: number) => mutationRequest('delete', `/users/secretaires/${id}/`).then(res => res.data),
        /** Get current permissions of a secretaire */
        getPermissions: (id: number) =>
            axiosInstance.get(`/users/secretaires/${id}/permissions/`).then(res => res.data),
        /** Assign additional permissions (does not remove existing ones) */
        assignPermissions: (id: number, permissionIds: number[]) =>
            mutationRequest('post', `/users/secretaires/${id}/permissions/assign/`, { permission_ids: permissionIds }).then(res => res.data),
        /** Revoke specific permissions */
        revokePermissions: (id: number, permissionIds: number[]) =>
            mutationRequest('post', `/users/secretaires/${id}/permissions/revoke/`, { permission_ids: permissionIds }).then(res => res.data),
        /** Replace ALL permissions at once */
        setPermissions: (id: number, permissionIds: number[]) =>
            mutationRequest('post', `/users/secretaires/${id}/permissions/set/`, { permission_ids: permissionIds }).then(res => res.data),
    },
    permissions: {
        /** Full catalogue of delegatable Django permissions, grouped by app */
        available: () => axiosInstance.get('/users/available-permissions/').then(res => res.data),
    },
    admins: {
        /** List all admin accounts */
        list: () => axiosInstance.get('/users/admins/').then(res => res.data),
        /** Get a single admin */
        get: (id: number) => axiosInstance.get(`/users/admins/${id}/`).then(res => res.data),
        /** Create a new admin account */
        create: (data: { username: string; email: string; first_name: string; last_name: string; password: string }) =>
            mutationRequest('post', '/users/admins/', data).then(res => res.data),
        /** Update an admin account */
        update: (id: number, data: Partial<{ username: string; email: string; first_name: string; last_name: string; is_active: boolean; password: string }>) =>
            mutationRequest('patch', `/users/admins/${id}/`, data).then(res => res.data),
        /** Delete an admin account */
        delete: (id: number) => mutationRequest('delete', `/users/admins/${id}/`).then(res => res.data),
    },
    notifications: {
        sendStudentSchedules: (ids?: number[]) =>
            mutationRequest('post', '/notifications/students/send-schedule/', ids ? { ids } : {}).then(res => res.data),
        sendTeacherSchedules: (ids?: number[]) =>
            mutationRequest('post', '/notifications/teachers/send-schedule/', ids ? { ids } : {}).then(res => res.data),
    },
};

export default api;
