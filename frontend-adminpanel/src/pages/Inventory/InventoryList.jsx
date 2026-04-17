import { useState, useEffect, useCallback } from 'react';
import styles from './InventoryList.module.css';
import SearchFilter from '../../components/ui/SearchFilter';
import inventoryService from '../../services/inventoryService';

const InventoryList = () => {
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('Manual Correction');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [invData, logData] = await Promise.all([
        inventoryService.getFullInventory(1, 100),
        inventoryService.getInventoryLogs(1, 20)
      ]);
      setInventory(invData.data);
      setLogs(logData.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = (item) => {
    setEditingItem(item);
    setNewStock(item.quantity);
    setReason('Manual Stock Correction');
  };

  const handleSave = async () => {
    if (!editingItem) return;
    
    try {
      const quantityDelta = parseInt(newStock) - editingItem.quantity;
      
      if (quantityDelta === 0) {
        setEditingItem(null);
        return;
      }

      await inventoryService.manualStockAdjustment(editingItem.variant_id, {
        quantityDelta,
        reason
      });
      
      // Refresh data
      fetchData();
      setEditingItem(null);
    } catch (err) {
      console.error('Error updating stock:', err);
      alert('Failed to update stock. Please try again.');
    }
  };

  if (loading && inventory.length === 0) {
    return <div className={styles.inventoryContainer}><div className={styles.loading}>Loading inventory...</div></div>;
  }

  if (error) {
    return <div className={styles.inventoryContainer}><div className={styles.error}>{error}</div></div>;
  }

  return (
    <div className={styles.inventoryContainer}>
      {/* Filters & Search */}
      <SearchFilter 
        placeholder="Search by product name..."
      >
        <div className={styles.filterWrapper}>
          <span className={styles.filterLabel}>Filter By Status</span>
          <div className={styles.filterButtonsGroup}>
            <button className={styles.filterButton}>
              <span className={`material-symbols-outlined ${styles.lowStockIcon}`}>emergency_home</span>
              Low Stock
            </button>
            <button className={styles.filterButton}>
              <span className={`material-symbols-outlined ${styles.outOfStockIcon}`}>cancel</span>
              Out of Stock
            </button>
          </div>
        </div>
      </SearchFilter>

      {/* Main Inventory Table */}
      <section className={styles.sectionCard}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.serif} ${styles.cardTitle}`}>Inventory Overview</h2>
          <span className={styles.skuCount}>Showing {inventory.length} Skus</span>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.customTable}>
            <thead>
              <tr className={styles.serif}>
                <th style={{ minWidth: '220px' }}>Product Name</th>
                <th style={{ minWidth: '180px' }}>Variant (SKU)</th>
                <th style={{ minWidth: '140px', textAlign: 'center' }}>Available Stock</th>
                <th style={{ minWidth: '140px' }}>Last Updated</th>
                <th style={{ minWidth: '80px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const isOut = item.quantity <= 0;
                const isLow = item.quantity <= item.low_stock_threshold;
                const status = isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock');

                return (
                  <tr key={item.variant_id}>
                    <td className={styles.productName}>{item.product_name}</td>
                    <td className={styles.variantInfo}>{item.sku}</td>
                    <td className="text-center">
                      <span className={`${styles.stockBadge} ${
                        status === 'In Stock' ? styles.inStock : 
                        status === 'Low Stock' ? styles.lowStock : 
                        styles.outOfStock
                      }`}>
                        {status} ({item.quantity >= 10 ? item.quantity : `0${item.quantity}`})
                      </span>
                    </td>
                    <td className={styles.variantInfo}>
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="text-right">
                      <button 
                        className={styles.editBtn}
                        onClick={() => handleEditClick(item)}
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Activity Logs */}
      <section className={styles.sectionCard}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.serif} ${styles.cardTitle}`}>Activity Logs</h2>
        </div>
        <div className={styles.tableWrapper}>
          <table className={`${styles.customTable} ${styles.logTable}`}>
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Product / SKU</th>
                <th style={{ minWidth: '150px' }}>Change Type</th>
                <th style={{ minWidth: '100px', textAlign: 'center' }}>Quantity</th>
                <th style={{ minWidth: '100px' }}>Stock Flow</th>
                <th style={{ minWidth: '100px' }}>Admin / System</th>
                <th style={{ minWidth: '140px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.log_id}>
                  <td className="fw-medium">
                    <div>{log.product_name}</div>
                    <div className={styles.readonlySubValue}>{log.sku}</div>
                  </td>
                  <td>{log.action.replace('_', ' ').toUpperCase()}</td>
                  <td className={`text-center ${log.quantity_delta >= 0 ? styles.qtyPos : styles.qtyNeg}`}>
                    {log.quantity_delta >= 0 ? `+${log.quantity_delta}` : log.quantity_delta}
                  </td>
                  <td className={styles.variantInfo}>{log.quantity_before} → {log.quantity_after}</td>
                  <td>{log.admin_name || 'System'}</td>
                  <td className={styles.timestamp}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Inventory Modal */}
      {editingItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={`${styles.serif} ${styles.modalTitle}`}>Update Inventory</h3>
              <button className={styles.closeBtn} onClick={() => setEditingItem(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Product</label>
                <div className={styles.readonlyValue}>{editingItem.product_name}</div>
                <div className={styles.readonlySubValue}>{editingItem.sku}</div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="stockInput">New Stock Count</label>
                <input 
                  id="stockInput"
                  type="number" 
                  className={styles.modalInput}
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="reasonInput">Reason for Adjustment</label>
                <input 
                  id="reasonInput"
                  type="text" 
                  className={styles.modalInput}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Stock count correction, Damaged items"
                />
              </div>

              <div className={styles.adjustmentNote}>
                <span className="material-symbols-outlined">info</span>
                This adjustment will be logged under your admin profile.
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setEditingItem(null)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave}>Update Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
