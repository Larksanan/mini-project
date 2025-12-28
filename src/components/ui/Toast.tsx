'use client';
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const iconClasses = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
  };

  const bgClasses = {
    success:
      'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  };

  const textClasses = {
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
    info: 'text-blue-800 dark:text-blue-200',
  };

  const Icon =
    type === 'success'
      ? FaCheckCircle
      : type === 'error'
        ? FaExclamationCircle
        : FaExclamationCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={twMerge(
        'fixed bottom-4 right-4 z-50 max-w-md',
        'border rounded-lg shadow-lg',
        bgClasses[type],
        'flex items-center gap-3 px-4 py-3'
      )}
    >
      <Icon className={twMerge('w-5 h-5', iconClasses[type])} />
      <span className={twMerge('font-medium flex-1', textClasses[type])}>
        {message}
      </span>
      <button
        onClick={onClose}
        className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
      >
        <FaTimes className='w-4 h-4' />
      </button>
    </motion.div>
  );
};

// Toast hook/manager
import { useState, useCallback } from 'react';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);

      // Auto remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const ToastContainer = () => (
    <AnimatePresence>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </AnimatePresence>
  );

  return { showToast, ToastContainer };
};

export default Toast;
