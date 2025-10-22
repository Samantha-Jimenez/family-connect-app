'use client';

import React from 'react';
import { createPortal } from 'react-dom';

interface ProjectOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectOverviewModal: React.FC<ProjectOverviewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Project Overview</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">About Family Connect App</h3>
              <p className="text-slate-600 leading-relaxed">
                Family Connect App is a comprehensive digital platform designed to bring families together 
                through shared memories, genealogy, and meaningful connections. Our mission is to preserve 
                family history while fostering stronger relationships across generations.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Key Features</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span><strong>Photo Sharing:</strong> Upload, organize, and share family photos with automatic tagging and album creation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span><strong>Family Tree:</strong> Interactive family tree visualization with relationship mapping and member profiles</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span><strong>Event Calendar:</strong> Track birthdays, anniversaries, and family events with RSVP functionality</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span><strong>Memory Preservation:</strong> Document family stories, traditions, and historical information</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span><strong>Privacy Controls:</strong> Granular privacy settings to control who can see and access different content</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Technology Stack</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Frontend</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Next.js 14 with React 18</li>
                    <li>• TypeScript for type safety</li>
                    <li>• Tailwind CSS for styling</li>
                    <li>• React Select for enhanced UI components</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Backend & Infrastructure</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• AWS Amplify for authentication</li>
                    <li>• DynamoDB for data storage</li>
                    <li>• AWS S3 for file storage</li>
                    <li>• Serverless architecture</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Getting Started</h3>
              <p className="text-slate-600 leading-relaxed">
                To join the family network, you'll need to be invited by an existing family member. 
                Once you receive an invitation, you can create your account and start connecting with 
                your family members. The app is designed to be intuitive and user-friendly, with 
                comprehensive help documentation available.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Interested in Joining?</h4>
              <p className="text-blue-700 text-sm">
                Contact a family member who is already using the app to request an invitation. 
                They can add you to the family network and help you get started.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProjectOverviewModal;
