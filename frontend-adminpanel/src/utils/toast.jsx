import React from 'react';
import { toast } from 'react-hot-toast';
import Toast from '../components/ui/Toast';

export const showToast = {
  success: (message, options = {}) => {
    return toast.custom((t) => (
      <Toast t={t} message={message} type="success" />
    ), {
      duration: 4000,
      position: 'top-right',
      ...options
    });
  },
  error: (message, options = {}) => {
    return toast.custom((t) => (
      <Toast t={t} message={message} type="error" />
    ), {
      duration: 5000,
      position: 'top-right',
      ...options
    });
  },
  warning: (message, options = {}) => {
    return toast.custom((t) => (
      <Toast t={t} message={message} type="warning" />
    ), {
      duration: 5000,
      position: 'top-right',
      ...options
    });
  },
  info: (message, options = {}) => {
    return toast.custom((t) => (
      <Toast t={t} message={message} type="info" />
    ), {
      duration: 4000,
      position: 'top-right',
      ...options
    });
  }
};
