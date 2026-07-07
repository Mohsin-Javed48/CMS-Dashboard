import axios, { AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token if available
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('ucms_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // localStorage not available
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem('ucms_token');
        localStorage.removeItem('ucms_user');
      } catch (e) {}
      // Redirect to login or trigger event
    }
    return Promise.reject(error);
  }
);

// Generic request handler
export async function request<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  data?: any,
  config?: any
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await apiClient.request({
      method,
      url: path,
      data,
      ...config,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.status, error.response?.data);
      throw error;
    }
    throw error;
  }
}

// Shorthand methods
export const http = {
  get: <T = any>(path: string, config?: any) => request<T>('GET', path, undefined, config),
  post: <T = any>(path: string, data?: any, config?: any) => request<T>('POST', path, data, config),
  put: <T = any>(path: string, data?: any, config?: any) => request<T>('PUT', path, data, config),
  delete: <T = any>(path: string, config?: any) => request<T>('DELETE', path, undefined, config),
  patch: <T = any>(path: string, data?: any, config?: any) => request<T>('PATCH', path, data, config),
};
