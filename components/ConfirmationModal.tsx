import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  message,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4">{message}</div>
        <div className="flex justify-end space-x-2">
          <button className="btn bg-gray-500 text-white border-0" onClick={onClose}>
            Cancel
          </button>
          <button className="btn bg-red-500 text-white border-0" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 