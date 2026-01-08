import React from 'react';
import { Icon } from '@iconify/react';

interface DemoNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DemoNoticeModal: React.FC<DemoNoticeModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-8 shadow-2xl max-w-md w-full mx-4 animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="mdi:information-outline" className="w-8 h-8 text-green-500 flex-shrink-0" />
            <h2 className="text-2xl font-bold text-gray-800">
              Welcome to the Demo!
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-2">
            Thank you for exploring our Family Connect app. We're currently in the process of <strong>adding and updating demo data</strong> to give you the best experience possible.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Some features may be <em>limited or still under development</em>. We appreciate your patience as we continue to build out the demo content! Enjoy exploring!
          </p>
        </div>
        <div className="flex justify-end">
          <button 
            className="px-6 py-2 bg-yellow-800/80 hover:bg-yellow-800/90 text-white rounded-lg font-medium transition-colors"
            onClick={onClose}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoNoticeModal;
