const db = require('../config/database');

const homeService = {
    getHomeData: async () => {
        // 1. Fetch Hero Section
        const [hero] = await db.query('SELECT * FROM home_hero ORDER BY id DESC LIMIT 1');

        // 2. Fetch Featured Categories
        const [categories] = await db.query(
            'SELECT category_id, name as category_name, slug, image_url, is_featured, badge FROM categories WHERE is_featured = 1 AND status = 1'
        );

        // 3. Fetch Featured Products
        const [featuredProducts] = await db.query(`
            SELECT p.*, 
                   COALESCE(p.home_image_url, (SELECT m.url FROM product_media pm JOIN media m ON pm.media_id = m.media_id 
                    WHERE pm.product_id = p.product_id ORDER BY pm.is_primary DESC, pm.sort_order ASC LIMIT 1)) as image_url,
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
                       COALESCE(p.home_image_url, (SELECT m.url FROM product_media pm JOIN media m ON pm.media_id = m.media_id 
                        WHERE pm.product_id = p.product_id ORDER BY pm.is_primary DESC, pm.sort_order ASC LIMIT 1)) as image_url,
                       (SELECT MIN(finalPrice) FROM product_variants WHERE product_id = p.product_id AND status = 1) as starting_price
                FROM products p
                JOIN home_section_products hsp ON p.product_id = hsp.product_id
                WHERE hsp.section_id = ? AND p.status = 1
                ORDER BY hsp.display_order ASC
            `, [section.section_id]);

            return { ...section, products };
        }));

        // 5. Testimonials
        const [testimonials] = await db.query('SELECT * FROM testimonials WHERE is_active = 1');

        // 6. Blogs
        const [blogs] = await db.query(
            'SELECT id as blog_id, title, slug, category, published_date, excerpt, image as image_url FROM blogs WHERE is_published = 1 ORDER BY published_date DESC LIMIT 3'
        );

        // 7. Occasions
        const [occasions] = await db.query(
            'SELECT id as occasion_id, name, image_url, redirect_url FROM home_occasions ORDER BY display_order ASC'
        );

        // 8. Trending Picks
        const [trending] = await db.query(
            'SELECT id as category_id, name, slug, image_url, display_order FROM home_trending_picks ORDER BY display_order ASC'
        );

        // 9. Price Filters
        const [prices] = await db.query(
            'SELECT id, label, min_price, max_price, image_url, display_order FROM home_price_filters ORDER BY display_order ASC'
        );

        // 10. Newsletter
        const [newsletter] = await db.query('SELECT * FROM home_newsletter LIMIT 1');

        return {
            hero: hero[0],
            categories,
            featuredProducts,
            productSections,
            testimonials,
            blogs,
            occasions,
            trending,
            prices,
            newsletter: newsletter[0]
        };
    },

    // Hero Methods
    getHero: async () => {
        const [hero] = await db.query('SELECT * FROM home_hero ORDER BY id DESC LIMIT 1');
        return hero[0] || null;
    },

    updateHero: async (data) => {
        const { title, subtitle, image_url, cta_text, redirect_url } = data;
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
    },

    // Section Methods
    getSections: async () => {
        const [sections] = await db.query('SELECT * FROM home_sections ORDER BY display_order ASC');
        return sections;
    },

    saveSection: async (id, data) => {
        const { title, type, is_active, display_order } = data;
        const [existing] = await db.query('SELECT section_id FROM home_sections WHERE section_id = ?', [id]);
        if (existing.length > 0) {
            await db.query(
                'UPDATE home_sections SET title = ?, type = ?, is_active = ?, display_order = ? WHERE section_id = ?',
                [title, type, is_active, display_order, id]
            );
        } else {
            await db.query(
                'INSERT INTO home_sections (section_id, title, type, is_active, display_order) VALUES (?, ?, ?, ?, ?)',
                [id || require('crypto').randomUUID(), title, type, is_active, display_order || 0]
            );
        }
    },

    deleteSection: async (id) => {
        await db.query('DELETE FROM home_sections WHERE section_id = ?', [id]);
    }
};

module.exports = homeService;
