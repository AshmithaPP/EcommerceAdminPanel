import React, { useState, useEffect } from 'react';
import { privateApi } from '../../services/api';
import { Edit2, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import Modal from '../../components/ui/Modal';
import InputBox from '../../components/ui/InputBox';

import styles from './BlogManagement.module.css';

const BlogManagement = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        category: '',
        excerpt: '',
        content: '',
        is_published: false
    });

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const { data } = await privateApi.get('/blogs');
            if (data.success) setBlogs(data.data);
        } catch (err) {
            toast.error('Failed to fetch blogs');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingBlog) {
                await privateApi.put(`/blogs/${editingBlog.id || editingBlog.blog_id}`, formData);
                toast.success('Blog updated');
            } else {
                await privateApi.post('/blogs', formData);
                toast.success('Blog created');
            }
            setShowModal(false);
            fetchBlogs();
        } catch (err) {
            toast.error('Save failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this blog?')) return;
        try {
            await privateApi.delete(`/blogs/${id}`);
            toast.success('Blog deleted');
            fetchBlogs();
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerRow}>
                <h2 className={styles.title}>Blog Management</h2>
                <Button onClick={() => {
                    setEditingBlog(null);
                    setFormData({ title: '', slug: '', category: '', excerpt: '', content: '', is_published: false });
                    setShowModal(true);
                }}>
                    <Plus size={16} /> New Blog Post
                </Button>
            </div>

            <div className={styles.card}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Title & Slug</th>
                            <th>Category</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th style={{textAlign: 'right'}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {blogs.map(blog => (
                            <tr key={blog.blog_id || blog.id}>
                                <td>
                                    <div className={styles.blogInfo}>
                                        <span className={styles.blogTitle}>{blog.title}</span>
                                        <span className={styles.blogSlug}>{blog.slug}</span>
                                    </div>
                                </td>
                                <td><Badge variant="inStock">{blog.category}</Badge></td>
                                <td>{blog.published_date ? new Date(blog.published_date).toLocaleDateString() : 'Draft'}</td>
                                <td>
                                    <Badge variant={blog.is_published ? 'inStock' : 'outOfStock'}>
                                        {blog.is_published ? 'Published' : 'Draft'}
                                    </Badge>
                                </td>
                                <td style={{textAlign: 'right'}}>
                                    <div className={styles.actions}>
                                        <button className={styles.actionBtn} onClick={() => {
                                            setEditingBlog(blog);
                                            setFormData({...blog});
                                            setShowModal(true);
                                        }}><Edit2 size={16} /></button>
                                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(blog.blog_id || blog.id)}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
                title={editingBlog ? 'Edit Blog' : 'Create Blog'}
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Blog Post</Button>
                    </div>
                }
            >
                <div className={styles.formGrid}>
                    <div className={styles.fullWidth}>
                        <InputBox 
                            label="Title"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required
                        />
                    </div>
                    <InputBox 
                        label="Slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        required
                    />
                    <InputBox 
                        label="Category"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                    <div className={styles.fullWidth}>
                        <div className={styles.textareaGroup}>
                            <label className={styles.label}>Excerpt (Preview Text)</label>
                            <textarea 
                                className={styles.textarea}
                                rows={2}
                                value={formData.excerpt}
                                onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className={styles.fullWidth}>
                        <div className={styles.textareaGroup}>
                            <label className={styles.label}>Content (HTML supported)</label>
                            <textarea 
                                className={styles.textarea}
                                rows={10}
                                value={formData.content}
                                onChange={(e) => setFormData({...formData, content: e.target.value})}
                                required
                            />
                        </div>
                    </div>
                    <div className={styles.switchRow}>
                        <span className={styles.label}>Published</span>
                        <Toggle 
                            checked={formData.is_published}
                            onChange={() => setFormData({...formData, is_published: !formData.is_published})}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BlogManagement;
