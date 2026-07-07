import { http } from './http';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: 'student' | 'teacher';
    name: string;
  };
}

export interface RefreshTokenResponse {
  access_token: string;
}

/**
 * Auth Service
 * Handles authentication-related API calls
 */
export const authService = {
  /**
   * Login user with email and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await http.post<LoginResponse>('/auth/login', data);
    // Store token if returned
    if (response.access_token) {
      try {
        localStorage.setItem('ucms_token', response.access_token);
        localStorage.setItem('ucms_user', JSON.stringify(response.user));
      } catch (e) {}
    }
    return response;
  },

  /**
   * Logout user and clear tokens
   */
  logout: async (): Promise<void> => {
    try {
      await http.post('/auth/logout', {});
    } catch (e) {
      // Still clear local storage even if logout fails
    }
    try {
      localStorage.removeItem('ucms_token');
      localStorage.removeItem('ucms_user');
    } catch (e) {}
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    return http.post<RefreshTokenResponse>('/auth/refresh', {});
  },

  /**
   * Get current logged in user
   */
  getCurrentUser: async () => {
    return http.get('/auth/me');
  },

  /**
   * Verify token validity
   */
  verifyToken: async (token: string) => {
    return http.post('/auth/verify', { token });
  },
};
