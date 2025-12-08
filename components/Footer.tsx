'use client';

import React, { useState } from 'react';
import ContactModal from './ContactModal';

const Footer = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <>
      <footer className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="text-sm text-gray-600 hover:text-gray-800 underline transition-colors"
              >
                Have a suggestion or request?
              </button>
            </div>
            <div className="flex items-center">
              <p className="text-sm text-gray-500">© 2025 Family Connect. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </>
  );
}

export default Footer;