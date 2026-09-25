import axios from 'axios';

// Base API Client configured for future backend integration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
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
      // Role or session expiration handling placeholder
      console.warn('[PMart API] Session unauthorized or expired');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
