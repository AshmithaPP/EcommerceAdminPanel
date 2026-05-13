const db = require('../config/database');
const homeService = require('../services/homeService');

const getHomeData = async (req, res) => {
    try {
        const data = await homeService.getHomeData();
        const { hero, categories, featuredProducts, productSections, testimonials, blogs, occasions, trending, prices, newsletter } = data;

        res.status(200).json({
            success: true,
            data: {
                hero_section: hero ? {
                    title: hero.title,
                    subtitle: hero.subtitle,
                    cta: {
                        text: hero.cta_text || 'Explore Collections',
                        redirect_url: hero.redirect_url || '/collections'
                    },
                    image_url: hero.image_url
                } : null,

                collections: categories.map(c => ({
                    category_id: c.category_id,
                    slug: c.slug,
                    category_name: c.category_name,
                    product_count: c.badge || '0+ Designs',
                    image_url: c.image_url,
                    redirect_url: `/collections/${c.slug}`
                })),

                featured_products: featuredProducts.map(p => ({
                    product_id: p.product_id,
                    product_name: p.name,
                    slug: p.slug,
                    price: p.starting_price,
                    original_price: p.original_price || p.starting_price * 1.5,
                    discount_percentage: p.discount_percentage || 0,
                    rating: p.rating || 5,
                    reviews_count: p.reviews_count || 0,
                    image_url: p.image_url,
                    stock_status: p.stock_status || 'in_stock',
                    is_featured: !!p.is_featured
                })),

                product_sections: productSections.map(s => ({
                    section_id: s.section_id,
                    title: s.title,
                    type: s.type,
                    products: s.products.map(p => ({
                        product_id: p.product_id,
                        product_name: p.name,
                        slug: p.slug,
                        price: p.starting_price,
                        original_price: p.original_price || p.starting_price * 1.2,
                        discount_percentage: p.discount_percentage || 0,
                        image_url: p.image_url,
                        is_featured: !!p.is_featured
                    }))
                })),

                shop_by_occasion: occasions,
                trending_categories: trending,
                price_filters: prices,

                testimonials: testimonials,
                blogs: blogs,
                newsletter: newsletter || {
                    title: "Enter The World Of Timeless Sarees",
                    subtitle: "Be the first to discover our latest collections",
                    email_placeholder: "Enter Your Email Address",
                    button_text: "Stay Connected",
                    image_url: ""
                }
            }
        });

    } catch (error) {
        console.error('Error fetching home data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// --- Admin Management Functions ---

// Hero Section
const getHero = async (req, res) => {
    try {
        const [hero] = await db.query('SELECT * FROM home_hero ORDER BY id DESC LIMIT 1');
        res.status(200).json({ success: true, data: hero[0] || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateHero = async (req, res) => {
    try {
        const { title, subtitle, image_url, cta_text, redirect_url } = req.body;
        const [hero] = await db.query('SELECT id FROM home_hero ORDER BY id DESC LIMIT 1');
        
        if (hero.length > 0) {
            await db.query(
                'UPDATE home_hero SET title = ?, subtitle = ?, image_url = ?, cta_text = ?, redirect_url = ? WHERE id = ?',
                [title, subtitle, image_url, cta_text, redirect_url, hero[0].id]
            );
        } else {
            await db.query(
                'INSERT INTO home_hero (title, subtitle, image_url, cta_text, redirect_url) VALUES (?, ?, ?, ?, ?)',
                [title, subtitle, image_url, cta_text, redirect_url]
            );
        }
        res.status(200).json({ success: true, message: 'Hero updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const uploadHeroImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const sharp = require('sharp');
        const metadata = await sharp(req.file.path).metadata();

        // Strict Resolution Check: 1280x720 min, 1920x1080 max
        const minW = 1280, minH = 720;
        const maxW = 1920, maxH = 1080;

        if (metadata.width < minW || metadata.height < minH) {
            require('fs').unlinkSync(req.file.path);
            return res.status(400).json({ 
                success: false, 
                message: `Image resolution too low (${metadata.width}x${metadata.height}). Minimum required: ${minW}x${minH}.` 
            });
        }

        if (metadata.width > maxW || metadata.height > maxH) {
            require('fs').unlinkSync(req.file.path);
            return res.status(400).json({ 
                success: false, 
                message: `Image resolution too high (${metadata.width}x${metadata.height}). Maximum allowed: ${maxW}x${maxH}.` 
            });
        }

        const url = `/uploads/hero/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: 'Hero image uploaded and validated successfully',
            data: {
                url,
                width: metadata.width,
                height: metadata.height,
                size: req.file.size,
                format: metadata.format
            }
        });
    } catch (error) {
        if (req.file) require('fs').unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Sections
const getAllSections = async (req, res) => {
    try {
        const [sections] = await db.query('SELECT * FROM home_sections ORDER BY display_order ASC');
        res.status(200).json({ success: true, data: sections });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createSection = async (req, res) => {
    try {
        const { section_id, title, type, is_active, display_order } = req.body;
        await db.query(
            'INSERT INTO home_sections (section_id, title, type, is_active, display_order) VALUES (?, ?, ?, ?, ?)',
            [section_id || require('crypto').randomUUID(), title, type, is_active, display_order || 0]
        );
        res.status(201).json({ success: true, message: 'Section created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, type, is_active, display_order } = req.body;
        await db.query(
            'UPDATE home_sections SET title = ?, type = ?, is_active = ?, display_order = ? WHERE section_id = ?',
            [title, type, is_active, display_order, id]
        );
        res.status(200).json({ success: true, message: 'Section updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteSection = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM home_sections WHERE section_id = ?', [id]);
        res.status(200).json({ success: true, message: 'Section deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Testimonials
const getTestimonials = async (req, res) => {
    try {
        const [testimonials] = await db.query('SELECT * FROM testimonials ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: testimonials });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createTestimonial = async (req, res) => {
    try {
        const { customer_name, designation, rating, comment, image_url } = req.body;
        await db.query(
            'INSERT INTO testimonials (testimonial_id, customer_name, designation, rating, comment, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [require('crypto').randomUUID(), customer_name, designation, rating, comment, image_url]
        );
        res.status(201).json({ success: true, message: 'Testimonial created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const { customer_name, designation, rating, comment, image_url, is_active } = req.body;
        await db.query(
            'UPDATE testimonials SET customer_name = ?, designation = ?, rating = ?, comment = ?, image_url = ?, is_active = ? WHERE testimonial_id = ?',
            [customer_name, designation, rating, comment, image_url, is_active === undefined ? 1 : is_active, id]
        );
        res.status(200).json({ success: true, message: 'Testimonial updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM testimonials WHERE testimonial_id = ?', [id]);
        res.status(200).json({ success: true, message: 'Testimonial deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generic Toggle helper
const toggleFeaturedProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE products SET is_featured = NOT is_featured WHERE product_id = ?', [id]);
        res.status(200).json({ success: true, message: 'Featured status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const toggleFeaturedCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE categories SET is_featured = NOT is_featured WHERE category_id = ?', [id]);
        res.status(200).json({ success: true, message: 'Featured status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateCategoryImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { image_url } = req.body;
        await db.query('UPDATE categories SET image_url = ? WHERE category_id = ?', [image_url, id]);
        res.status(200).json({ success: true, message: 'Category image updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateProductHomeImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { image_url } = req.body;
        await db.query('UPDATE products SET home_image_url = ? WHERE product_id = ?', [image_url, id]);
        res.status(200).json({ success: true, message: 'Product home image updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Occasions
const getOccasions = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM home_occasions ORDER BY display_order ASC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateOccasion = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image_url, redirect_url, display_order } = req.body;
        if (id === 'new') {
            await db.query(
                'INSERT INTO home_occasions (name, image_url, redirect_url, display_order) VALUES (?, ?, ?, ?)',
                [name, image_url, redirect_url, display_order || 0]
            );
        } else {
            await db.query(
                'UPDATE home_occasions SET name = ?, image_url = ?, redirect_url = ?, display_order = ? WHERE id = ?',
                [name, image_url, redirect_url, display_order, id]
            );
        }
        res.status(200).json({ success: true, message: 'Occasion saved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteOccasion = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM home_occasions WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Occasion deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Trending Picks
const getTrendingPicks = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM home_trending_picks ORDER BY display_order ASC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateTrendingPick = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, image_url, display_order } = req.body;
        if (id === 'new') {
            await db.query(
                'INSERT INTO home_trending_picks (name, slug, image_url, display_order) VALUES (?, ?, ?, ?)',
                [name, slug, image_url, display_order || 0]
            );
        } else {
            await db.query(
                'UPDATE home_trending_picks SET name = ?, slug = ?, image_url = ?, display_order = ? WHERE id = ?',
                [name, slug, image_url, display_order, id]
            );
        }
        res.status(200).json({ success: true, message: 'Trending pick saved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteTrendingPick = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM home_trending_picks WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Trending pick deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Price Filters
const getPriceFilters = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM home_price_filters ORDER BY display_order ASC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updatePriceFilter = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, min_price, max_price, image_url, display_order } = req.body;
        if (id === 'new') {
            await db.query(
                'INSERT INTO home_price_filters (label, min_price, max_price, image_url, display_order) VALUES (?, ?, ?, ?, ?)',
                [label, min_price, max_price, image_url, display_order || 0]
            );
        } else {
            await db.query(
                'UPDATE home_price_filters SET label = ?, min_price = ?, max_price = ?, image_url = ?, display_order = ? WHERE id = ?',
                [label, min_price, max_price, image_url, display_order, id]
            );
        }
        res.status(200).json({ success: true, message: 'Price filter saved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deletePriceFilter = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM home_price_filters WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Price filter deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Newsletter
const getNewsletter = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM home_newsletter LIMIT 1');
        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateNewsletter = async (req, res) => {
    try {
        const { title, subtitle, email_placeholder, button_text, image_url } = req.body;
        const [rows] = await db.query('SELECT id FROM home_newsletter LIMIT 1');
        
        if (rows.length === 0) {
            await db.query(
                'INSERT INTO home_newsletter (title, subtitle, email_placeholder, button_text, image_url) VALUES (?, ?, ?, ?, ?)',
                [title, subtitle, email_placeholder, button_text, image_url]
            );
        } else {
            await db.query(
                'UPDATE home_newsletter SET title = ?, subtitle = ?, email_placeholder = ?, button_text = ?, image_url = ? WHERE id = ?',
                [title, subtitle, email_placeholder, button_text, image_url, rows[0].id]
            );
        }
        res.status(200).json({ success: true, message: 'Newsletter updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getHomeData,
    getHero,
    updateHero,
    uploadHeroImage,
    getAllSections,
    createSection,
    updateSection,
    deleteSection,
    getTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    toggleFeaturedProduct,
    toggleFeaturedCategory,
    updateCategoryImage,
    updateProductHomeImage,
    // New dynamic section methods
    getOccasions,
    updateOccasion,
    deleteOccasion,
    getTrendingPicks,
    updateTrendingPick,
    deleteTrendingPick,
    getPriceFilters,
    updatePriceFilter,
    deletePriceFilter,
    getNewsletter,
    updateNewsletter
};
