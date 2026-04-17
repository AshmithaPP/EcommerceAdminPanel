import React, { useState, useEffect, useCallback } from 'react';
import styles from './ShippingManagement.module.css';
import shippingService from '../../services/shippingService';

const availableRegions = [
  'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat', 
  'West Bengal', 'Uttar Pradesh', 'Rajasthan', 'Kerala', 'Punjab',
  'Haryana', 'Telangana', 'Andhra Pradesh', 'Madhya Pradesh', 'Bihar'
];

const statusMap = {
  'PACKED': 'Packed',
  'SHIPPED': 'Shipped',
  'OFD': 'Out for Delivery',
  'DELIVERED': 'Delivered',
  'RTO': 'RTO'
};

const ShippingManagement = () => {
  const [activeTab, setActiveTab] = useState('PACKED');
  const [zones, setZones] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  
  // Modal & Edit states
  const [editingIndex, setEditingIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [updateStatusData, setUpdateStatusData] = useState({ status: '', location: '', comment: '' });

  const fetchZones = async () => {
    try {
      const response = await shippingService.getAllZones();
      setZones(response.data);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    }
  };

  const fetchShipments = useCallback(async () => {
    setShipmentsLoading(true);
    try {
      const status = statusMap[activeTab];
      const response = await shippingService.getShipments({ status });
      setShipments(response.data);
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setShipmentsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchZones(), fetchShipments()]);
      setLoading(false);
    };
    init();
  }, [fetchShipments]);

  // Handle Shipment Status Update
  const handleOpenStatusModal = (shipment) => {
    setSelectedShipment(shipment);
    setUpdateStatusData({ 
      status: shipment.status, 
      location: '', 
      comment: '' 
    });
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedShipment) return;
    try {
      await shippingService.updateShipmentStatus(selectedShipment.shipment_id, updateStatusData);
      setIsStatusModalOpen(false);
      fetchShipments(); // Refresh list
    } catch (error) {
      alert('Failed to update status: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle Zone CRUD
  const handleDeleteZone = async (id) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      try {
        await shippingService.deleteZone(id);
        fetchZones();
      } catch (error) {
        alert('Failed to delete zone');
      }
    }
  };

  const handleToggleEdit = (index) => {
    setEditingIndex(editingIndex === index ? null : index);
  };

  const handleAddZone = () => {
    const newZone = {
      zone_name: 'New Delivery Zone',
      zone_type: 'state',
      zone_values: [],
      base_charge: 0,
      free_threshold: 0,
      is_active: true
    };
    setZones([...zones, newZone]);
    setEditingIndex(zones.length);
  };

  const saveZoneChanges = async (index) => {
    const zone = zones[index];
    try {
      if (zone.zone_id) {
        // Update existing
        await shippingService.updateZone(zone.zone_id, zone);
      } else {
        // Create new
        await shippingService.createZone(zone);
        fetchZones();
      }
      setEditingIndex(null);
    } catch (error) {
      alert('Failed to save changes');
    }
  };

  const openRegionModal = (index) => {
    setSelectedRegions(zones[index].zone_values);
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const toggleRegion = (region) => {
    setSelectedRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const saveRegions = () => {
    const newZones = [...zones];
    newZones[editingIndex].zone_values = selectedRegions;
    setZones(newZones);
    setIsModalOpen(false);
  };

  if (loading) return <div className={styles.loading}>Loading Shipping Module...</div>;

  return (
    <div className={styles.container}>
      {/* Shipments Overview Section */}
      <section className={styles.section}>
        <div className={styles.header}>
          <div className={styles.tabsWrapper}>
            <div className={styles.tabs}>
              {['PACKED', 'SHIPPED', 'OFD', 'DELIVERED', 'RTO'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'OFD' ? 'OUT FOR DELIVERY' : tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <div className={styles.tableContainer}>
            {shipmentsLoading ? (
              <div className={styles.tablePlaceholder}>Fetching shipments...</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ORDER ID</th>
                    <th>TRACKING ID</th>
                    <th>COURIER</th>
                    <th>STATUS</th>
                    <th>SHIPPED DATE</th>
                    <th>DELIVERED DATE</th>
                    <th className={styles.textRight}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.length > 0 ? (
                    shipments.map((shipment) => (
                      <tr key={shipment.shipment_id} className={styles.tableRow}>
                        <td className={styles.orderId}>{shipment.order_number}</td>
                        <td className={styles.trackingId}>{shipment.tracking_number}</td>
                        <td>{shipment.courier_name}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[shipment.status.toLowerCase().replace(/ /g, '')]}`}>
                            {shipment.status}
                          </span>
                        </td>
                        <td>{shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleDateString() : '-'}</td>
                        <td>{shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleDateString() : '-'}</td>
                        <td className={styles.textRight}>
                          <button 
                            className={styles.updateBtn}
                            onClick={() => handleOpenStatusModal(shipment)}
                          >
                            UPDATE
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className={styles.emptyState}>No shipments in this category.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* Delivery Zones & Pricing Section */}
      <section className={styles.section}>
        <div className={styles.headerStack}>
          <div>
            <h1 className={styles.title}>Delivery Zones & Pricing</h1>
            <p className={styles.subtitle}>Configure shipping rates based on geographical regions.</p>
          </div>
          <button className={styles.addZoneBtn} onClick={handleAddZone}>
            <span className="material-symbols-outlined">add</span>
            ADD ZONE
          </button>
        </div>

        <div className={styles.zonesGrid}>
          {zones.map((zone, index) => (
            <div key={zone.zone_id} className={styles.zoneCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.zoneTitle}>{zone.zone_name}</h3>
                <div className={styles.cardActions}>
                  {editingIndex === index ? (
                    <button className={styles.saveBtn} onClick={() => saveZoneChanges(index)}>
                      SAVE
                    </button>
                  ) : (
                    <button className={styles.iconBtn} onClick={() => handleToggleEdit(index)}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  )}
                  <button className={`${styles.iconBtn} ${styles.deleteIcon}`} onClick={() => handleDeleteZone(zone.zone_id)}>
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <div className={styles.regions} onClick={() => openRegionModal(index)}>
                {zone.zone_values.slice(0, 3).map((region) => (
                  <span key={region} className={styles.regionTag}>{region}</span>
                ))}
                {zone.zone_values.length > 3 && (
                  <span className={styles.regionTag}>+{zone.zone_values.length - 3} MORE</span>
                )}
                <span className={styles.addRegionHint}>
                  <span className="material-symbols-outlined">add_circle</span>
                </span>
              </div>

              <div className={styles.pricingInfo}>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>SHIPPING CHARGE</span>
                  {editingIndex === index ? (
                    <div className={styles.inlineEditWrapper}>
                      <span className={styles.currencyPrefix}>₹</span>
                      <input 
                        className={styles.inlineInput} 
                        type="number"
                        value={zone.base_charge} 
                        onChange={(e) => {
                          const newZones = [...zones];
                          newZones[index].base_charge = e.target.value;
                          setZones(newZones);
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span className={styles.priceValue}>₹{zone.base_charge}</span>
                  )}
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>FREE ABOVE</span>
                  {editingIndex === index ? (
                    <div className={styles.inlineEditWrapper}>
                      <span className={styles.currencyPrefix}>₹</span>
                      <input 
                        className={styles.inlineInput} 
                        type="number"
                        value={zone.free_threshold || ''} 
                        onChange={(e) => {
                          const newZones = [...zones];
                          newZones[index].free_threshold = e.target.value;
                          setZones(newZones);
                        }}
                      />
                    </div>
                  ) : (
                    <span className={styles.priceValue}>₹{zone.free_threshold || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <div className={`${styles.zoneCard} ${styles.dotted}`} onClick={handleAddZone}>
            <div className={styles.defineNew}>
              <span className="material-symbols-outlined">map</span>
              <h3 className={styles.defineTitle}>DEFINE NEW ZONE</h3>
              <p className={styles.defineSubtitle}>Add region specific rates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Regions Selection Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Select Regions</h3>
              <button className={styles.closeModal} onClick={() => setIsModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.regionGrid}>
                {availableRegions.map(region => (
                  <button 
                    key={region}
                    className={`${styles.regionOption} ${selectedRegions.includes(region) ? styles.selectedRegion : ''}`}
                    onClick={() => toggleRegion(region)}
                  >
                    {region}
                    {selectedRegions.includes(region) && <span className="material-symbols-outlined">check</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelModalBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className={styles.saveModalBtn} onClick={saveRegions}>Update Regions</button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Update Shipment Status</h3>
              <button className={styles.closeModal} onClick={() => setIsStatusModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Status</label>
                <select 
                  value={updateStatusData.status} 
                  onChange={(e) => setUpdateStatusData({...updateStatusData, status: e.target.value})}
                  className={styles.select}
                >
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="RTO">RTO</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Current Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mumbai Hub"
                  value={updateStatusData.location}
                  onChange={(e) => setUpdateStatusData({...updateStatusData, location: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Add Comment</label>
                <textarea 
                  placeholder="Manual update notes..."
                  value={updateStatusData.comment}
                  onChange={(e) => setUpdateStatusData({...updateStatusData, comment: e.target.value})}
                  className={styles.textarea}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelModalBtn} onClick={() => setIsStatusModalOpen(false)}>Cancel</button>
              <button className={styles.saveModalBtn} onClick={handleUpdateStatus}>Save Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingManagement;
