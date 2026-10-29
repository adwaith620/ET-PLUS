import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://et-plus.vercel.app'),
  title: {
    default: 'ET-PLUS — TKMCE Student Portal',
    template: '%s | ET-PLUS',
  },
  description:
    'ET-PLUS is a student companion for TKM College of Engineering, featuring attendance tracking, timetable access, assignment deadlines, study materials, and academic results.',
  applicationName: 'ET-PLUS',
  keywords: [
    'ET-PLUS',
    'TKMCE student portal',
    'TKMCE ETLAB',
    'ETLAB TKMCE',
    'TKM College of Engineering',
    'ETPlus',
    'attendance forecasting',
    'student timetable',
    'study materials',
    'KTU TKMCE',
  ],
  authors: [{ name: 'Adwaith Krishna M H' }],
  creator: 'Adwaith Krishna M H',
  publisher: 'ET-PLUS',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo.png',
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'URwDHvFd5ommvSVSq3oqF1pncseOAZFIDrOgw5RlTOc',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#141518] text-[#f3f4f6]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
