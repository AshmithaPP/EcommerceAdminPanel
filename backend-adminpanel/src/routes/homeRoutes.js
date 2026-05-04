const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', homeController.getHomeData);

// Admin Management Routes
router.get('/admin/hero', protect, authorize('admin', 'superadmin'), homeController.getHero);
router.put('/admin/hero', protect, authorize('admin', 'superadmin'), homeController.updateHero);

router.get('/admin/sections', protect, authorize('admin', 'superadmin'), homeController.getAllSections);
router.post('/admin/sections', protect, authorize('admin', 'superadmin'), homeController.createSection);

router.get('/admin/testimonials', protect, authorize('admin', 'superadmin'), homeController.getTestimonials);
router.post('/admin/testimonials', protect, authorize('admin', 'superadmin'), homeController.createTestimonial);

// Toggle Routes
router.patch('/admin/toggle-featured-product/:id', protect, authorize('admin', 'superadmin'), homeController.toggleFeaturedProduct);
router.patch('/admin/toggle-featured-category/:id', protect, authorize('admin', 'superadmin'), homeController.toggleFeaturedCategory);

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

module.exports = router;
