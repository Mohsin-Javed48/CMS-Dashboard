"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentTable from "../../components/StudentTable";
import { studentService } from "../../services/studentService";
import { getCurrentUser } from "../../lib/session";
import type { Student } from "../../lib/types";

export default function TeacherPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const user = getCurrentUser();
      if (!user || user.role !== "teacher") {
        setStudents([]);
        setLoading(false);
        return;
      }

      const allStudents = await studentService.getStudents();
      setStudents(allStudents);
      setLoading(false);
    };

    load().catch(() => {
      setStudents([]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="py-7">
        <section className="cms-container">
          <div className="cms-card p-8 text-center">
            Loading student records...
          </div>
        </section>
      </main>
    );
  }

  const totalStudents = students.length;
  const activeStudents = students.filter((student) => student.isActive).length;
  const averageCgpa = students.length
    ? (
        students.reduce((sum, student) => sum + (student.cgpa ?? 0), 0) /
        students.length
      ).toFixed(2)
    : "0.00";
  const totalCourses = new Set(
    students.flatMap(
      (student) =>
        student.courses?.map(
          (course) => course._id ?? course.id ?? course.courseCode,
        ) ?? [],
    ),
  ).size;

  return (
    <main className="py-7">
      <section className="cms-container space-y-5">
        <header className="cms-card cms-rise p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Teacher Workspace
          </p>
          <h1 className="cms-heading mt-2 text-2xl font-bold md:text-3xl">
            Student Records
          </h1>
          <p className="cms-subtext mt-1 text-sm">
            Open any student profile to review marks, enrollment, and contact
            details.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total Students
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {totalStudents}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Active
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {activeStudents}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Average CGPA
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {averageCgpa}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Courses
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {totalCourses}
              </p>
            </div>
          </div>
        </header>

        <section className="cms-card cms-rise-delay p-3 md:p-4">
          <StudentTable
            students={students}
            onRowClick={(id) => router.push(`/teacher/${id}`)}
          />
        </section>
      </section>
    </main>
  );
}
