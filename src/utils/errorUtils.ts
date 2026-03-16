/**
 * Utility function to safely extract error messages from API responses
 * @param error - The error object from API response
 * @returns A string error message
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  // If error is already a string, return it
  if (typeof error === 'string') return error;
  
  // If error has a detail property
  if (error.detail) {
    // If detail is an array (validation errors), extract the first message
    if (Array.isArray(error.detail)) {
      return error.detail[0]?.msg || 'Validation error occurred';
    }
    // If detail is a string, return it
    if (typeof error.detail === 'string') {
      return error.detail;
    }
    // If detail is an object, try to extract message
    if (typeof error.detail === 'object') {
      return error.detail.msg || error.detail.message || 'Error occurred';
    }
  }
  
  // If error has a message property
  if (error.message) {
    return error.message;
  }
  
  // If error is an object, try to stringify it
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'An error occurred';
    }
  }
  
  return 'An unknown error occurred';
}
