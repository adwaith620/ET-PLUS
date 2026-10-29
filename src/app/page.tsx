import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2,
  Calendar,
  FileText,
  BookOpen,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Lock,
  Layers,
  ExternalLink,
  ChevronRight,
  Database,
  UserCheck,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ET-PLUS — TKMCE Student Portal',
  description:
    'ET-PLUS is a student companion for TKM College of Engineering, featuring attendance tracking, timetable access, assignment deadlines, study materials, and academic results.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://et-plus.vercel.app',
    siteName: 'ET-PLUS',
    title: 'ET-PLUS — TKMCE Student Portal',
    description:
      'ET-PLUS is a student companion for TKM College of Engineering, featuring attendance tracking, timetable access, assignment deadlines, study materials, and academic results.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'ET-PLUS — TKMCE Student Portal Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'ET-PLUS — TKMCE Student Portal',
    description:
      'ET-PLUS is a student companion for TKM College of Engineering, featuring attendance tracking, timetable access, assignment deadlines, study materials, and academic results.',
    images: ['/logo.png'],
  },
};

export default async function HomePage() {
  const session = await getSession();

  // Structured Data (JSON-LD) for Search Engines
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://et-plus.vercel.app/#website',
        url: 'https://et-plus.vercel.app',
        name: 'ET-PLUS',
        alternateName: ['ETPlus', 'ET-PLUS TKMCE', 'TKMCE Student Portal'],
        description:
          'ET-PLUS is a student companion for TKM College of Engineering, featuring attendance tracking, timetable access, assignment deadlines, study materials, and academic results.',
        inLanguage: 'en-IN',
      },
      {
        '@type': 'WebApplication',
        '@id': 'https://et-plus.vercel.app/#webapp',
        name: 'ET-PLUS — TKMCE Student Portal',
        url: 'https://et-plus.vercel.app',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        description:
          'A high-performance student dashboard and academic intelligence companion for TKM College of Engineering students.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] dark:bg-[#141518] text-[#1c1917] dark:text-[#f3f4f6] flex flex-col selection:bg-[#1c1917] selection:text-white dark:selection:bg-[#f3f4f6] dark:selection:text-[#141518]">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e7e4de] dark:border-[#2a2d35] bg-[#fdfcfb]/90 dark:bg-[#141518]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#1c1917] dark:focus:ring-[#f3f4f6] rounded-lg p-1"
            aria-label="ET-PLUS Homepage"
          >
            <BrandLogo size={32} className="rounded-lg shadow-xs" priority />
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight leading-none text-[#1c1917] dark:text-[#f3f4f6]">
                ET-PLUS
              </span>
              <span className="text-[10px] font-medium text-[#78716c] dark:text-[#9ca3af] leading-tight">
                TKMCE Student Portal
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 text-xs font-medium" aria-label="Main Navigation">
            <Link
              href="#features"
              className="hidden sm:inline-block text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors py-2 px-2.5 rounded-md"
            >
              Features
            </Link>
            <Link
              href="#privacy"
              className="hidden sm:inline-block text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors py-2 px-2.5 rounded-md"
            >
              Privacy &amp; Security
            </Link>

            {session ? (
              <Link
                href="/dashboard"
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] shadow-xs flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] shadow-xs flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#e7e4de] dark:border-[#2a2d35]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f4f1eb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Independent Student Companion for TKMCE Students</span>
            </div>

            {/* Primary H1 */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1c1917] dark:text-[#f3f4f6] leading-[1.15]">
              ET-PLUS — Student Portal for TKMCE
            </h1>

            {/* Concise Explanation */}
            <p className="max-w-2xl mx-auto text-sm sm:text-base leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
              A high-performance student companion for TKM College of Engineering, Kollam.
              Experience near-instant attendance forecasting, real-time timetable schedules,
              verified assignment tracking, shared study materials, and examination mark analysis
              built for the daily academic journey.
            </p>

            {/* Primary Call-to-Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-xl bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] shadow-sm font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Sign in with ETLAB</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-xl bg-white dark:bg-[#1b1d22] hover:bg-[#f9f8f5] dark:hover:bg-[#22252b] text-[#1c1917] dark:text-[#f3f4f6] border border-[#e7e4de] dark:border-[#2a2d35] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Explore Capabilities</span>
                <ChevronRight className="w-4 h-4 text-[#78716c] dark:text-[#9ca3af]" />
              </Link>
            </div>

            {/* Security Trust Indicators */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
              <div className="p-3 rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-semibold block text-[#1c1917] dark:text-[#f3f4f6]">Direct HTTPS Auth</span>
                  <span className="text-[#78716c] dark:text-[#9ca3af]">Direct with tkmce.etlab.in</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-semibold block text-[#1c1917] dark:text-[#f3f4f6]">Zero Passwords Stored</span>
                  <span className="text-[#78716c] dark:text-[#9ca3af]">No credential logging</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-semibold block text-[#1c1917] dark:text-[#f3f4f6]">Account Isolation</span>
                  <span className="text-[#78716c] dark:text-[#9ca3af]">Student-isolated caches</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Sections */}
        <section id="features" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716c] dark:text-[#9ca3af]">
              Core Modules
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
              Engineered for Academic Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-[#78716c] dark:text-[#9ca3af] leading-relaxed">
              Every feature in ET-PLUS is optimized to provide instant visibility into your curriculum,
              attendance requirements, and assessment schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Attendance Tracking & Forecasting */}
            <article className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between hover:border-[#1c1917] dark:hover:border-[#f3f4f6] transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6] mb-1.5">
                    Attendance Tracking &amp; Forecasting
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                    Track overall and subject-level percentages against the KTU 75% threshold.
                    Run interactive what-if simulations to calculate safe bunks or evaluate how many
                    consecutive classes you must attend to restore eligibility.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-[#f4f1eb] dark:border-[#24272f] flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Safe Bunk Calculator
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  75% Threshold Alert
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  What-If Simulation
                </span>
              </div>
            </article>

            {/* Feature 2: Semester Timetable & Faculty Information */}
            <article className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between hover:border-[#1c1917] dark:hover:border-[#f3f4f6] transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6] mb-1.5">
                    Semester Timetable &amp; Faculty Information
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                    Access your day-wise academic timetable accurately filtered to standard Periods 1 through 6.
                    View room allocations, subject codes, and canonical faculty profiles synchronized
                    for your batch curriculum.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-[#f4f1eb] dark:border-[#24272f] flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Periods 1–6 Standard
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Faculty Directory
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Today&apos;s Schedule
                </span>
              </div>
            </article>

            {/* Feature 3: Upcoming Assignments & Deadlines */}
            <article className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between hover:border-[#1c1917] dark:hover:border-[#f3f4f6] transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6] mb-1.5">
                    Upcoming Assignments &amp; Deadlines
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                    Never miss a submission deadline. Review genuine course assignments fetched directly
                    from ETLAB, with submission states, due-date counters, and complete removal of
                    confusing fabricated placeholders.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-[#f4f1eb] dark:border-[#24272f] flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  ETLAB Verified
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Deadline Badges
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Submission History
                </span>
              </div>
            </article>

            {/* Feature 4: Study Materials & Academic Resources */}
            <article className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between hover:border-[#1c1917] dark:hover:border-[#f3f4f6] transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6] mb-1.5">
                    Study Materials &amp; Academic Resources
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                    Browse course notes, question banks, and syllabus modules contributed by your peer cohort.
                    All uploads are inspected with strict magic-byte validation and anti-traversal security
                    for safe PDF/document downloads.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-[#f4f1eb] dark:border-[#24272f] flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Magic-Byte Verified
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Previous Question Papers
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Course Notes
                </span>
              </div>
            </article>

            {/* Feature 5: Examination Results & Academic Performance */}
            <article className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between hover:border-[#1c1917] dark:hover:border-[#f3f4f6] transition-colors md:col-span-2 lg:col-span-2">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6] mb-1.5">
                    Examination Results &amp; Academic Performance
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                    Review marks across all 9 academic evaluation streams: Sessional Exams, Module Tests,
                    Class Projects, Assignments, Tutorials, Seminars, Internal Marks, Lab Evaluation,
                    and Lab Internal Tests. View detailed question-level responses and switch between semesters
                    seamlessly.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-[#f4f1eb] dark:border-[#24272f] flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  9 Assessment Categories
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Question Breakdown
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Semester History
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#24272f] text-[#1c1917] dark:text-[#f3f4f6]">
                  Internal Marks
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* Privacy, Security & Technical Architecture Section */}
        <section id="privacy" className="py-16 sm:py-20 border-t border-[#e7e4de] dark:border-[#2a2d35] bg-[#f9f8f5]/50 dark:bg-[#181a1f]/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#78716c] dark:text-[#9ca3af]">
                Trust &amp; Security Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
                Architecture &amp; Data Privacy
              </h2>
              <p className="text-xs sm:text-sm text-[#78716c] dark:text-[#9ca3af] leading-relaxed">
                ET-PLUS is built with student privacy as an uncompromisable foundation.
                Here is how your information is protected.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Direct Institutional Gateway</span>
                </div>
                <p className="text-xs leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                  Your credentials authenticate over encrypted TLS directly with the official TKMCE
                  ETLAB portal (<code className="px-1 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#24272f] font-mono text-[10px]">tkmce.etlab.in</code>).
                </p>
              </div>

              <div className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Zero Password Storage</span>
                </div>
                <p className="text-xs leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                  Your password is never persisted, saved to disk, or retained in any database.
                  Sessions are maintained exclusively via secure HttpOnly, SameSite cookies.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Cryptographic Isolation</span>
                </div>
                <p className="text-xs leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                  Server-side caches are keyed strictly by authenticated username hashes, ensuring zero
                  cross-student data leakage during shared or concurrent sessions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="py-16 sm:py-20 border-t border-[#e7e4de] dark:border-[#2a2d35]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center mb-1">
              <BrandLogo size={44} className="rounded-xl shadow-xs" priority />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
              Access Your Personalized Dashboard
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-[#78716c] dark:text-[#9ca3af] leading-relaxed">
              Sign in with your official TKMCE ETLAB student account to view your attendance stats,
              today&apos;s lectures, upcoming assignments, and semester examination results.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex min-h-[46px] px-8 py-3 rounded-xl bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] shadow-sm font-semibold text-xs sm:text-sm items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Sign in with ETLAB</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Semantic Footer */}
      <footer className="border-t border-[#e7e4de] dark:border-[#2a2d35] bg-[#f9f8f5] dark:bg-[#17191e] py-12 text-xs text-[#78716c] dark:text-[#9ca3af]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <BrandLogo size={24} className="rounded-md" />
              <span className="font-bold text-sm tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
                ET-PLUS
              </span>
              <span className="text-[11px] text-[#78716c] dark:text-[#9ca3af]">
                • TKM College of Engineering Student Interface
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <Link
                href="/login"
                className="hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors"
              >
                Sign In
              </Link>
              <a
                href="https://tkmce.etlab.in"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors inline-flex items-center gap-1"
              >
                <span>Official ETLAB</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/adwaith620/ET-PLUS"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors inline-flex items-center gap-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-[#e7e4de] dark:border-[#24272f] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#78716c] dark:text-[#9ca3af]">
            <p>
              Disclaimer: ET-PLUS is an independent student-developed academic dashboard companion for TKMCE students.
              It is not officially affiliated with or endorsed by TKM College of Engineering administration.
            </p>
            <p className="shrink-0">
              © 2026 ET-PLUS • Built by Adwaith Krishna M H
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
