import axios from 'axios';

const TOKEN_KEY = 'pmart_auth_token';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const setAccessToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// One shared refresh in flight; concurrent 401s wait for it instead of each refreshing.
let refreshPromise = null;
const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const AUTH_PAGES = ['/login', '/register', '/activate'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) return Promise.reject(error);

    const url = config.url || '';
    const isAuthEndpoint = /\/auth\/(login|register|refresh|google|activate)/.test(url);

    // Expired access token: try a silent refresh once, then replay the request.
    if (response.status === 401 && !config._retried && !isAuthEndpoint && getAccessToken()) {
      config._retried = true;
      try {
        const token = await refreshSession();
        config.headers.Authorization = `Bearer ${token}`;
        return apiClient(config);
      } catch (refreshError) {
        // Only an explicit rejection of the refresh token ends the session. A network error or 5xx
        // (server restarting, proxy hiccup) keeps it so the next request can try again.
        const status = refreshError.response?.status;
        if (status !== 401 && status !== 403) return Promise.reject(error);
        setAccessToken(null);
        window.dispatchEvent(new Event('pmart:session-expired'));
      }
    }

    if (response.status === 403 && response.data?.code === 'MUST_CHANGE_PASSWORD' && window.location.pathname !== '/account/change-password') {
      window.location.assign('/account/change-password');
    }

    if (response.status === 401 && !isAuthEndpoint && !AUTH_PAGES.includes(window.location.pathname)) {
      setAccessToken(null);
      window.dispatchEvent(new Event('pmart:session-expired'));
    }

    return Promise.reject(error);
  }
);

/** Extracts a user-facing message from an API error. */
export const apiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message === 'Network Error') return 'Cannot reach the server. Check your connection and try again.';
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  return error.message || fallback;
};

export default apiClient;
