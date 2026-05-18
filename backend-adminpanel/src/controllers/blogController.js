const db = require('../config/database');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Public: Get all published blogs (paginated)
const getAllBlogs = async (req, res) => {
    try {
        const { category, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT id as blog_id, title, subtitle, slug, category, published_date, excerpt, image as image_url, content, is_published FROM blogs WHERE 1=1';
        const queryParams = [];

        // For public requests, only show published
        if (!req.user || req.user.role === 'user') {
            query += ' AND is_published = 1';
        }

        if (category) {
            query += ' AND category = ?';
            queryParams.push(category);
        }

        query += ' ORDER BY published_date DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), offset);

        const [blogs] = await db.query(query, queryParams);

        let countQuery = 'SELECT COUNT(*) as total FROM blogs WHERE 1=1';
        if (!req.user || req.user.role === 'user') {
            countQuery += ' AND is_published = 1';
        }
        const countParams = [];
        if (category) {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }
        const [countResult] = await db.query(countQuery, countParams);
        const total = countResult[0].total;
        
        // --- Dynamic Blog Hero Settings ---
        const [settingsRows] = await db.query("SELECT value FROM settings WHERE settings_key = 'blog_hero'");
        let hero = {
            over_title: "LEGACY OF THE LOOM",
            title: "Timeless Tradition Woven in Silk",
            subtitle: "Celebrating the heritage of authentic Kanchipuram silk sarees crafted by master weavers through generations of sacred geometry and golden threads.",
            button_text: "Explore Collections",
            image_url: "/uploads/blog_hero.png"
        };
        if (settingsRows.length > 0) {
            hero = typeof settingsRows[0].value === 'string' ? JSON.parse(settingsRows[0].value) : settingsRows[0].value;
        }

        res.status(200).json({
            success: true,
            data: blogs,
            hero,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// Public: Get blog by slug or ID
const getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Try searching by slug first
        let [blogs] = await db.query(
            'SELECT id as blog_id, title, subtitle, slug, category, published_date, excerpt, image as image_url, content FROM blogs WHERE (slug = ? OR id = ?) AND is_published = 1',
            [slug, slug]
        );

        if (blogs.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        res.status(200).json({ success: true, data: blogs[0] });
    } catch (error) {
        console.error('Error fetching blog details:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// Admin: Get blog by ID
const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        const [blogs] = await db.query('SELECT * FROM blogs WHERE id = ?', [id]);

        if (blogs.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        res.status(200).json({ success: true, data: blogs[0] });
    } catch (error) {
        console.error('Error fetching blog by id:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// Admin: Create Blog
const createBlog = async (req, res) => {
    try {
        const { title, subtitle, slug, content, author, image, category, excerpt, is_published, published_date } = req.body;
        
        const [result] = await db.query(
            'INSERT INTO blogs (title, subtitle, slug, content, author, image, category, excerpt, is_published, published_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, subtitle, slug, content, author, image, category, excerpt, is_published || false, published_date || new Date()]
        );

        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            blog_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

// Admin: Update Blog
const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, subtitle, slug, content, author, image, category, excerpt, is_published, published_date } = req.body;

        await db.query(
            'UPDATE blogs SET title = ?, subtitle = ?, slug = ?, content = ?, author = ?, image = ?, category = ?, excerpt = ?, is_published = ?, published_date = ? WHERE id = ?',
            [title, subtitle, slug, content, author, image, category, excerpt, is_published, published_date, id]
        );

        res.status(200).json({ success: true, message: 'Blog updated successfully' });
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// Admin: Delete Blog
const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM blogs WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Blog deleted successfully' });
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const uploadBlogImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const metadata = await sharp(filePath).metadata();

        // Validate dimensions: 1280x720 (min) to 1920x1080 (max)
        const minWidth = 1280;
        const minHeight = 720;
        const maxWidth = 1920;
        const maxHeight = 1080;

        if (metadata.width < minWidth || metadata.height < minHeight || 
            metadata.width > maxWidth || metadata.height > maxHeight) {
            
            // Delete the invalid file
            fs.unlinkSync(filePath);
            return res.status(400).json({ 
                success: false, 
                message: `Invalid resolution: ${metadata.width}x${metadata.height}. Required between ${minWidth}x${minHeight} and ${maxWidth}x${maxHeight}.` 
            });
        }

        const imageUrl = `/uploads/blogs/${req.file.filename}`;
        res.status(200).json({
            success: true,
            message: 'Blog image uploaded and validated',
            image_url: imageUrl,
            dimensions: { width: metadata.width, height: metadata.height }
        });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllBlogs,
    getBlogBySlug,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    uploadBlogImage
};
