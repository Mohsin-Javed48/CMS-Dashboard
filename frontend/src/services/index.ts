// Main export file for all services
export { authService } from './authService';
export { studentService } from './studentService';
export { teacherService } from './teacherService';
export { marksService } from './marksService';
export { http, apiClient, request } from './http';

// Re-export types
export type { LoginRequest, LoginResponse, RefreshTokenResponse } from './authService';
export type { Student } from '../lib/types';
export type { Course, Mark } from '../lib/types';
