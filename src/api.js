import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000
});

let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => {
    authToken = token;
};

export const setUnauthorizedHandler = (handler) => {
    onUnauthorized = handler;
};

api.interceptors.request.use((config) => {
    if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && authToken && onUnauthorized) onUnauthorized();
        return Promise.reject(error);
    }
);

export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    if (error.response?.data?.error) return error.response.data.error;
    if (!error.response) return 'Cannot reach the server. Please check your connection.';
    return fallback;
};

export default api;
