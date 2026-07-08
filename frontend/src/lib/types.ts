export type Course = {
  _id?: string;
  id?: string;
  courseCode: string;
  courseName: string;
  description?: string;
  credits: number;
  schedule?: string;
  isActive?: boolean;
};

export type Student = {
  _id?: string;
  id?: string;
  studentId: number;
  name: string;
  fatherName?: string;
  email: string;
  address?: string;
  cnic: string | number;
  phone: string | number;
  cgpa?: number;
  courses?: Course[];
  isActive?: boolean;
};

export type Mark = {
  _id?: string;
  id?: string;
  studentId: string | number;
  courseId: number;
  marksObtained: number;
  grade: string;
  isActive?: boolean;
  courseName?: string;
};
