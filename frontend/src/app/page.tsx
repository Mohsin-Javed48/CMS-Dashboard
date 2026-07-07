'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="py-8 md:py-12">
      <section className="cms-container grid gap-6 md:grid-cols-[1.45fr_1fr]">
        <article className="cms-card cms-rise p-6 md:p-8" style={{ boxShadow: 'var(--shadow)' }}>
          <span className="cms-chip mb-4">Academic Operations Hub</span>
          <h1 className="cms-heading text-3xl font-bold leading-tight md:text-5xl">
            University CMS Control Center
          </h1>
          <p className="cms-subtext mt-4 max-w-xl text-sm md:text-base">
            Manage student records, grading workflows, and instructor-level updates with a fast,
            structured interface inspired by modern enterprise CMS platforms.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="cms-button cms-button-primary">
              Enter Dashboard
            </Link>
            <Link href="/teacher" className="cms-button cms-button-secondary">
              Preview Teacher Panel
            </Link>
          </div>
        </article>

        <aside className="cms-rise-delay grid gap-4">
          <div className="cms-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">System Health</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">Frontend Online</p>
            <p className="cms-subtext mt-1 text-sm">Port 3000 status is active.</p>
          </div>
          <div className="cms-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">API Connection</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">Local Data Mode</p>
            <p className="cms-subtext mt-1 text-sm">The UI is driven by mock student and course data shaped after the backend schema.</p>
          </div>
          <div className="cms-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experience</p>
            <p className="mt-2 text-sm text-slate-700">Purpose-built cards, elevated tables, and responsive dashboard sections aligned to student and course records.</p>
          </div>
        </aside>
      </section>

      <section className="cms-container mt-6 md:mt-8">
        <div className="cms-card p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Role-Based Access</p>
              <p className="cms-subtext mt-1 text-sm">Separate student and teacher workflows.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Marks Workflow</p>
              <p className="cms-subtext mt-1 text-sm">Quickly review and update subject marks.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Clean Information Density</p>
              <p className="cms-subtext mt-1 text-sm">Readable data layout optimized for daily operations.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
