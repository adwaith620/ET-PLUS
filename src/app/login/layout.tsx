import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to ET-PLUS with your TKMCE ETLAB institutional credentials to view your attendance, timetable, assignments, materials, and examination results.',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Sign In | ET-PLUS',
    description:
      'Sign in to ET-PLUS with your TKMCE ETLAB institutional credentials.',
    url: 'https://et-plus.vercel.app/login',
    siteName: 'ET-PLUS',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'ET-PLUS Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Sign In | ET-PLUS',
    description:
      'Sign in to ET-PLUS with your TKMCE ETLAB institutional credentials.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
