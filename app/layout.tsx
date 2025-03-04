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
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
