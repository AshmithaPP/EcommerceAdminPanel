/**
 * Standardizes backend error responses for the UI
 */
export const shapeError = (error) => {
    // Axios error object
    if (error?.response) {
        const { data, status } = error.response;
        
        // Handle Joi validation errors or specific backend messages
        if (data?.error) {
            return typeof data.error === 'string' 
                ? data.error 
                : (data.error.message || 'Validation error occurred');
        }
        
        if (data?.message) return data.message;
        
        // Fallback status messages
        switch (status) {
            case 400: return 'Bad Request: Please check your input';
            case 401: return 'Session expired: Please login again';
            case 403: return 'Access denied: You do not have permissions';
            case 404: return 'Resource not found';
            case 422: return 'Unprocessable data: Validation failed';
            case 500: return 'Internal server error: Please try later';
            default: return `Error: ${status}`;
        }
    }
    
    // Network or other errors
    return error?.message || 'A network error occurred';
};
