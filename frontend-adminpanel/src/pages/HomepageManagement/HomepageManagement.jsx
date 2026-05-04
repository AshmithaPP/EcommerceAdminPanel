import React, { useState, useEffect } from 'react';
import { privateApi } from '../../services/api';
import { Edit2, Trash2, Plus, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import Modal from '../../components/ui/Modal';
import InputBox from '../../components/ui/InputBox';
import SelectBox from '../../components/ui/SelectBox';

import styles from './HomepageManagement.module.css';

const HomepageManagement = () => {
    const [activeTab, setActiveTab] = useState('hero');
    const [heroData, setHeroData] = useState({
        title: '',
        subtitle: '',
        image_url: '',
        cta_text: '',
        redirect_url: ''
    });
    const [sections, setSections] = useState([]);
    const [testimonials, setTestimonials] = useState([]);
    const [occasions, setOccasions] = useState([]);
    const [trendingPicks, setTrendingPicks] = useState([]);
    const [priceFilters, setPriceFilters] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modals State
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    const [sectionForm, setSectionForm] = useState({
        title: '',
        type: 'best_selling',
        is_active: true,
        display_order: 0
    });

    const [showTestimonialModal, setShowTestimonialModal] = useState(false);
    const [editingTestimonial, setEditingTestimonial] = useState(null);
    const [testimonialForm, setTestimonialForm] = useState({
        customer_name: '',
        designation: '',
        rating: 5,
        comment: '',
        image_url: ''
    });

    const [showOccasionModal, setShowOccasionModal] = useState(false);
    const [editingOccasion, setEditingOccasion] = useState(null);
    const [occasionForm, setOccasionForm] = useState({ name: '', image_url: '', redirect_url: '', display_order: 0 });

    const [showTrendingModal, setShowTrendingModal] = useState(false);
    const [editingTrending, setEditingTrending] = useState(null);
    const [trendingForm, setTrendingForm] = useState({ name: '', slug: '', display_order: 0 });

    const [showPriceModal, setShowPriceModal] = useState(false);
    const [editingPrice, setEditingPrice] = useState(null);
    const [priceForm, setPriceForm] = useState({ label: '', min_price: 0, max_price: 0, display_order: 0 });

    useEffect(() => {
        fetchHero();
        fetchSections();
        fetchTestimonials();
        fetchOccasions();
        fetchTrendingPicks();
        fetchPriceFilters();
    }, []);

    const fetchHero = async () => {
        try {
            const { data } = await privateApi.get('/home/admin/hero');
            if (data.success && data.data) setHeroData(data.data);
        } catch (err) {
            console.error('Error fetching hero:', err);
        }
    };

    const fetchSections = async () => {
        try {
            const { data } = await privateApi.get('/home/admin/sections');
            if (data.success) setSections(data.data);
        } catch (err) {
            console.error('Error fetching sections:', err);
        }
    };

    const fetchTestimonials = async () => {
        try {
            const { data } = await privateApi.get('/home/admin/testimonials');
            if (data.success) setTestimonials(data.data);
        } catch (err) {
            console.error('Error fetching testimonials:', err);
        }
    };

    const fetchOccasions = async () => {
        try {
            const { data } = await privateApi.get('/home/admin/occasions');
            if (data.success) setOccasions(data.data);
        } catch (err) {
            console.error('Error fetching occasions:', err);
        }
    };

    const fetchTrendingPicks = async () => {
        try {
            const { data } = await privateApi.get('/home/admin/trending-picks');
            if (data.success) setTrendingPicks(data.data);
        } catch (err) {
            console.error('Error fetching trending picks:', err);
        }
    };

    const fetchPriceFilters = async () => {
        try {
            const { data } = await privateApi.get('/home/admin/price-filters');
            if (data.success) setPriceFilters(data.data);
        } catch (err) {
            console.error('Error fetching price filters:', err);
        }
    };

    const handleHeroUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await privateApi.put('/home/admin/hero', heroData);
            toast.success('Hero section updated successfully');
        } catch (err) {
            toast.error('Failed to update hero section');
        } finally {
            setLoading(false);
        }
    };

    // Section CRUD
    const handleSaveSection = async (e) => {
        e.preventDefault();
        try {
            if (editingSection) {
                await privateApi.put(`/home/admin/sections/${editingSection.section_id}`, sectionForm);
                toast.success('Section updated');
            } else {
                await privateApi.post('/home/admin/sections', sectionForm);
                toast.success('Section created');
            }
            setShowSectionModal(false);
            fetchSections();
        } catch (err) {
            toast.error('Operation failed');
        }
    };

    const handleDeleteSection = async (id) => {
        if (!window.confirm('Delete this section?')) return;
        try {
            await privateApi.delete(`/home/admin/sections/${id}`);
            toast.success('Section deleted');
            fetchSections();
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    // Testimonial CRUD
    const handleSaveTestimonial = async (e) => {
        e.preventDefault();
        try {
            if (editingTestimonial) {
                await privateApi.put(`/home/admin/testimonials/${editingTestimonial.testimonial_id}`, testimonialForm);
                toast.success('Testimonial updated');
            } else {
                await privateApi.post('/home/admin/testimonials', testimonialForm);
                toast.success('Testimonial created');
            }
            setShowTestimonialModal(false);
            fetchTestimonials();
        } catch (err) {
            toast.error('Operation failed');
        }
    };

    const handleDeleteTestimonial = async (id) => {
        if (!window.confirm('Delete this testimonial?')) return;
        try {
            await privateApi.delete(`/home/admin/testimonials/${id}`);
            toast.success('Testimonial deleted');
            fetchTestimonials();
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    // Occasion CRUD
    const handleSaveOccasion = async (e) => {
        e.preventDefault();
        try {
            const id = editingOccasion ? editingOccasion.id : 'new';
            await privateApi.put(`/home/admin/occasions/${id}`, occasionForm);
            toast.success('Occasion saved');
            setShowOccasionModal(false);
            fetchOccasions();
        } catch (err) { toast.error('Operation failed'); }
    };

    const handleDeleteOccasion = async (id) => {
        if (!window.confirm('Delete this?')) return;
        try {
            await privateApi.delete(`/home/admin/occasions/${id}`);
            toast.success('Deleted');
            fetchOccasions();
        } catch (err) { toast.error('Delete failed'); }
    };

    // Trending CRUD
    const handleSaveTrending = async (e) => {
        e.preventDefault();
        try {
            const id = editingTrending ? editingTrending.id : 'new';
            await privateApi.put(`/home/admin/trending-picks/${id}`, trendingForm);
            toast.success('Trending pick saved');
            setShowTrendingModal(false);
            fetchTrendingPicks();
        } catch (err) { toast.error('Operation failed'); }
    };

    const handleDeleteTrending = async (id) => {
        if (!window.confirm('Delete this?')) return;
        try {
            await privateApi.delete(`/home/admin/trending-picks/${id}`);
            toast.success('Deleted');
            fetchTrendingPicks();
        } catch (err) { toast.error('Delete failed'); }
    };

    // Price Filter CRUD
    const handleSavePrice = async (e) => {
        e.preventDefault();
        try {
            const id = editingPrice ? editingPrice.id : 'new';
            await privateApi.put(`/home/admin/price-filters/${id}`, priceForm);
            toast.success('Price filter saved');
            setShowPriceModal(false);
            fetchPriceFilters();
        } catch (err) { toast.error('Operation failed'); }
    };

    const handleDeletePrice = async (id) => {
        if (!window.confirm('Delete this?')) return;
        try {
            await privateApi.delete(`/home/admin/price-filters/${id}`);
            toast.success('Deleted');
            fetchPriceFilters();
        } catch (err) { toast.error('Delete failed'); }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerRow}>
                <h2 className={styles.title}>Homepage Management</h2>
                <Badge variant="inStock">Silk Curator CMS</Badge>
            </div>

            <div className={styles.card}>
                <div className={styles.tabs}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'hero' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('hero')}
                    >Hero Banner</button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'sections' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('sections')}
                    >Product Sections</button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'testimonials' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('testimonials')}
                    >Testimonials</button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'occasions' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('occasions')}
                    >Occasions</button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'trending' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('trending')}
                    >Trending Picks</button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'prices' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('prices')}
                    >Price Filters</button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'hero' && (
                        <form onSubmit={handleHeroUpdate}>
                            <div className={styles.formGrid}>
                                <div className={styles.fullWidth}>
                                    <InputBox 
                                        label="Main Title"
                                        value={heroData.title}
                                        onChange={(e) => setHeroData({...heroData, title: e.target.value})}
                                        placeholder="Enter eye-catching title"
                                    />
                                </div>
                                <div className={styles.fullWidth}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Subtitle</label>
                                        <textarea 
                                            className="form-control" 
                                            rows={3} 
                                            value={heroData.subtitle}
                                            onChange={(e) => setHeroData({...heroData, subtitle: e.target.value})}
                                            style={{width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db'}}
                                        />
                                    </div>
                                </div>
                                <InputBox 
                                    label="CTA Button Text"
                                    value={heroData.cta_text}
                                    onChange={(e) => setHeroData({...heroData, cta_text: e.target.value})}
                                />
                                <InputBox 
                                    label="Redirect URL"
                                    value={heroData.redirect_url}
                                    onChange={(e) => setHeroData({...heroData, redirect_url: e.target.value})}
                                />
                                <div className={styles.fullWidth}>
                                    <div className={styles.previewBox}>
                                        {heroData.image_url && <img src={heroData.image_url} alt="Preview" className={styles.previewImg} />}
                                        <InputBox 
                                            label="Image URL"
                                            value={heroData.image_url}
                                            onChange={(e) => setHeroData({...heroData, image_url: e.target.value})}
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div style={{marginTop: '2rem'}}>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : 'Update Hero Section'}
                                </Button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'sections' && (
                        <div>
                            <div className={styles.headerRow}>
                                <h5 style={{margin: 0}}>Featured Product Clusters</h5>
                                <Button size="small" onClick={() => {
                                    setEditingSection(null);
                                    setSectionForm({ title: '', type: 'best_selling', is_active: true, display_order: sections.length + 1 });
                                    setShowSectionModal(true);
                                }}>
                                    <Plus size={16} /> Create New Section
                                </Button>
                            </div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Order</th>
                                        <th>Title</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th style={{textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sections.map(section => (
                                        <tr key={section.section_id}>
                                            <td>{section.display_order}</td>
                                            <td style={{fontWeight: 600}}>{section.title}</td>
                                            <td><Badge variant="lowStock">{section.type.replace('_', ' ')}</Badge></td>
                                            <td>
                                                <Badge variant={section.is_active ? 'inStock' : 'outOfStock'}>
                                                    {section.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                <button className={styles.actionBtn} onClick={() => {
                                                    setEditingSection(section);
                                                    setSectionForm({...section});
                                                    setShowSectionModal(true);
                                                }}><Edit2 size={16} /></button>
                                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteSection(section.section_id)}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'testimonials' && (
                        <div>
                            <div className={styles.headerRow}>
                                <h5 style={{margin: 0}}>Customer Success Stories</h5>
                                <Button size="small" onClick={() => {
                                    setEditingTestimonial(null);
                                    setTestimonialForm({ customer_name: '', designation: '', rating: 5, comment: '', image_url: '' });
                                    setShowTestimonialModal(true);
                                }}>
                                    <Plus size={16} /> Add Testimonial
                                </Button>
                            </div>
                            <div className={styles.testimonialGrid}>
                                {testimonials.map(t => (
                                    <div key={t.testimonial_id} className={styles.testimonialCard}>
                                        <div className={styles.testimonialHeader}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                                <div className={styles.avatar}>{t.customer_name.charAt(0)}</div>
                                                <div>
                                                    <div style={{fontWeight: 600, fontSize: '0.9rem'}}>{t.customer_name}</div>
                                                    <div style={{fontSize: '0.75rem', color: '#6b7280'}}>{t.designation}</div>
                                                </div>
                                            </div>
                                            <div className={styles.stars}>
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={i < t.rating ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                        </div>
                                        <p style={{fontSize: '0.85rem', color: '#4b5563', fontStyle: 'italic'}}>"{t.comment}"</p>
                                        <div className={styles.actions}>
                                            <button className={styles.actionBtn} onClick={() => {
                                                setEditingTestimonial(t);
                                                setTestimonialForm({...t});
                                                setShowTestimonialModal(true);
                                            }}><Edit2 size={14} /></button>
                                            <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteTestimonial(t.testimonial_id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'occasions' && (
                        <div>
                            <div className={styles.headerRow}>
                                <h5 style={{margin: 0}}>Manage Occasions</h5>
                                <Button size="small" onClick={() => {
                                    setEditingOccasion(null);
                                    setOccasionForm({ name: '', image_url: '', redirect_url: '', display_order: 0 });
                                    setShowOccasionModal(true);
                                }}>
                                    <Plus size={16} /> Add Occasion
                                </Button>
                            </div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Order</th>
                                        <th>Name</th>
                                        <th>Link</th>
                                        <th style={{textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {occasions.map(occ => (
                                        <tr key={occ.occasion_id}>
                                            <td style={{width: '50px'}}>{occ.display_order}</td>
                                            <td>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                                    <img src={occ.image_url} style={{width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover'}} />
                                                    {occ.name}
                                                </div>
                                            </td>
                                            <td style={{fontSize: '0.8rem', color: '#6b7280'}}>{occ.redirect_url}</td>
                                            <td style={{textAlign: 'right'}}>
                                                <button className={styles.actionBtn} onClick={() => {
                                                    setEditingOccasion(occ);
                                                    setOccasionForm({ ...occ, id: occ.occasion_id });
                                                    setShowOccasionModal(true);
                                                }}><Edit2 size={16} /></button>
                                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteOccasion(occ.occasion_id)}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'trending' && (
                        <div>
                            <div className={styles.headerRow}>
                                <h5 style={{margin: 0}}>Trending Quick Links</h5>
                                <Button size="small" onClick={() => {
                                    setEditingTrending(null);
                                    setTrendingForm({ name: '', slug: '', display_order: 0 });
                                    setShowTrendingModal(true);
                                }}>
                                    <Plus size={16} /> Add Pick
                                </Button>
                            </div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Order</th>
                                        <th>Name</th>
                                        <th>Slug</th>
                                        <th style={{textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trendingPicks.map(tp => (
                                        <tr key={tp.id}>
                                            <td style={{width: '50px'}}>{tp.display_order}</td>
                                            <td>{tp.name}</td>
                                            <td style={{fontSize: '0.8rem', color: '#6b7280'}}>{tp.slug}</td>
                                            <td style={{textAlign: 'right'}}>
                                                <button className={styles.actionBtn} onClick={() => {
                                                    setEditingTrending(tp);
                                                    setTrendingForm({ ...tp });
                                                    setShowTrendingModal(true);
                                                }}><Edit2 size={16} /></button>
                                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteTrending(tp.id)}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'prices' && (
                        <div>
                            <div className={styles.headerRow}>
                                <h5 style={{margin: 0}}>Price Ranges</h5>
                                <Button size="small" onClick={() => {
                                    setEditingPrice(null);
                                    setPriceForm({ label: '', min_price: 0, max_price: 0, display_order: 0 });
                                    setShowPriceModal(true);
                                }}>
                                    <Plus size={16} /> Add Range
                                </Button>
                            </div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Order</th>
                                        <th>Label</th>
                                        <th>Min (₹)</th>
                                        <th>Max (₹)</th>
                                        <th style={{textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priceFilters.map(pf => (
                                        <tr key={pf.id}>
                                            <td style={{width: '50px'}}>{pf.display_order}</td>
                                            <td>{pf.label}</td>
                                            <td>{pf.min_price}</td>
                                            <td>{pf.max_price}</td>
                                            <td style={{textAlign: 'right'}}>
                                                <button className={styles.actionBtn} onClick={() => {
                                                    setEditingPrice(pf);
                                                    setPriceForm({ ...pf });
                                                    setShowPriceModal(true);
                                                }}><Edit2 size={16} /></button>
                                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeletePrice(pf.id)}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Section Modal */}
            <Modal 
                isOpen={showSectionModal} 
                onClose={() => setShowSectionModal(false)} 
                title={editingSection ? 'Edit Section' : 'Create New Section'}
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowSectionModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveSection}>Save Section</Button>
                    </div>
                }
            >
                <div className={styles.formGrid} style={{gridTemplateColumns: '1fr'}}>
                    <InputBox 
                        label="Section Title"
                        value={sectionForm.title}
                        onChange={(e) => setSectionForm({...sectionForm, title: e.target.value})}
                        required
                    />
                    <div className={styles.formGrid}>
                        <SelectBox 
                            label="Cluster Type"
                            value={sectionForm.type}
                            onChange={(e) => setSectionForm({...sectionForm, type: e.target.value})}
                            options={[
                                { label: 'Best Selling', value: 'best_selling' },
                                { label: 'New Arrivals', value: 'new_arrivals' },
                                { label: 'Bridal Special', value: 'bridal' },
                                { label: 'Custom Collection', value: 'custom' }
                            ]}
                        />
                        <InputBox 
                            label="Display Order"
                            type="number"
                            value={sectionForm.display_order}
                            onChange={(e) => setSectionForm({...sectionForm, display_order: e.target.value})}
                        />
                    </div>
                    <div className={styles.switchRow}>
                        <span className={styles.label}>Set Active</span>
                        <Toggle 
                            checked={sectionForm.is_active}
                            onChange={() => setSectionForm({...sectionForm, is_active: !sectionForm.is_active})}
                        />
                    </div>
                </div>
            </Modal>

            {/* Testimonial Modal */}
            <Modal 
                isOpen={showTestimonialModal} 
                onClose={() => setShowTestimonialModal(false)} 
                title={editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowTestimonialModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveTestimonial}>Save Testimonial</Button>
                    </div>
                }
            >
                <div className={styles.formGrid}>
                    <InputBox 
                        label="Customer Name"
                        value={testimonialForm.customer_name}
                        onChange={(e) => setTestimonialForm({...testimonialForm, customer_name: e.target.value})}
                        required
                    />
                    <InputBox 
                        label="Designation / Location"
                        value={testimonialForm.designation}
                        onChange={(e) => setTestimonialForm({...testimonialForm, designation: e.target.value})}
                    />
                    <div className={styles.fullWidth}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Rating (1-5)</label>
                            <input 
                                type="range" 
                                min={1} max={5} step={1}
                                value={testimonialForm.rating}
                                onChange={(e) => setTestimonialForm({...testimonialForm, rating: e.target.value})}
                                style={{width: '100%'}}
                            />
                            <div className={styles.stars} style={{justifyContent: 'center', fontSize: '1.25rem'}}>
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} fill={i < testimonialForm.rating ? "currentColor" : "none"} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className={styles.fullWidth}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Comment</label>
                            <textarea 
                                className="form-control" 
                                rows={4}
                                value={testimonialForm.comment}
                                onChange={(e) => setTestimonialForm({...testimonialForm, comment: e.target.value})}
                                required
                                style={{width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db'}}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Occasion Modal */}
            <Modal 
                isOpen={showOccasionModal} 
                onClose={() => setShowOccasionModal(false)} 
                title={editingOccasion ? 'Edit Occasion' : 'Add Occasion'}
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowOccasionModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveOccasion}>Save Occasion</Button>
                    </div>
                }
            >
                <div className={styles.formGrid}>
                    <InputBox label="Name" value={occasionForm.name} onChange={(e) => setOccasionForm({...occasionForm, name: e.target.value})} required />
                    <InputBox label="Image URL" value={occasionForm.image_url} onChange={(e) => setOccasionForm({...occasionForm, image_url: e.target.value})} placeholder="https://..." />
                    <InputBox label="Redirect URL" value={occasionForm.redirect_url} onChange={(e) => setOccasionForm({...occasionForm, redirect_url: e.target.value})} placeholder="/occasion/wedding" />
                    <InputBox label="Display Order" type="number" value={occasionForm.display_order} onChange={(e) => setOccasionForm({...occasionForm, display_order: e.target.value})} />
                </div>
            </Modal>

            {/* Trending Modal */}
            <Modal 
                isOpen={showTrendingModal} 
                onClose={() => setShowTrendingModal(false)} 
                title={editingTrending ? 'Edit Trending Pick' : 'Add Trending Pick'}
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowTrendingModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveTrending}>Save Pick</Button>
                    </div>
                }
            >
                <div className={styles.formGrid}>
                    <InputBox label="Name" value={trendingForm.name} onChange={(e) => setTrendingForm({...trendingForm, name: e.target.value})} required />
                    <InputBox label="Slug / Search Term" value={trendingForm.slug} onChange={(e) => setTrendingForm({...trendingForm, slug: e.target.value})} placeholder="pure-silk" />
                    <InputBox label="Display Order" type="number" value={trendingForm.display_order} onChange={(e) => setTrendingForm({...trendingForm, display_order: e.target.value})} />
                </div>
            </Modal>

            {/* Price Modal */}
            <Modal 
                isOpen={showPriceModal} 
                onClose={() => setShowPriceModal(false)} 
                title={editingPrice ? 'Edit Price Filter' : 'Add Price Filter'}
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowPriceModal(false)}>Cancel</Button>
                        <Button onClick={handleSavePrice}>Save Range</Button>
                    </div>
                }
            >
                <div className={styles.formGrid}>
                    <div className={styles.fullWidth}>
                        <InputBox label="Label" value={priceForm.label} onChange={(e) => setPriceForm({...priceForm, label: e.target.value})} required placeholder="Under ₹5k" />
                    </div>
                    <InputBox label="Min Price (₹)" type="number" value={priceForm.min_price} onChange={(e) => setPriceForm({...priceForm, min_price: e.target.value})} />
                    <InputBox label="Max Price (₹)" type="number" value={priceForm.max_price} onChange={(e) => setPriceForm({...priceForm, max_price: e.target.value})} />
                    <InputBox label="Display Order" type="number" value={priceForm.display_order} onChange={(e) => setPriceForm({...priceForm, display_order: e.target.value})} />
                </div>
            </Modal>
        </div>
    );
};

export default HomepageManagement;
