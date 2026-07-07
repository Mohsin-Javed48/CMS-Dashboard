import { http } from "./http";
import type { Student } from "../lib/types";

export const teacherService = {
  getAllStudents: async (): Promise<Student[]> => {
    return http.get<Student[]>("/student");
  },

  getStudent: async (studentId: string | number): Promise<Student> => {
    return http.get<Student>(`/student/${studentId}`);
  },
};
