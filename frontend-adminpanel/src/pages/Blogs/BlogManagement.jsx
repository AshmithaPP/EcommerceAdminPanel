import React, { useState, useEffect } from 'react';
import { privateApi } from '../../services/api';
import { Edit2, Trash2, Plus, Upload, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { STORAGE_URL } from '../../config/api';

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
        subtitle: '',
        slug: '',
        category: '',
        excerpt: '',
        content: '',
        image: '',
        is_published: false,
        published_date: ''
    });
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [validationMsg, setValidationMsg] = useState(null);

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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Client-side Format Validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only WebP and JPEG/JPG formats are allowed.');
            return;
        }

        // 2. Client-side Size Validation (200 KB)
        if (file.size > 200 * 1024) {
            toast.error('File size exceeds 200 KB. Please optimize the image.');
            return;
        }

        // 3. Client-side Resolution Validation
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const width = img.width;
            const height = img.height;
            
            if (width < 1280 || height < 720 || width > 1920 || height > 1080) {
                toast.error(`Invalid resolution: ${width}x${height}. Required: 1280x720 to 1920x1080.`);
                return;
            }

            // 4. Upload to Server
            setUploading(true);
            setValidationMsg('Uploading and validating on server...');
            
            const formDataUpload = new FormData();
            formDataUpload.append('image', file);

            try {
                const { data } = await privateApi.post('/blogs/admin/upload', formDataUpload);
                if (data.success) {
                    setFormData(prev => ({ ...prev, image: data.image_url }));
                    setPreviewImage(data.image_url);
                    setValidationMsg('Image optimized and verified successfully');
                    toast.success('Image uploaded successfully');
                }
            } catch (err) {
                const msg = err.response?.data?.message || 'Upload failed';
                toast.error(msg);
                setValidationMsg(null);
            } finally {
                setUploading(false);
            }
        };
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const finalData = { ...formData, image: formData.image || formData.image_url };
            if (editingBlog) {
                await privateApi.put(`/blogs/${editingBlog.id || editingBlog.blog_id}`, finalData);
                toast.success('Blog updated');
            } else {
                await privateApi.post('/blogs', finalData);
                toast.success('Blog created');
            }
            setShowModal(false);
            fetchBlogs();
            setPreviewImage(null);
            setValidationMsg(null);
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
                    setFormData({ title: '', subtitle: '', slug: '', category: '', excerpt: '', content: '', image: '', is_published: false, published_date: '' });
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
                onClose={() => {
                    setShowModal(false);
                    setPreviewImage(null);
                    setValidationMsg(null);
                }} 
                title={editingBlog ? 'Edit Blog' : 'Create Blog'}
                maxWidth="700px"
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={uploading}>Save Blog Post</Button>
                    </div>
                }
            >
                <div className={styles.formGrid}>
                    <div className={styles.fullWidth}>
                        <div className={styles.imageUploadSection}>
                            <label className={styles.label}>Blog Featured Image</label>
                            
                            <div className={styles.uploadArea}>
                                <div className={styles.validationInfo}>
                                    <AlertCircle size={14} />
                                    <span>Recommended: WebP, 1920x1080, Max 200KB. Strictly: Min 1280x720, Block PNG.</span>
                                </div>

                                <div className={styles.uploadTriggerRow}>
                                    <input 
                                        type="file" 
                                        id="blogImgUpload" 
                                        accept="image/jpeg,image/webp" 
                                        onChange={handleImageUpload}
                                        style={{display: 'none'}}
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => document.getElementById('blogImgUpload').click()}
                                        isLoading={uploading}
                                    >
                                        <Upload size={14} /> {formData.image ? 'Change Image' : 'Select Image'}
                                    </Button>
                                    
                                    {validationMsg && (
                                        <span className={styles.successMsg}>
                                            <Check size={14} /> {validationMsg}
                                        </span>
                                    )}
                                </div>

                                {(previewImage || formData.image || formData.image_url) && (
                                    <div className={styles.previewBox}>
                                        <div className={styles.previewOverlay}>
                                            <span>Optimized Preview</span>
                                        </div>
                                        <img 
                                            src={formData.image?.startsWith('http') || formData.image_url?.startsWith('http') 
                                                ? (formData.image || formData.image_url) 
                                                : `${STORAGE_URL}${formData.image || formData.image_url}`} 
                                            alt="Preview" 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.fullWidth}>
                        <InputBox 
                            label="Title"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required
                        />
                    </div>
                    <div className={styles.fullWidth}>
                        <InputBox 
                            label="Subtitle (appears under title on detail page)"
                            value={formData.subtitle}
                            onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
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
                    <InputBox 
                        label="Published Date (e.g. 13 March 2026)"
                        value={formData.published_date}
                        onChange={(e) => setFormData({...formData, published_date: e.target.value})}
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
