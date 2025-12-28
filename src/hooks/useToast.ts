import { useState, useCallback } from 'react';
import { ToastData } from '@/types/booking';

export const useToast = () => {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: ToastData['type']) => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
};
