"use client";

import React, { useEffect, useMemo, useState } from "react";
import MarksTable from "../../components/MarksTable";
import { studentService } from "../../services/studentService";
import { marksService } from "../../services/marksService";
import { courseService } from "../../services/courseService";

import type { Mark, Student } from "../../lib/types";

export default function StudentPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [allCourses, setAllCourses] = useState<
    import("../../lib/types").Course[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // during development use a fixed test id; remove the unused `user` variable
      const currentStudent = await studentService.getStudentById("1001");
      const allMarks = await marksService.getMarks(
        String(currentStudent.studentId),
      );
      // fetch all available courses for enrollment
      try {
        const courses = await courseService.getCourses();
        setAllCourses(courses);
      } catch (err) {
        setAllCourses([]);
      }
      setStudent(currentStudent);
      setMarks(
        allMarks.filter(
          (mark) => String(mark.studentId) === String(currentStudent.studentId),
        ),
      );
      setLoading(false);
    };

    load().catch(() => {
      setStudent(null);
      setMarks([]);
      setLoading(false);
    });
  }, []);

  const enrolledCourses = useMemo(() => student?.courses ?? [], [student]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="cms-card p-8 text-center">
          <p className="text-slate-700">Loading student profile...</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="cms-card p-8 text-center">
          <p className="text-slate-700">
            No student found. Please login as a student.
          </p>
        </div>
      </main>
    );
  }

  const total = marks.reduce((acc, item) => acc + item.marksObtained, 0);
  const average = marks.length ? Math.round(total / marks.length) : 0;

  return (
    <main className="py-7">
      <section className="cms-container space-y-5">
        <header className="cms-card cms-rise p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student Dashboard
              </p>
              <h1 className="cms-heading mt-2 text-2xl font-bold md:text-3xl">
                {student.name}
              </h1>
              <p className="cms-subtext mt-1 text-sm">
                Student ID {student.studentId} • {student.email}
              </p>
            </div>
            <span
              className={
                student.isActive
                  ? "cms-chip"
                  : "inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              }
            >
              {student.isActive ? "Active Enrollment" : "Inactive"}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                CGPA
              </p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {(student.cgpa ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Courses
              </p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {enrolledCourses.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Average Marks
              </p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {average}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Phone
              </p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {student.phone}
              </p>
            </div>
          </div>
        </header>

        <section className="cms-card cms-rise-delay p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Profile Details
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Father Name
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {student.fatherName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    CNIC
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {student.cnic}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Address
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {student.address}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Enrolled Courses
              </p>
              <div className="mt-4 space-y-3">
                {enrolledCourses.map((course) => (
                  <div
                    key={course._id ?? course.id ?? course.courseCode}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {course.courseName}
                        </p>
                        <p className="text-sm text-slate-600">
                          {course.courseCode}
                        </p>
                      </div>
                      <span className="cms-chip">{course.credits} CR</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {course.schedule}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cms-card cms-rise-delay p-3 md:p-4">
          <MarksTable marks={marks} editable={false} />
        </section>

        <section className="cms-card cms-rise-delay p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Available Courses
          </p>
          <div className="mt-4 space-y-3">
            {allCourses.map((course) => {
              const enrolled = enrolledCourses.some(
                (c) =>
                  String(c._id ?? c.id ?? c.courseCode) ===
                  String(course._id ?? course.id ?? course.courseCode),
              );
              return (
                <div
                  key={course._id ?? course.id ?? course.courseCode}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {course.courseName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {course.courseCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="cms-chip">{course.credits} CR</span>
                    <button
                      className="cms-button cms-button-primary"
                      disabled={enrolled}
                      onClick={async () => {
                        try {
                          const studentIdentifier =
                            student._id ?? String(student.studentId);
                          await studentService.enrollCourse(
                            course._id ?? course.id ?? course.courseCode,
                            studentIdentifier,
                          );
                          // refresh enrolled courses
                          const updated =
                            await studentService.getStudentById("1001");
                          setStudent(updated);
                          alert("Enrolled successfully");
                        } catch (err) {
                          console.error(err);
                          alert("Failed to enroll");
                        }
                      }}
                    >
                      {enrolled ? "Enrolled" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

// EnrollForm removed — replaced by available courses list UI above.
