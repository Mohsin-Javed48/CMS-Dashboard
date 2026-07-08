import { studentService } from "./studentService";
import type { Student } from "../lib/types";

export const teacherService = {
  getAllStudents: async (): Promise<Student[]> => {
    return studentService.getStudents();
  },

  getStudent: async (studentId: string | number): Promise<Student> => {
    return studentService.getStudentById(studentId);
  },
};
