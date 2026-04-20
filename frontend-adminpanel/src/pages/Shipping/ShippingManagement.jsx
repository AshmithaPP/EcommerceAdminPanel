import React, { useState, useEffect, useCallback } from 'react';
import styles from './ShippingManagement.module.css';
import shippingService from '../../services/shippingService';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import { toast } from 'react-hot-toast';

const STATUS_TABS = [
  { id: 'PACKED', label: 'Packed' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'OFD', label: 'Out for Delivery' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'RTO', label: 'RTO' }
];

const statusMap = STATUS_TABS.reduce((acc, tab) => {
  acc[tab.id] = tab.label;
  return acc;
}, {});

const ShippingManagement = () => {
  const [activeTab, setActiveTab] = useState('PACKED');
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Basic Pagination State
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });

  // Update Status Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [updateStatusData, setUpdateStatusData] = useState({ status: '', location: '', comment: '' });

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const status = statusMap[activeTab];
      const response = await shippingService.getShipments({ 
        status, 
        page: pagination.page, 
        limit: pagination.limit 
      });
      setShipments(response.data || []);
      setPagination(prev => ({ ...prev, total: response.pagination?.total_items || response.data?.length || 0 }));
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
      toast.error('Failed to load shipments.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

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
      toast.success('Shipment status updated successfully');
      fetchShipments(); // Refresh list
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update status: ' + (error.response?.data?.message || error.message));
    }
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

  const columns = [
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
            onClick={() => {
              setActiveTab(tab.id);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            {tab.id === 'OFD' ? 'OUT FOR DELIVERY' : tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className={styles.tableContainer}>
        <DataTable
          title="Logistics & Shipping"
          columns={columns}
          data={shipments}
          actions={headerActions}
          emptyMessage={loading ? "Loading shipments..." : "No shipments found in this category."}
        />
        {!loading && pagination.total > pagination.limit && (
           <Pagination
             totalItems={pagination.total}
             itemsPerPage={pagination.limit}
             currentPage={pagination.page}
             onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
           />
        )}
      </div>

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
              <button className={styles.saveBtn} onClick={handleUpdateStatus}>Save Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingManagement;
