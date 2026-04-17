import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

// Public instance for login/signup
export const publicApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Necessary for the browser to accept the refreshToken cookie
});

// Private instance with interceptors
export const privateApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Function to setup interceptors with access to the auth context state if needed
// However, it's cleaner to manage the token memory here or via a dedicated store
export const setupInterceptors = (getAccessToken, setAccessToken, logout) => {
    
    // Request Interceptor
    privateApi.interceptors.request.use(
        (config) => {
            const token = getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response Interceptor
    privateApi.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // If error is 401 and we haven't retried yet
            if (error.response?.status === 401 && !originalRequest._retry) {
                if (isRefreshing) {
                    // Queue this request and wait for the refresh to finish
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then((token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return privateApi(originalRequest);
                        })
                        .catch((err) => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    // Call refresh endpoint - Use publicApi to avoid interceptor recursion
                    const response = await publicApi.post('/auth/refresh');
                    const { accessToken } = response.data.data;

                    setAccessToken(accessToken);
                    processQueue(null, accessToken);
                    
                    // Retry original request with the new token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return privateApi(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    localStorage.removeItem('sc_session_hint'); // Clear hint if refresh fails
                    logout(); // Force logout if refresh token is invalid/expired
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            // Also clear hint if we get 401/403 and it's not a retry (final failure)
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('sc_session_hint');
            }

            return Promise.reject(error);
        }
    );
};
