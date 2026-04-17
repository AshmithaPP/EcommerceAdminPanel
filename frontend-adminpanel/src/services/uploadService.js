import { privateApi } from './api';

export const uploadService = {
  /**
   * Upload a single image
   * @param {File} file 
   * @returns {Promise<Object>} response data containing the URL
   */
  uploadSingleImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await privateApi.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Upload multiple images
   * @param {File[]} files 
   * @returns {Promise<Object>} response data containing the URLs
   */
  uploadMultipleImages: async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const response = await privateApi.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
};
