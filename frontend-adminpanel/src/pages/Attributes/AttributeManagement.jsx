import React, { useState, useEffect } from 'react';
import { privateApi } from '../../services/api';
import { Edit2, Trash2, Plus, Settings, List, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './AttributeManagement.module.css';

import Button from '../../components/ui/Button';
import Modal from '../../components/common/Modal';
import InputBox from '../../components/ui/InputBox';

const AttributeManagement = () => {
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal state
    const [showAttrModal, setShowAttrModal] = useState(false);
    const [editingAttr, setEditingAttr] = useState(null);
    const [attrName, setAttrName] = useState('');

    const [selectedAttr, setSelectedAttr] = useState(null);
    const [attrValues, setAttrValues] = useState([]);
    const [showValueModal, setShowValueModal] = useState(false);
    const [editingValue, setEditingValue] = useState(null);
    const [valueName, setValueName] = useState('');

    useEffect(() => {
        fetchAttributes();
    }, []);

    const fetchAttributes = async () => {
        setLoading(true);
        try {
            const { data } = await privateApi.get('/attributes/attribute-list?page=1&limit=100');
            if (data.success) setAttributes(data.data.items);
        } catch (err) {
            toast.error('Failed to load attributes');
        } finally {
            setLoading(false);
        }
    };

    const fetchValues = async (attrId) => {
        try {
            const { data } = await privateApi.get(`/attributes/attribute-values-get/${attrId}`);
            if (data.success) setAttrValues(data.data.items);
        } catch (err) {
            toast.error('Failed to load values');
        }
    };

    const handleSaveAttribute = async () => {
        if (!attrName.trim()) return;
        try {
            if (editingAttr) {
                await privateApi.put(`/attributes/attribute-update/${editingAttr.attribute_id}`, { name: attrName });
                toast.success('Attribute updated');
            } else {
                await privateApi.post('/attributes/attribute-create', { name: attrName });
                toast.success('Attribute created');
            }
            setShowAttrModal(false);
            fetchAttributes();
        } catch (err) {
            toast.error('Operation failed');
        }
    };

    const handleDeleteAttribute = async (id) => {
        if (!window.confirm('Delete this attribute and all its values?')) return;
        try {
            await privateApi.delete(`/attributes/attribute-delete/${id}`);
            toast.success('Deleted');
            fetchAttributes();
            if (selectedAttr?.attribute_id === id) setSelectedAttr(null);
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleSaveValue = async () => {
        if (!valueName.trim() || !selectedAttr) return;
        try {
            if (editingValue) {
                await privateApi.put(`/attributes/attribute-value-update/${editingValue.attribute_value_id}`, { value: valueName });
                toast.success('Value updated');
            } else {
                await privateApi.post(`/attributes/attribute-values-add/${selectedAttr.attribute_id}`, { values: [valueName] });
                toast.success('Value added');
            }
            setShowValueModal(false);
            fetchValues(selectedAttr.attribute_id);
        } catch (err) {
            toast.error('Operation failed');
        }
    };

    const handleDeleteValue = async (id) => {
        if (!window.confirm('Delete this value?')) return;
        try {
            await privateApi.delete(`/attributes/attribute-value-delete/${id}`);
            toast.success('Deleted');
            fetchValues(selectedAttr.attribute_id);
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Filter Management</h2>
                    <p className={styles.subtitle}>Create and manage dynamic product filters (Color, Pattern, Fabric, etc.)</p>
                </div>
                <Button onClick={() => { setEditingAttr(null); setAttrName(''); setShowAttrModal(true); }}>
                    <Plus size={18} /> New Attribute
                </Button>
            </div>

            <div className={styles.layout}>
                {/* Attributes List */}
                <div className={styles.sideCard}>
                    <h3 className={styles.cardTitle}>Attributes</h3>
                    <div className={styles.list}>
                        {attributes.map(attr => (
                            <div 
                                key={attr.attribute_id} 
                                className={`${styles.listItem} ${selectedAttr?.attribute_id === attr.attribute_id ? styles.activeItem : ''}`}
                                onClick={() => { setSelectedAttr(attr); fetchValues(attr.attribute_id); }}
                            >
                                <span className={styles.itemName}>{attr.name}</span>
                                <div className={styles.itemActions}>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingAttr(attr); setAttrName(attr.name); setShowAttrModal(true); }}>
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAttribute(attr.attribute_id); }} className={styles.delete}>
                                        <Trash2 size={14} />
                                    </button>
                                    <ChevronRight size={16} className={styles.chevron} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Values List */}
                <div className={styles.mainCard}>
                    {selectedAttr ? (
                        <>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Values for "{selectedAttr.name}"</h3>
                                <Button size="small" onClick={() => { setEditingValue(null); setValueName(''); setShowValueModal(true); }}>
                                    <Plus size={16} /> Add Value
                                </Button>
                            </div>
                            <div className={styles.valuesGrid}>
                                {attrValues.length > 0 ? attrValues.map(v => (
                                    <div key={v.attribute_value_id} className={styles.valueChip}>
                                        <span>{v.value}</span>
                                        <div className={styles.chipActions}>
                                            <button onClick={() => { setEditingValue(v); setValueName(v.value); setShowValueModal(true); }}><Edit2 size={12} /></button>
                                            <button onClick={() => handleDeleteValue(v.attribute_value_id)} className={styles.delete}><X size={12} /></button>
                                        </div>
                                    </div>
                                )) : (
                                    <p className={styles.empty}>No values defined yet.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className={styles.placeholder}>
                            <Settings size={48} />
                            <p>Select an attribute to manage its values</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Attribute Modal */}
            <Modal isOpen={showAttrModal} onClose={() => setShowAttrModal(false)} title={editingAttr ? 'Edit Attribute' : 'New Attribute'}>
                <div className={styles.modalContent}>
                    <InputBox label="Attribute Name" value={attrName} onChange={(e) => setAttrName(e.target.value)} placeholder="e.g. Color, Pattern, Fabric" required />
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowAttrModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveAttribute}>Save</Button>
                    </div>
                </div>
            </Modal>

            {/* Value Modal */}
            <Modal isOpen={showValueModal} onClose={() => setShowValueModal(false)} title={editingValue ? 'Edit Value' : 'New Value'}>
                <div className={styles.modalContent}>
                    <InputBox label="Value" value={valueName} onChange={(e) => setValueName(e.target.value)} placeholder="e.g. Pink, Floral, Silk" required />
                    <div className={styles.modalFooter}>
                        <Button variant="ghost" onClick={() => setShowValueModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveValue}>Save</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AttributeManagement;
import { X } from 'lucide-react';
