import React, { useState, useEffect } from 'react';
import styles from './ShippingManagement.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import useShippingStore, { STATUS_TABS } from '../../store/shippingStore';

const ShippingManagement = () => {
  const {
    shipments,
    loading,
    activeTab,
    page,
    limit,
    total,
    selectedShipment,
    actionLoading,
    setActiveTab,
    setPage,
    setSelectedShipment,
    fetchShipments,
    updateShipmentStatus,
    resetShippingState
  } = useShippingStore();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updateStatusData, setUpdateStatusData] = useState({ 
    status: '', 
    location: '', 
    comment: '',
    courier_name: '',
    tracking_id: ''
  });

  // Zone Form State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({
    zone_name: '',
    states: [],
    shipping_charge: '',
    free_shipping_above: '',
    estimated_days: '3-5 Days',
    status: true
  });

  const {
    zones,
    loadingZones,
    fetchZones,
    addZone,
    updateZone,
    deleteZone
  } = useShippingStore();

  const allIndianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
  ];

  // Trigger fetch when tab or pagination changes
  useEffect(() => {
    if (activeTab === 'ZONES') {
      fetchZones();
    } else {
      fetchShipments();
    }
  }, [activeTab, page, fetchShipments, fetchZones]);

  // Cleanup on unmount
  useEffect(() => {
    return () => resetShippingState();
  }, [resetShippingState]);

  const handleOpenZoneModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({
        zone_name: zone.zone_name,
        states: zone.states || [],
        shipping_charge: zone.shipping_charge,
        free_shipping_above: zone.free_shipping_above || '',
        estimated_days: zone.estimated_days || '3-5 Days',
        status: zone.status
      });
    } else {
      setEditingZone(null);
      setZoneForm({
        zone_name: '',
        states: [],
        shipping_charge: '',
        free_shipping_above: '',
        estimated_days: '3-5 Days',
        status: true
      });
    }
    setIsZoneModalOpen(true);
  };

  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    let success;
    if (editingZone) {
      success = await updateZone(editingZone.zone_id, zoneForm);
    } else {
      success = await addZone(zoneForm);
    }
    if (success) setIsZoneModalOpen(false);
  };

  const toggleState = (state) => {
    const currentStates = zoneForm.states || [];
    const newStates = currentStates.includes(state)
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state];
    setZoneForm({ ...zoneForm, states: newStates });
  };

  const handleOpenStatusModal = (shipment) => {
    setSelectedShipment(shipment);
    setUpdateStatusData({ 
      status: shipment.status, 
      location: '', 
      comment: '',
      courier_name: shipment.courier_name || '',
      tracking_id: shipment.tracking_id || ''
    });
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedShipment) return;
    const success = await updateShipmentStatus(selectedShipment.shipment_id, updateStatusData);
    if (success) setIsStatusModalOpen(false);
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return 'primary';
    const s = status.toLowerCase();
    if (s.includes('packed')) return 'warning';
    if (s.includes('shipped') || s.includes('delivery')) return 'info';
    if (s.includes('delivered')) return 'success';
    if (s.includes('rto') || s.includes('cancel')) return 'danger';
    return 'primary';
  };

  const zoneColumns = [
    {
      label: 'Zone Name',
      key: 'zone_name',
      width: '20%',
      render: (row) => <span className={styles.zoneName}>{row.zone_name}</span>
    },
    {
      label: 'States',
      key: 'states',
      width: '35%',
      render: (row) => (
        <div className={styles.statesList}>
          {(row.states || []).map(s => <span key={s} className={styles.stateTagSmall}>{s}</span>)}
        </div>
      )
    },
    {
      label: 'Estimation',
      key: 'estimated_days',
      width: '15%',
      render: (row) => <span className={styles.textMuted}>{row.estimated_days || '3-5 Days'}</span>
    },
    {
      label: 'Charge',
      key: 'shipping_charge',
      width: '15%',
      render: (row) => <span className={styles.chargeValue}>₹{row.shipping_charge}</span>
    },
    {
      label: 'Free Above',
      key: 'free_shipping_above',
      width: '15%',
      render: (row) => (
        <span className={styles.freeLimit}>
          {row.free_shipping_above ? `₹${row.free_shipping_above}` : 'No Limit'}
        </span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      width: '15%',
      align: 'right',
      render: (row) => (
        <div className={styles.actionRow}>
          <button className={styles.iconBtn} onClick={() => handleOpenZoneModal(row)}>Edit</button>
          <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => deleteZone(row.zone_id)}>Delete</button>
        </div>
      )
    }
  ];

  const columns = activeTab === 'ZONES' ? zoneColumns : [
    {
      label: 'Order Info',
      key: 'order',
      width: '20%',
      render: (row) => (
        <div className={styles.productCell}>
          <div className={styles.productName}>{row.order_number}</div>
          <div className={styles.productSku}>{row.courier_name || 'Courier N/A'}</div>
        </div>
      )
    },
    {
      label: 'Tracking ID',
      key: 'tracking',
      width: '20%',
      render: (row) => (
        <code className={styles.trackingCode}>{row.tracking_number || 'N/A'}</code>
      )
    },
    {
      label: 'Status',
      key: 'status',
      width: '15%',
      align: 'center',
      render: (row) => {
        const badgeCls = getStatusBadgeClass(row.status);
        return (
          <span className={`${styles.badge} ${styles[`badge_${badgeCls}`]}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      label: 'Shipped',
      key: 'shipped',
      width: '15%',
      render: (row) => (
        <span className={styles.dateText}>
          {row.shipped_at ? new Date(row.shipped_at).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      label: 'Delivered',
      key: 'delivered',
      width: '15%',
      render: (row) => (
        <span className={styles.dateText}>
          {row.delivered_at ? new Date(row.delivered_at).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      width: '15%',
      align: 'right',
      render: (row) => (
        <button 
          className={styles.updateBtn}
          onClick={() => handleOpenStatusModal(row)}
        >
          UPDATE
        </button>
      )
    }
  ];

  const headerActions = (
    <div className={styles.headerControls}>
      <div className={styles.filterGroup}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.filterBtn} ${activeTab === tab.id ? styles.activeFilter : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.id === 'OFD' ? 'OUT FOR DELIVERY' : tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'ZONES' && (
        <button className={styles.addZoneBtn} onClick={() => handleOpenZoneModal()}>
          + Add New Zone
        </button>
      )}
    </div>
  );

  return (
    <div className="page-container">
      {(loading || loadingZones) && <div className={styles.loadingBar} />}
      <div className={styles.tableContainer}>
        <DataTable
          title={activeTab === 'ZONES' ? "Shipping Zones & Rates" : "Logistics & Shipping"}
          columns={columns}
          data={activeTab === 'ZONES' ? zones : shipments}
          actions={headerActions}
          emptyMessage={(loading || loadingZones) ? "Loading..." : "Nothing found here."}
        />
        {activeTab !== 'ZONES' && !loading && total > limit && (
           <Pagination
             totalItems={total}
             itemsPerPage={limit}
             currentPage={page}
             onPageChange={setPage}
           />
        )}
      </div>

      {/* Zone Modal */}
      {isZoneModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsZoneModalOpen(false)}>
          <div className={`${styles.modalCard} ${styles.zoneModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingZone ? 'Edit Shipping Zone' : 'Add New Shipping Zone'}</h3>
              <p className={styles.modalSubtitle}>Define states and their corresponding shipping charges</p>
            </div>
            
            <form onSubmit={handleZoneSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Zone Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. South India Local"
                  className={styles.formInput}
                  value={zoneForm.zone_name}
                  onChange={e => setZoneForm({...zoneForm, zone_name: e.target.value})}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select States</label>
                <div className={styles.statesSelector}>
                  {allIndianStates.map(state => (
                    <button
                      key={state}
                      type="button"
                      className={`${styles.stateTag} ${(zoneForm.states || []).includes(state) ? styles.stateTagActive : ''}`}
                      onClick={() => toggleState(state)}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Shipping Charge (₹)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="50"
                    className={styles.formInput}
                    value={zoneForm.shipping_charge}
                    onChange={e => setZoneForm({...zoneForm, shipping_charge: e.target.value})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Free Shipping Above (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 2000"
                    className={styles.formInput}
                    value={zoneForm.free_shipping_above}
                    onChange={e => setZoneForm({...zoneForm, free_shipping_above: e.target.value})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Estimated Delivery</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 3-5 Days"
                    className={styles.formInput}
                    value={zoneForm.estimated_days}
                    onChange={e => setZoneForm({...zoneForm, estimated_days: e.target.value})}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsZoneModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsStatusModalOpen(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Update Shipment Status</h3>
              <span className={styles.modalSubtitle}>Order: {selectedShipment?.order_number}</span>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Status</label>
                <select 
                  value={updateStatusData.status} 
                  onChange={(e) => setUpdateStatusData({...updateStatusData, status: e.target.value})}
                  className={styles.formInput}
                >
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="RTO">RTO</option>
                </select>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Courier Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Delhivery"
                    value={updateStatusData.courier_name}
                    onChange={(e) => setUpdateStatusData({...updateStatusData, courier_name: e.target.value})}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tracking ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TRK123456"
                    value={updateStatusData.tracking_id}
                    onChange={(e) => setUpdateStatusData({...updateStatusData, tracking_id: e.target.value})}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Location (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mumbai Hub"
                  value={updateStatusData.location}
                  onChange={(e) => setUpdateStatusData({...updateStatusData, location: e.target.value})}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Add Comment (Optional)</label>
                <textarea 
                  placeholder="Manual update notes..."
                  value={updateStatusData.comment}
                  onChange={(e) => setUpdateStatusData({...updateStatusData, comment: e.target.value})}
                  className={styles.formTextarea}
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setIsStatusModalOpen(false)}>Cancel</button>
              <button 
                className={styles.saveBtn} 
                onClick={handleUpdateStatus}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingManagement;
