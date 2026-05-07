import { create } from 'zustand';
import { privateApi } from '../services/api';
import toast from 'react-hot-toast';

const useHomeStore = create((set, get) => ({
    heroData: {
        title: '',
        subtitle: '',
        image_url: '',
        cta_text: '',
        redirect_url: ''
    },
    sections: [],
    testimonials: [],
    occasions: [],
    trendingPicks: [],
    priceFilters: [],
    categories: [],
    products: [],
    isLoading: false,
    newsletter: {
        title: '',
        subtitle: '',
        email_placeholder: '',
        button_text: '',
        image_url: ''
    },

    // --- Hero Actions ---
    fetchHero: async () => {
        try {
            const { data } = await privateApi.get('/home/admin/hero');
            if (data.success && data.data) set({ heroData: data.data });
        } catch (err) {
            console.error('Error fetching hero:', err);
        }
    },

    updateHero: async (heroData) => {
        set({ isLoading: true });
        try {
            await privateApi.put('/home/admin/hero', heroData);
            toast.success('Hero section updated');
            get().fetchHero();
        } catch (err) {
            toast.error('Failed to update hero');
        } finally {
            set({ isLoading: false });
        }
    },

    // --- Sections Actions ---
    fetchSections: async () => {
        try {
            const { data } = await privateApi.get('/home/admin/sections');
            if (data.success) set({ sections: data.data });
        } catch (err) {
            console.error('Error fetching sections:', err);
        }
    },

    saveSection: async (sectionData) => {
        set({ isLoading: true });
        try {
            await privateApi.post('/home/admin/sections', sectionData);
            toast.success('Section saved');
            get().fetchSections();
            return true;
        } catch (err) {
            toast.error('Failed to save section');
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    // --- Testimonial Actions ---
    fetchTestimonials: async () => {
        try {
            const { data } = await privateApi.get('/home/admin/testimonials');
            if (data.success) set({ testimonials: data.data });
        } catch (err) {
            console.error('Error fetching testimonials:', err);
        }
    },

    saveTestimonial: async (id, testimonialData) => {
        set({ isLoading: true });
        try {
            if (id === 'new') {
                await privateApi.post('/home/admin/testimonials', testimonialData);
            } else {
                await privateApi.put(`/home/admin/testimonials/${id}`, testimonialData);
            }
            toast.success('Testimonial saved');
            get().fetchTestimonials();
            return true;
        } catch (err) {
            toast.error('Failed to save testimonial');
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    deleteTestimonial: async (id) => {
        try {
            await privateApi.delete(`/home/admin/testimonials/${id}`);
            toast.success('Testimonial deleted');
            get().fetchTestimonials();
        } catch (err) {
            toast.error('Failed to delete testimonial');
        }
    },

    // --- Occasions Actions ---
    fetchOccasions: async () => {
        try {
            const { data } = await privateApi.get('/home/admin/occasions');
            if (data.success) set({ occasions: data.data });
        } catch (err) {
            console.error('Error fetching occasions:', err);
        }
    },

    saveOccasion: async (id, occasionData) => {
        set({ isLoading: true });
        try {
            await privateApi.put(`/home/admin/occasions/${id}`, occasionData);
            toast.success('Occasion saved');
            get().fetchOccasions();
            return true;
        } catch (err) {
            toast.error('Failed to save occasion');
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    deleteOccasion: async (id) => {
        try {
            await privateApi.delete(`/home/admin/occasions/${id}`);
            toast.success('Occasion deleted');
            get().fetchOccasions();
        } catch (err) {
            toast.error('Failed to delete occasion');
        }
    },

    // --- Trending Picks Actions ---
    fetchTrendingPicks: async () => {
        try {
            const { data } = await privateApi.get('/home/admin/trending-picks');
            if (data.success) set({ trendingPicks: data.data });
        } catch (err) {
            console.error('Error fetching trending picks:', err);
        }
    },

    saveTrendingPick: async (id, trendingData) => {
        set({ isLoading: true });
        try {
            await privateApi.put(`/home/admin/trending-picks/${id}`, trendingData);
            toast.success('Trending pick saved');
            get().fetchTrendingPicks();
            return true;
        } catch (err) {
            toast.error('Failed to save trending pick');
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    deleteTrendingPick: async (id) => {
        try {
            await privateApi.delete(`/home/admin/trending-picks/${id}`);
            toast.success('Trending pick deleted');
            get().fetchTrendingPicks();
        } catch (err) {
            toast.error('Failed to delete pick');
        }
    },

    // --- Price Filter Actions ---
    fetchPriceFilters: async () => {
        try {
            const { data } = await privateApi.get('/home/admin/price-filters');
            if (data.success) set({ priceFilters: data.data });
        } catch (err) {
            console.error('Error fetching price filters:', err);
        }
    },

    savePriceFilter: async (id, priceData) => {
        set({ isLoading: true });
        try {
            await privateApi.put(`/home/admin/price-filters/${id}`, priceData);
            toast.success('Price filter saved');
            get().fetchPriceFilters();
            return true;
        } catch (err) {
            toast.error('Failed to save price filter');
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    deletePriceFilter: async (id) => {
        try {
            await privateApi.delete(`/home/admin/price-filters/${id}`);
            toast.success('Price filter deleted');
            get().fetchPriceFilters();
        } catch (err) {
            toast.error('Failed to delete price filter');
        }
    },

    // --- Newsletter Actions ---
    fetchNewsletter: async () => {
        try {
            const { data } = await privateApi.get('/home/admin/newsletter');
            if (data.success && data.data) set({ newsletter: data.data });
        } catch (err) {
            console.error('Error fetching newsletter:', err);
        }
    },

    updateNewsletter: async (newsletterData) => {
        set({ isLoading: true });
        try {
            await privateApi.put('/home/admin/newsletter', newsletterData);
            toast.success('Newsletter updated');
            get().fetchNewsletter();
            return true;
        } catch (err) {
            toast.error('Failed to update newsletter');
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    // --- Category Actions (for Home Collections) ---
    fetchCategories: async () => {
        try {
            const { data } = await privateApi.get('/categories/category-list?limit=100');
            if (data.success) set({ categories: data.data.items });
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    },

    toggleCategoryFeatured: async (id) => {
        try {
            await privateApi.patch(`/home/admin/toggle-featured-category/${id}`, {});
            toast.success('Featured status updated');
            get().fetchCategories();
        } catch (err) {
            toast.error('Failed to update status');
        }
    },

    updateCategoryImage: async (id, imageUrl) => {
        try {
            await privateApi.patch(`/home/admin/category-image/${id}`, { image_url: imageUrl });
            toast.success('Category image updated');
            get().fetchCategories();
            return true;
        } catch (err) {
            toast.error('Failed to update category image');
            return false;
        }
    },

    // --- Product Actions ---
    fetchProducts: async () => {
        try {
            const { data } = await privateApi.get('/products/raw?limit=100');
            if (data.success) set({ products: data.data });
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    },

    toggleProductFeatured: async (id) => {
        try {
            await privateApi.patch(`/home/admin/toggle-featured-product/${id}`, {});
            toast.success('Product featured status updated');
            get().fetchProducts();
        } catch (err) {
            toast.error('Failed to update status');
        }
    },

    // --- General Upload ---
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const { data } = await privateApi.post('/upload/single', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return data.success ? data.data.url : null;
        } catch (err) {
            toast.error('Image upload failed');
            return null;
        }
    }
}));

export default useHomeStore;
