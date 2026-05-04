const db = require('../config/database');

// Public: Get all published blogs (paginated)
const getAllBlogs = async (req, res) => {
    try {
        const { category, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT id as blog_id, title, slug, category, published_date, excerpt, image as image_url FROM blogs WHERE is_published = 1';
        const queryParams = [];

        if (category) {
            query += ' AND category = ?';
            queryParams.push(category);
        }

        query += ' ORDER BY published_date DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), offset);

        const [blogs] = await db.query(query, queryParams);

        let countQuery = 'SELECT COUNT(*) as total FROM blogs WHERE is_published = 1';
        const countParams = [];
        if (category) {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }
        const [countResult] = await db.query(countQuery, countParams);
        const total = countResult[0].total;

        res.status(200).json({
            success: true,
            data: blogs,
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

// Public: Get blog by slug
const getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const [blogs] = await db.query(
            'SELECT id as blog_id, title, slug, category, published_date, excerpt, image as image_url, content FROM blogs WHERE slug = ? AND is_published = 1',
            [slug]
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
        const { title, slug, content, author, image, category, excerpt, is_published, published_date } = req.body;
        
        const [result] = await db.query(
            'INSERT INTO blogs (title, slug, content, author, image, category, excerpt, is_published, published_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, slug, content, author, image, category, excerpt, is_published || false, published_date || new Date()]
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
        const { title, slug, content, author, image, category, excerpt, is_published, published_date } = req.body;

        await db.query(
            'UPDATE blogs SET title = ?, slug = ?, content = ?, author = ?, image = ?, category = ?, excerpt = ?, is_published = ?, published_date = ? WHERE id = ?',
            [title, slug, content, author, image, category, excerpt, is_published, published_date, id]
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

module.exports = {
    getAllBlogs,
    getBlogBySlug,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog
};
