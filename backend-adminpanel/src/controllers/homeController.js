const db = require('../config/database');

const getHomeData = async (req, res) => {
    try {
        // 1. Fetch Hero Section
        const [hero] = await db.query('SELECT * FROM home_hero ORDER BY id DESC LIMIT 1');

        // 2. Fetch Featured Categories (Collections)
        const [categories] = await db.query(
            'SELECT category_id, name as category_name, slug, image_url, is_featured, badge FROM categories WHERE is_featured = 1 AND status = 1'
        );

        // 3. Fetch Featured Products
        const [featuredProducts] = await db.query(`
            SELECT p.*, 
                   (SELECT m.url FROM product_media pm JOIN media m ON pm.media_id = m.media_id 
                    WHERE pm.product_id = p.product_id ORDER BY pm.is_primary DESC, pm.sort_order ASC LIMIT 1) as image_url,
                   (SELECT MIN(finalPrice) FROM product_variants WHERE product_id = p.product_id AND status = 1) as starting_price
            FROM products p 
            WHERE p.is_featured = 1 AND p.status = 1
            LIMIT 10
        `);

        // 4. Fetch Dynamic Sections with Products
        const [sections] = await db.query(
            'SELECT * FROM home_sections WHERE is_active = 1 ORDER BY display_order ASC'
        );

        const productSections = await Promise.all(sections.map(async (section) => {
            const [products] = await db.query(`
                SELECT p.*, 
                       (SELECT m.url FROM product_media pm JOIN media m ON pm.media_id = m.media_id 
                        WHERE pm.product_id = p.product_id ORDER BY pm.is_primary DESC, pm.sort_order ASC LIMIT 1) as image_url,
                       (SELECT MIN(finalPrice) FROM product_variants WHERE product_id = p.product_id AND status = 1) as starting_price
                FROM products p
                JOIN home_section_products hsp ON p.product_id = hsp.product_id
                WHERE hsp.section_id = ? AND p.status = 1
                ORDER BY hsp.display_order ASC
            `, [section.section_id]);

            return {
                ...section,
                products
            };
        }));

        // 5. Fetch Testimonials
        const [testimonials] = await db.query(
            'SELECT * FROM testimonials WHERE is_active = 1'
        );

        // 6. Fetch Latest Blogs (Limit 3, preview mode)
        const [blogs] = await db.query(
            'SELECT id as blog_id, title, slug, category, published_date, excerpt, image as image_url FROM blogs WHERE is_published = 1 ORDER BY published_date DESC LIMIT 3'
        );

        // 7. Fetch Dynamic Occasions
        const [occasions] = await db.query(
            'SELECT id as occasion_id, name, image_url, redirect_url FROM home_occasions ORDER BY display_order ASC'
        );

        // 8. Fetch Dynamic Trending Picks
        const [trending] = await db.query(
            'SELECT id as category_id, name, slug FROM home_trending_picks ORDER BY display_order ASC'
        );

        // 9. Fetch Dynamic Price Filters
        const [prices] = await db.query(
            'SELECT label, min_price, max_price FROM home_price_filters ORDER BY display_order ASC'
        );

        res.status(200).json({
            success: true,
            data: {
                hero_section: hero[0] ? {
                    title: hero[0].title,
                    subtitle: hero[0].subtitle,
                    cta: {
                        text: hero[0].cta_text || 'Explore Collections',
                        redirect_url: hero[0].redirect_url || '/collections'
                    },
                    image_url: hero[0].image_url
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
                newsletter: {
                    title: "Enter The World Of Timeless Sarees",
                    subtitle: "Be the first to discover our latest collections"
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
        const { name, slug, display_order } = req.body;
        if (id === 'new') {
            await db.query(
                'INSERT INTO home_trending_picks (name, slug, display_order) VALUES (?, ?, ?)',
                [name, slug, display_order || 0]
            );
        } else {
            await db.query(
                'UPDATE home_trending_picks SET name = ?, slug = ?, display_order = ? WHERE id = ?',
                [name, slug, display_order, id]
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
        const { label, min_price, max_price, display_order } = req.body;
        if (id === 'new') {
            await db.query(
                'INSERT INTO home_price_filters (label, min_price, max_price, display_order) VALUES (?, ?, ?, ?)',
                [label, min_price, max_price, display_order || 0]
            );
        } else {
            await db.query(
                'UPDATE home_price_filters SET label = ?, min_price = ?, max_price = ?, display_order = ? WHERE id = ?',
                [label, min_price, max_price, display_order, id]
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

module.exports = {
    getHomeData,
    getHero,
    updateHero,
    getAllSections,
    createSection,
    getTestimonials,
    createTestimonial,
    toggleFeaturedProduct,
    toggleFeaturedCategory,
    // New dynamic section methods
    getOccasions,
    updateOccasion,
    deleteOccasion,
    getTrendingPicks,
    updateTrendingPick,
    deleteTrendingPick,
    getPriceFilters,
    updatePriceFilter,
    deletePriceFilter
};
