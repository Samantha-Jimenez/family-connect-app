"use client";

import { Amplify } from "aws-amplify";
import { useAuthenticator } from "@aws-amplify/ui-react";
import awsconfig from "../aws-exports";
import { AuthProvider } from '../context/AuthContext';

Amplify.configure(awsconfig);

export default function Home() {
  const { user, signOut } = useAuthenticator();

  return (
    <>
      <AuthProvider>
        <div className="grid items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-100">
          <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
            <h1 className="text-4xl font-bold text-blue-600">Welcome to Our Family Tree</h1>
            {user && <p className="text-lg text-center sm:text-left text-gray-700">
              Hello, {user.signInDetails?.loginId}!
            </p>}
            <button 
              onClick={() => {
                signOut?.();
                window.location.reload();
              }} 
              className="mt-4 rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-red-500 text-white gap-2 hover:bg-red-600 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 shadow-lg"
            >
              Sign Out
            </button>
            <p className="text-lg text-center sm:text-left text-gray-700">
              Keep track of your family history and cherish your family photos.
            </p>
            <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)] text-gray-600">
              <li className="mb-2">
                Start by exploring our family tree and adding your own memories.
              </li>
              <li>Share and connect with your family members.</li>
            </ol>
            <div className="flex gap-4 items-center flex-col sm:flex-row">
              <a
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-500 text-white gap-2 hover:bg-blue-600 dark:hover:bg-blue-700 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 shadow-lg"
                href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Deploy now
              </a>
              <a
                className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44 shadow-lg"
                href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read our docs
              </a>
            </div>
          </main>
          <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Examples
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Go to nextjs.org →
            </a>
          </footer>
        </div>
      </AuthProvider>
    </>
  );
}
