import { http } from "./http";
import type { Student } from "../lib/types";

export const studentService = {
  getStudents: async (): Promise<Student[]> => {
    return http.get<Student[]>("/student");
  },

  getStudentById: async (studentId: string | number): Promise<Student> => {
    return http.get<Student>(`/student/${studentId}`);
  },

  createStudent: async (data: Partial<Student>): Promise<Student> => {
    return http.post<Student>("/student", data);
  },

  enrollCourse: async (
    courseId: string,
    studentId: string | number,
  ): Promise<Student> => {
    return http.post<Student>(`/student/${courseId}/enroll/${studentId}`);
  },
};
