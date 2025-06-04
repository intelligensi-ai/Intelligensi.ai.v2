import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface ThemeCraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (url: string) => Promise<unknown>;
}

const ThemeCraftModal: React.FC<ThemeCraftModalProps> = ({ isOpen, onClose, onScan }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await onScan(url);
      onClose();
    } catch (err) {
      setError('Failed to scan website. Please try again.');
      console.error('Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl">
                <Dialog.Title className="text-lg font-semibold text-white mb-4">
                  Scan Website Theme
                </Dialog.Title>
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    {error && (
                      <div className="text-red-400 text-sm">{error}</div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-200 hover:text-white"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !url.trim()}
                        className="px-4 py-2 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Scanning...' : 'Scan'}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export { ThemeCraftModal };
