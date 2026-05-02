import { privateApi, publicApi } from './api';

export const productService = {
  /**
   * Fetch paginated products
   * @param {number} page 
   * @param {number} limit 
   * @returns {Promise<Object>}
   */
  getProducts: async (page = 1, limit = 10) => {
    const response = await privateApi.get('/products/raw', {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Get product by ID (Raw data for editing)
   * @param {string} productId 
   * @returns {Promise<Object>}
   */
  getProductById: async (productId) => {
    const response = await privateApi.get(`/products/id/${productId}`);
    return response.data;
  },

  /**
   * Get product by Slug (Formatted data for preview)
   * @param {string} slug 
   * @returns {Promise<Object>}
   */
  getProductBySlug: async (slug) => {
    const response = await publicApi.get(`/products/${slug}`);
    return response.data;
  },

  /**
   * Create a new product (handles multipart profile)
   * @param {FormData} productFormData 
   * @returns {Promise<Object>}
   */
  createProduct: async (productFormData) => {
    const response = await privateApi.post('/products', productFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Update an existing product (handles multipart profile)
   * @param {string} productId 
   * @param {FormData} productFormData 
   * @returns {Promise<Object>}
   */
  updateProduct: async (productId, productFormData) => {
    const response = await privateApi.put(`/products/${productId}`, productFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Delete a product (soft delete)
   * @param {string} productId 
   * @returns {Promise<Object>}
   */
  deleteProduct: async (productId) => {
    const response = await privateApi.delete(`/products/${productId}`);
    return response.data;
  }
};
