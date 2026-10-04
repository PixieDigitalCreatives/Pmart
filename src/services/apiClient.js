import axios from 'axios';

// Base API Client configured for future backend integration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to attach JWT token when backend provides auth
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pmart_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[PMart API] Session unauthorized or expired');
      localStorage.removeItem('pmart_auth_token');
      localStorage.removeItem('pmart_user');
      
      // Do not force redirect to login if it was just the initial auth check
      // or if we are already on the login/profile-completion pages
      const isAuthCheck = error.config && error.config.url && (
        error.config.url.includes('/users/profile') || error.config.url.includes('/auth/me')
      );
      const isAuthPage = ['/login', '/complete-profile'].includes(window.location.pathname);
      if (!isAuthCheck && !isAuthPage) {
        window.location.href = '/login';
      }
    }
    if (error.response && error.response.status === 403 && error.response.data?.code === 'NEEDS_PASSWORD_ENROLLMENT') {
      if (window.location.pathname !== '/set-password') {
        window.location.href = '/set-password';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
