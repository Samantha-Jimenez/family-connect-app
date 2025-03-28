import './globals.css';
import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import NavbarWrapper from "@/components/NavbarWrapper";
import ClientProviders from '@/components/ClientProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Family Connect',
  description: 'Connect with your family',
  icons: {
    icon: '/favicon_io/favicon.ico',
    apple: '/favicon_io/apple-touch-icon.png',
    shortcut: '/favicon_io/favicon-32x32.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/favicon_io/site.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon_io/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon_io/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon_io/favicon-16x16.png" />
      </head>
      <body className={inter.className}>
        <ClientProviders>
          <NavbarWrapper>
            {children}
          </NavbarWrapper>
        </ClientProviders>
      </body>
    </html>
  );
}
