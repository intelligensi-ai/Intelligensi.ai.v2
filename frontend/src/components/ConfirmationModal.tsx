import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  messageBody: React.ReactNode; // Allow for JSX in message
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  messageBody,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-[#2D3748] p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
        <div className="text-gray-300 mb-6">
          {messageBody}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-500 transition-colors"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
