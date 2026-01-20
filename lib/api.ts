import axios from 'axios';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';

// Create Axios Instance
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8009/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add Token
api.interceptors.request.use(
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
api.interceptors.response.use(
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
        api.defaults.headers['Authorization'] = `Bearer ${access}`;
        originalRequest.headers['Authorization'] = `Bearer ${access}`;

        return api(originalRequest);
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

export default api;
