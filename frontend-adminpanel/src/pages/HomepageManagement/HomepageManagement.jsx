import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Star, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import Modal from '../../components/ui/Modal';
import InputBox from '../../components/ui/InputBox';
import SelectBox from '../../components/ui/SelectBox';
import useHomeStore from '../../store/homeStore';
import styles from './HomepageManagement.module.css';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${STORAGE_URL}${cleanUrl}`;
};

const HomepageManagement = () => {
    const {
        heroData, sections, testimonials, occasions, trendingPicks, priceFilters, categories, products, newsletter, isLoading,
        fetchHero, updateHero, fetchSections, saveSection, deleteSection,
        fetchTestimonials, saveTestimonial, deleteTestimonial,
        fetchOccasions, saveOccasion, deleteOccasion, fetchTrendingPicks, saveTrendingPick, deleteTrendingPick,
        fetchPriceFilters, savePriceFilter, deletePriceFilter, fetchCategories, toggleCategoryFeatured, updateCategoryImage,
        fetchProducts, toggleProductFeatured, updateProductHomeImage, uploadImage, uploadHeroImage, fetchNewsletter, updateNewsletter
    } = useHomeStore();

    const [activeTab, setActiveTab] = useState('hero');
    
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

    const [showCatImageModal, setShowCatImageModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showProductImageModal, setShowProductImageModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [tempImageUrl, setTempImageUrl] = useState('');

    useEffect(() => {
        fetchHero();
        fetchSections();
        fetchTestimonials();
        fetchOccasions();
        fetchTrendingPicks();
        fetchPriceFilters();
        fetchCategories();
        fetchProducts();
        fetchNewsletter();
    }, []);

    const handleHeroUpdate = async (e) => {
        if (e) e.preventDefault();
        updateHero(heroData);
    };

    const handleHeroImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Client-side Validation: Format (WebP, JPEG)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid format. Only WebP (preferred) and JPEG are allowed for hero banners.');
            e.target.value = '';
            return;
        }

        // 2. Client-side Validation: Size (200 KB)
        if (file.size > 200 * 1024) {
            toast.error('File size exceeds 200 KB. Please optimize the image.');
            e.target.value = '';
            return;
        }

        // 3. Client-side Validation: Resolution check
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        
        img.onload = async () => {
            const minW = 1280, minH = 720;
            const maxW = 1920, maxH = 1080;

            if (img.width < minW || img.height < minH) {
                toast.error(`Resolution too low (${img.width}x${img.height}). Minimum required: ${minW}x${minH}.`);
                URL.revokeObjectURL(objectUrl);
                return;
            }

            if (img.width > maxW || img.height > maxH) {
                toast.error(`Resolution too high (${img.width}x${img.height}). Maximum allowed: ${maxW}x${maxH}.`);
                URL.revokeObjectURL(objectUrl);
                return;
            }

            // If all good, upload to server
            const url = await uploadHeroImage(file);
            if (url) {
                // Update local state for preview, but don't save to DB yet (user clicks Update Hero Section to save)
                useHomeStore.setState({ heroData: { ...heroData, image_url: url } });
            }
            URL.revokeObjectURL(objectUrl);
        };
    };

    const handleSaveSection = async (e) => {
        if (e) e.preventDefault();
        const success = await saveSection(editingSection ? editingSection.section_id : 'new', sectionForm);
        if (success) setShowSectionModal(false);
    };

    const handleDeleteSection = async (id) => {
        if (window.confirm('Delete this section and remove it from homepage?')) {
            await deleteSection(id);
        }
    };

    const handleSaveTestimonial = async (e) => {
        if (e) e.preventDefault();
        const success = await saveTestimonial(editingTestimonial ? editingTestimonial.testimonial_id : 'new', testimonialForm);
        if (success) setShowTestimonialModal(false);
    };

    const handleDeleteTestimonial = async (id) => {
        if (window.confirm('Delete this testimonial?')) deleteTestimonial(id);
    };

    const handleSaveOccasion = async (e) => {
        if (e) e.preventDefault();
        const success = await saveOccasion(editingOccasion ? editingOccasion.id : 'new', occasionForm);
        if (success) setShowOccasionModal(false);
    };

    const handleSaveTrending = async (e) => {
        if (e) e.preventDefault();
        const success = await saveTrendingPick(editingTrending ? editingTrending.id : 'new', trendingForm);
        if (success) setShowTrendingModal(false);
    };

    const handleSavePrice = async (e) => {
        if (e) e.preventDefault();
        const success = await savePriceFilter(editingPrice ? editingPrice.id : 'new', priceForm);
        if (success) setShowPriceModal(false);
    };

    const handleDeleteOccasion = (id) => {
        if (window.confirm('Delete this occasion?')) deleteOccasion(id);
    };

    const handleDeleteTrending = (id) => {
        if (window.confirm('Delete this pick?')) deleteTrendingPick(id);
    };

    const handleDeletePrice = (id) => {
        if (window.confirm('Delete this price range?')) deletePriceFilter(id);
    };

    const handleCategoryImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const url = await uploadImage(file);
        if (url) {
            const success = await updateCategoryImage(selectedCategory.category_id, url);
            if (success) setShowCatImageModal(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
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
                    <button 
                        className={`${styles.tab} ${activeTab === 'collections' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('collections')}
                    >Home Collections</button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'featuredProducts' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('featuredProducts')}
                    >Featured Products</button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'newsletter' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('newsletter')}
                    >Newsletter</button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'hero' && (
                        <form onSubmit={handleHeroUpdate}>
                            <div className={styles.formGrid}>
                                <div className={styles.fullWidth}>
                                    <InputBox 
                                        label="Main Title"
                                        value={heroData.title}
                                        onChange={(e) => useHomeStore.setState({ heroData: { ...heroData, title: e.target.value } })}
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
                                            onChange={(e) => useHomeStore.setState({ heroData: { ...heroData, subtitle: e.target.value } })}
                                            style={{width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db'}}
                                        />
                                    </div>
                                </div>
                                <InputBox 
                                    label="CTA Button Text"
                                    value={heroData.cta_text}
                                    onChange={(e) => useHomeStore.setState({ heroData: { ...heroData, cta_text: e.target.value } })}
                                />
                                <InputBox 
                                    label="Redirect URL"
                                    value={heroData.redirect_url}
                                    onChange={(e) => useHomeStore.setState({ heroData: { ...heroData, redirect_url: e.target.value } })}
                                />
                                <div className={styles.fullWidth}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Hero Image</label>
                                        <div className={styles.previewBox}>
                                            <div className={styles.validationInfo}>
                                                <span>Recommended: WebP, 1920x1080, Max 200KB</span>
                                                <span>Strictly: Min 1280x720</span>
                                            </div>
                                            {heroData.image_url ? (
                                                <div className={styles.previewContainer}>
                                                    <img src={getImageUrl(heroData.image_url)} alt="Preview" className={styles.previewImg} />
                                                    <div className={styles.previewOverlay}>
                                                        <Badge variant="inStock">Optimized Preview</Badge>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.uploadPlaceholder}>
                                                    <Upload size={48} color="#9ca3af" />
                                                    <p>No image uploaded</p>
                                                </div>
                                            )}
                                            
                                            <div className={styles.uploadActions}>
                                                <Button 
                                                    type="button" 
                                                    variant="secondary" 
                                                    size="small"
                                                    onClick={() => document.getElementById('heroImageUpload').click()}
                                                    disabled={isLoading}
                                                >
                                                    <Upload size={16} style={{marginRight: '8px'}} />
                                                    {isLoading ? 'Processing...' : 'Choose File'}
                                                </Button>
                                                <input 
                                                    id="heroImageUpload"
                                                    type="file" 
                                                    accept="image/jpeg, image/jpg, image/webp" 
                                                    onChange={handleHeroImageUpload} 
                                                    style={{display: 'none'}}
                                                />
                                            </div>

                                            <div style={{width: '100%', marginTop: '1rem'}}>
                                                <InputBox 
                                                    label="Or enter Image URL"
                                                    value={heroData.image_url}
                                                    onChange={(e) => useHomeStore.setState({ heroData: { ...heroData, image_url: e.target.value } })}
                                                    placeholder="https://example.com/image.jpg"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{marginTop: '2rem'}}>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Saving...' : 'Update Hero Section'}
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
                                                {t.image_url ? (
                                                    <img src={getImageUrl(t.image_url)} alt={t.customer_name} className={styles.avatar} style={{objectFit: 'cover'}} />
                                                ) : (
                                                    <div className={styles.avatar}>{t.customer_name.charAt(0)}</div>
                                                )}
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
                                                    <img src={getImageUrl(occ.image_url)} style={{width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover'}} />
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
                                        <th>Image</th>
                                        <th>Name</th>
                                        <th>Slug</th>
                                        <th style={{textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trendingPicks.map(tp => (
                                        <tr key={tp.id}>
                                            <td style={{width: '50px'}}>{tp.display_order}</td>
                                            <td>
                                                <img src={getImageUrl(tp.image_url)} alt={tp.name} style={{width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover'}} />
                                            </td>
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
                                        <th>Image</th>
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
                                            <td>
                                                <img src={getImageUrl(pf.image_url)} alt={pf.label} style={{width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover'}} />
                                            </td>
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

                    {activeTab === 'collections' && (
                        <div>
                           
                            <p style={{fontSize: '0.8rem', color: '#6b7280', marginBottom: '1.5rem'}}>Categories toggled as 'Featured' will appear in the Collections section of the homepage.</p>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Category Name</th>
                                        <th>Slug</th>
                                        <th>Badge/Designs</th>
                                        <th style={{textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(cat => (
                                        <tr key={cat.category_id}>
                                            <td>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                                    {cat.image_url ? (
                                                        <img 
                                                            src={getImageUrl(cat.image_url)} 
                                                            alt={cat.name} 
                                                            style={{width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover'}}
                                                            onError={(e) => {
                                                                e.target.onerror = null; 
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div 
                                                        style={{
                                                            width: '40px', 
                                                            height: '40px', 
                                                            borderRadius: '4px', 
                                                            background: '#f3f4f6', 
                                                            display: cat.image_url ? 'none' : 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center', 
                                                            fontSize: '0.75rem', 
                                                            fontWeight: 600, 
                                                            color: '#9ca3af'
                                                        }}
                                                    >
                                                        {cat.name.charAt(0)}
                                                    </div>
                                                    <button 
                                                        className={styles.actionBtn}
                                                        onClick={() => {
                                                            setSelectedCategory(cat);
                                                            setShowCatImageModal(true);
                                                        }}
                                                        title="Update Image"
                                                    >
                                                        <Upload size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{fontWeight: 600}}>{cat.name}</td>
                                            <td style={{fontSize: '0.85rem', color: '#6b7280'}}>{cat.slug}</td>
                                            <td><Badge variant="lowStock">{cat.badge || '0+ Designs'}</Badge></td>
                                            <td style={{textAlign: 'right'}}>
                                                <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem'}}>
                                                    <span style={{fontSize: '0.75rem', color: '#6b7280'}}>Show on Home</span>
                                                    <Toggle 
                                                        checked={!!cat.is_featured}
                                                        onChange={() => toggleCategoryFeatured(cat.category_id)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'featuredProducts' && (
                        <div>
                            <div className={styles.headerRow}>
                                <h5 style={{margin: 0}}>Featured Products (Show on Home)</h5>
                            </div>
                            <p style={{fontSize: '0.8rem', color: '#6b7280', marginBottom: '1.5rem'}}>Products toggled here will be displayed in the "Featured Products" grid on the homepage.</p>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Product Name</th>
                                        <th>SKU</th>
                                        <th>Price</th>
                                        <th style={{textAlign: 'right'}}>Show on Home</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.product_id}>
                                            <td>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                    <img 
                                                        src={getImageUrl(product.image_url)} 
                                                        alt={product.name} 
                                                        style={{width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover'}}
                                                    />
                                                    <button 
                                                        className={styles.actionBtn}
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setTempImageUrl(product.image_url || '');
                                                            setShowProductImageModal(true);
                                                        }}
                                                        title="Update Homepage Image"
                                                    >
                                                        <Upload size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{fontWeight: 600}}>{product.name}</td>
                                            <td style={{fontSize: '0.85rem', color: '#6b7280'}}>{product.base_sku}</td>
                                            <td style={{fontSize: '0.85rem'}}>₹{product.starting_price || 'N/A'}</td>
                                            <td style={{textAlign: 'right'}}>
                                                <Toggle 
                                                    checked={Boolean(product.is_featured)}
                                                    onChange={() => toggleProductFeatured(product.product_id)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'newsletter' && (
                        <form onSubmit={(e) => { e.preventDefault(); updateNewsletter(newsletter); }}>
                            <div className={styles.formGrid}>
                                <div className={styles.fullWidth}>
                                    <InputBox 
                                        label="Main Title"
                                        value={newsletter.title}
                                        onChange={(e) => useHomeStore.setState({ newsletter: { ...newsletter, title: e.target.value } })}
                                    />
                                </div>
                                <div className={styles.fullWidth}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Subtitle</label>
                                        <textarea 
                                            className="form-control" 
                                            rows={2} 
                                            value={newsletter.subtitle}
                                            onChange={(e) => useHomeStore.setState({ newsletter: { ...newsletter, subtitle: e.target.value } })}
                                            style={{width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db'}}
                                        />
                                    </div>
                                </div>
                                <InputBox 
                                    label="Email Placeholder"
                                    value={newsletter.email_placeholder}
                                    onChange={(e) => useHomeStore.setState({ newsletter: { ...newsletter, email_placeholder: e.target.value } })}
                                />
                                <InputBox 
                                    label="Button Text"
                                    value={newsletter.button_text}
                                    onChange={(e) => useHomeStore.setState({ newsletter: { ...newsletter, button_text: e.target.value } })}
                                />
                                <div className={styles.fullWidth}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Newsletter Image</label>
                                        <div className={styles.previewBox}>
                                            {newsletter.image_url ? (
                                                <img src={getImageUrl(newsletter.image_url)} alt="Preview" className={styles.previewImg} style={{maxHeight: '150px'}} />
                                            ) : (
                                                <div className={styles.uploadPlaceholder}>
                                                    <Upload size={32} color="#9ca3af" />
                                                    <p>No image</p>
                                                </div>
                                            )}
                                            <div className={styles.uploadActions}>
                                                <Button type="button" variant="secondary" size="small" onClick={() => document.getElementById('newsletterImgUpload').click()} disabled={isLoading}>
                                                    <Upload size={14} /> {isLoading ? 'Uploading...' : 'Upload'}
                                                </Button>
                                                <input id="newsletterImgUpload" type="file" hidden onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const url = await uploadImage(file);
                                                        if (url) useHomeStore.setState({ newsletter: { ...newsletter, image_url: url } });
                                                    }
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.fullWidth} style={{marginTop: '1rem'}}>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Saving...' : 'Update Newsletter Settings'}
                                    </Button>
                                </div>
                            </div>
                        </form>
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
                            <label className={styles.label}>Avatar / Image</label>
                            <div className={styles.previewBox} style={{padding: '0.5rem'}}>
                                {testimonialForm.image_url && <img src={getImageUrl(testimonialForm.image_url)} alt="Preview" className={styles.previewImg} style={{maxHeight: '100px'}} />}
                                <div className={styles.uploadActions}>
                                    <Button type="button" variant="secondary" size="small" onClick={() => document.getElementById('testimonialImgUpload').click()} disabled={isLoading}>
                                        <Upload size={14} /> {isLoading ? 'Uploading...' : 'Upload'}
                                    </Button>
                                    <input id="testimonialImgUpload" type="file" hidden onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const url = await uploadImage(file);
                                            if (url) setTestimonialForm({ ...testimonialForm, image_url: url });
                                        }
                                    }} />
                                </div>
                                <div style={{width: '100%', marginTop: '0.5rem'}}>
                                    <InputBox 
                                        label="Or URL" 
                                        value={testimonialForm.image_url} 
                                        onChange={(e) => setTestimonialForm({...testimonialForm, image_url: e.target.value})} 
                                    />
                                </div>
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
                    <div className={styles.fullWidth}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Occasion Image</label>
                            <div className={styles.previewBox} style={{padding: '0.5rem'}}>
                                {occasionForm.image_url && <img src={getImageUrl(occasionForm.image_url)} alt="Preview" className={styles.previewImg} style={{maxHeight: '100px'}} />}
                                <div className={styles.uploadActions}>
                                    <Button type="button" variant="secondary" size="small" onClick={() => document.getElementById('occImgUpload').click()} disabled={isLoading}>
                                        <Upload size={14} /> {isLoading ? 'Uploading...' : 'Upload'}
                                    </Button>
                                    <input id="occImgUpload" type="file" hidden onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const url = await uploadImage(file);
                                            if (url) setOccasionForm({ ...occasionForm, image_url: url });
                                        }
                                    }} />
                                </div>
                                <div style={{width: '100%', marginTop: '0.5rem'}}>
                                    <InputBox label="Or URL" value={occasionForm.image_url} onChange={(e) => setOccasionForm({...occasionForm, image_url: e.target.value})} placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                    </div>
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
                    <div className={styles.fullWidth}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Pick Image</label>
                            <div className={styles.previewBox} style={{padding: '0.5rem'}}>
                                {trendingForm.image_url && <img src={getImageUrl(trendingForm.image_url)} alt="Preview" className={styles.previewImg} style={{maxHeight: '100px'}} />}
                                <div className={styles.uploadActions}>
                                    <Button type="button" variant="secondary" size="small" onClick={() => document.getElementById('trendingImgUpload').click()} disabled={isLoading}>
                                        <Upload size={14} /> {isLoading ? 'Uploading...' : 'Upload'}
                                    </Button>
                                    <input id="trendingImgUpload" type="file" hidden onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const url = await uploadImage(file);
                                            if (url) setTrendingForm({ ...trendingForm, image_url: url });
                                        }
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>
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
                    <div className={styles.fullWidth}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Background Image</label>
                            <div className={styles.previewBox} style={{padding: '0.5rem'}}>
                                {priceForm.image_url && <img src={getImageUrl(priceForm.image_url)} alt="Preview" className={styles.previewImg} style={{maxHeight: '100px'}} />}
                                <div className={styles.uploadActions}>
                                    <Button type="button" variant="secondary" size="small" onClick={() => document.getElementById('priceImgUpload').click()} disabled={isLoading}>
                                        <Upload size={14} /> {isLoading ? 'Uploading...' : 'Upload'}
                                    </Button>
                                    <input id="priceImgUpload" type="file" hidden onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const url = await uploadImage(file);
                                            if (url) setPriceForm({ ...priceForm, image_url: url });
                                        }
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <InputBox label="Min Price (₹)" type="number" value={priceForm.min_price} onChange={(e) => setPriceForm({...priceForm, min_price: e.target.value})} />
                    <InputBox label="Max Price (₹)" type="number" value={priceForm.max_price} onChange={(e) => setPriceForm({...priceForm, max_price: e.target.value})} />
                    <InputBox label="Display Order" type="number" value={priceForm.display_order} onChange={(e) => setPriceForm({...priceForm, display_order: e.target.value})} />
                </div>
            </Modal>

            {/* Category Image Modal */}
            <Modal
                isOpen={showCatImageModal}
                onClose={() => setShowCatImageModal(false)}
                title="Update Category Image"
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowCatImageModal(false)}>Cancel</Button>
                    </div>
                }
            >
                <div className={styles.previewBox}>
                    {selectedCategory && (
                        <>
                            <p style={{fontSize: '0.9rem', marginBottom: '1rem'}}>Updating image for: <strong>{selectedCategory.name}</strong></p>
                            <img 
                                src={getImageUrl(selectedCategory.image_url)} 
                                alt="Current" 
                                className={styles.previewImg} 
                            />
                            <div className={styles.uploadActions}>
                                <label className={styles.uploadBtn}>
                                    <input type="file" onChange={handleCategoryImageUpload} hidden accept="image/*" />
                                    <Upload size={16} /> Choose New Image
                                </label>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
            {/* Product Image Update Modal */}
            <Modal
                isOpen={showProductImageModal}
                onClose={() => setShowProductImageModal(false)}
                title="Update Product Homepage Image"
            >
                <div className={styles.formGroup}>
                    <label className={styles.label}>Image URL</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <InputBox 
                            value={tempImageUrl}
                            onChange={(e) => setTempImageUrl(e.target.value)}
                            placeholder="Enter image URL"
                        />
                        <Button 
                            variant="secondary" 
                            size="small"
                            onClick={() => document.getElementById('productHomeImgUpload').click()}
                            disabled={isLoading}
                        >
                            <Upload size={16} />
                        </Button>
                        <input 
                            id="productHomeImgUpload"
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const url = await uploadImage(file);
                                    if (url) setTempImageUrl(url);
                                }
                            }}
                            style={{display: 'none'}}
                        />
                    </div>
                    {tempImageUrl && (
                        <div style={{marginTop: '1rem', textAlign: 'center'}}>
                            <img src={getImageUrl(tempImageUrl)} alt="Preview" style={{maxHeight: '150px', borderRadius: '8px'}} />
                        </div>
                    )}
                </div>
                <div className={styles.modalFooter} style={{marginTop: '2rem'}}>
                    <Button variant="outline" onClick={() => setShowProductImageModal(false)}>Cancel</Button>
                    <Button onClick={async () => {
                        const success = await updateProductHomeImage(selectedProduct.product_id, tempImageUrl);
                        if (success) setShowProductImageModal(false);
                    }} disabled={isLoading}>Save Changes</Button>
                </div>
            </Modal>
        </div>
    );
};

export default HomepageManagement;
