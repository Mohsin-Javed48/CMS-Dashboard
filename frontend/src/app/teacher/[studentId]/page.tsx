"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MarksTable from "../../../components/MarksTable";
import { studentService } from "../../../services/studentService";
import { marksService } from "../../../services/marksService";
import type { Mark, Student } from "../../../lib/types";

function buildMarksForCourses(student: Student, existingMarks: Mark[]): Mark[] {
  const marksByCourseId = new Map(
    existingMarks.map((mark) => [String(mark.courseId), mark]),
  );

  return (student.courses ?? []).map((course) => {
    const courseId = Number(course.id ?? course._id ?? course.courseCode);
    return (
      marksByCourseId.get(String(courseId)) ?? {
        studentId: student.studentId,
        courseId,
        courseName: course.courseName,
        marksObtained: 0,
        grade: "",
        isActive: true,
      }
    );
  });
}

export default function StudentDetailPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeStudentId, setRouteStudentId] = useState<number | null>(null);

  const loadData = async (studentId: number) => {
    const currentStudent = await studentService.getStudentById(studentId);
    const allMarks = await marksService.getMarks(
      String(currentStudent.studentId),
    );
    setStudent(currentStudent);
    setMarks(buildMarksForCourses(currentStudent, allMarks));
  };

  useEffect(() => {
    const parts = window.location.pathname.split("/");
    const idFromUrl = Number(parts[parts.length - 1]);

    if (Number.isNaN(idFromUrl)) {
      setStudent(null);
      setMarks([]);
      setLoading(false);
      return;
    }

    setRouteStudentId(idFromUrl);
    loadData(idFromUrl)
      .catch(() => {
        setStudent(null);
        setMarks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const enrolledCourses = useMemo(() => student?.courses ?? [], [student]);

  if (loading) {
    return (
      <main className="min-h-screen p-6">
        <div className="cms-container">
          <div className="cms-card p-8 text-center">
            Loading student profile...
          </div>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="min-h-screen p-6">
        <div className="cms-container">
          <div className="cms-card p-8">Student not found.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-7">
      <section className="cms-container space-y-5">
        <header className="cms-card cms-rise p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student Profile
              </p>
              <h1 className="cms-heading mt-2 text-2xl font-bold md:text-3xl">
                {student.name}
              </h1>
              <p className="cms-subtext mt-1 text-sm">
                Student ID {student.studentId} • {student.email}
              </p>
            </div>
            <Link href="/teacher" className="cms-button cms-button-secondary">
              Back to Students
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                CGPA
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {(student.cgpa ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Phone
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {student.phone}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Courses
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {enrolledCourses.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Status
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {student.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Enrolled Courses
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {enrolledCourses.map((course) => (
                <span
                  key={course._id ?? course.id ?? course.courseCode}
                  className="cms-chip"
                >
                  {course.courseCode}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="cms-card cms-rise-delay p-3 md:p-4">
          <MarksTable
            marks={marks}
            editable
            onSave={async (updatedMarks) => {
              try {
                await Promise.all(
                  updatedMarks.map((mark) =>
                    mark.id || mark._id
                      ? marksService.updateMark(String(mark.id ?? mark._id), {
                          marksObtained: mark.marksObtained,
                          grade: mark.grade,
                          isActive: mark.isActive,
                        })
                      : marksService.createMark({
                          studentId: String(mark.studentId),
                          courseId: mark.courseId,
                          marksObtained: mark.marksObtained,
                          grade: mark.grade,
                          isActive: mark.isActive ?? true,
                        }),
                  ),
                );
                if (routeStudentId !== null) {
                  await loadData(routeStudentId);
                }
                alert("Marks updated successfully.");
              } catch (error) {
                console.error(error);
                alert("Failed to update marks.");
              }
            }}
          />
        </section>
      </section>
    </main>
  );
}
