import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import '@aws-amplify/ui-react/styles.css';
import NavbarWrapper from "@/components/NavbarWrapper";
import { Providers } from './providers';

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
        <Providers>
          <NavbarWrapper>
            {children}
          </NavbarWrapper>
        </Providers>
      </body>
    </html>
  );
}
