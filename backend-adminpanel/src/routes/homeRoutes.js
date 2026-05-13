const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

const { protect, authorize } = require('../middlewares/authMiddleware');
const heroUpload = require('../middlewares/heroUploadMiddleware');

router.get('/', homeController.getHomeData);

// Admin Management Routes
router.get('/admin/hero', protect, authorize('admin', 'superadmin'), homeController.getHero);
router.put('/admin/hero', protect, authorize('admin', 'superadmin'), homeController.updateHero);
router.post('/admin/hero/upload', protect, authorize('admin', 'superadmin'), heroUpload.single('heroImage'), homeController.uploadHeroImage);

router.get('/admin/sections', protect, authorize('admin', 'superadmin'), homeController.getAllSections);
router.post('/admin/sections', protect, authorize('admin', 'superadmin'), homeController.createSection);
router.put('/admin/sections/:id', protect, authorize('admin', 'superadmin'), homeController.updateSection);
router.delete('/admin/sections/:id', protect, authorize('admin', 'superadmin'), homeController.deleteSection);

router.get('/admin/testimonials', protect, authorize('admin', 'superadmin'), homeController.getTestimonials);
router.post('/admin/testimonials', protect, authorize('admin', 'superadmin'), homeController.createTestimonial);
router.put('/admin/testimonials/:id', protect, authorize('admin', 'superadmin'), homeController.updateTestimonial);
router.delete('/admin/testimonials/:id', protect, authorize('admin', 'superadmin'), homeController.deleteTestimonial);

// Toggle Routes
router.patch('/admin/toggle-featured-product/:id', protect, authorize('admin', 'superadmin'), homeController.toggleFeaturedProduct);
router.patch('/admin/toggle-featured-category/:id', protect, authorize('admin', 'superadmin'), homeController.toggleFeaturedCategory);
router.patch('/admin/category-image/:id', protect, authorize('admin', 'superadmin'), homeController.updateCategoryImage);
router.patch('/admin/product-home-image/:id', protect, authorize('admin', 'superadmin'), homeController.updateProductHomeImage);

// Occasions
router.get('/admin/occasions', protect, authorize('admin', 'superadmin'), homeController.getOccasions);
router.put('/admin/occasions/:id', protect, authorize('admin', 'superadmin'), homeController.updateOccasion);
router.delete('/admin/occasions/:id', protect, authorize('admin', 'superadmin'), homeController.deleteOccasion);

// Trending Picks
router.get('/admin/trending-picks', protect, authorize('admin', 'superadmin'), homeController.getTrendingPicks);
router.put('/admin/trending-picks/:id', protect, authorize('admin', 'superadmin'), homeController.updateTrendingPick);
router.delete('/admin/trending-picks/:id', protect, authorize('admin', 'superadmin'), homeController.deleteTrendingPick);

// Price Filters
router.get('/admin/price-filters', protect, authorize('admin', 'superadmin'), homeController.getPriceFilters);
router.put('/admin/price-filters/:id', protect, authorize('admin', 'superadmin'), homeController.updatePriceFilter);
router.delete('/admin/price-filters/:id', protect, authorize('admin', 'superadmin'), homeController.deletePriceFilter);

// Newsletter
router.get('/admin/newsletter', protect, authorize('admin', 'superadmin'), homeController.getNewsletter);
router.put('/admin/newsletter', protect, authorize('admin', 'superadmin'), homeController.updateNewsletter);

module.exports = router;
