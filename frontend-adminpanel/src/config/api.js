/**
 * Centralized API configuration
 * Uses environment variables for production readiness
 */

// On Vercel, these should be set in the project settings
// For local development, they can be set in a .env file
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:5000';

// API endpoints
export const API_ENDPOINTS = {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PRODUCTS: '/products',
    CATEGORIES: '/categories',
    ORDERS: '/orders',
    DASHBOARD: '/dashboard',
    CUSTOMERS: '/customers',
    SETTINGS: '/settings',
    UPLOADS: '/uploads'
};
