import { useState, useEffect, useCallback } from 'react';
import styles from './InventoryList.module.css';
import SearchFilter from '../../components/ui/SearchFilter';
import inventoryService from '../../services/inventoryService';

const InventoryList = () => {
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [actionType, setActionType] = useState(null); // 'ADD', 'SET', or 'HISTORY'
  const [inputValue, setInputValue] = useState('');
  const [reason, setReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const invData = await inventoryService.getFullInventory(1, 100);
      setInventory(invData.data);
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

  const fetchHistory = async (variantId) => {
    try {
      setHistoryLoading(true);
      const histData = await inventoryService.getStockHistory(variantId);
      setHistory(histData.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleActionClick = (item, type) => {
    setSelectedVariant(item);
    setActionType(type);
    setInputValue(type === 'SET' ? item.quantity : '');
    setReason(type === 'SET' ? 'Inventory correction' : 'New purchase');
    fetchHistory(item.variant_id);
  };

  const handleSave = async () => {
    if (!selectedVariant || !actionType) return;
    
    try {
      if (actionType === 'ADD') {
        await inventoryService.restock(selectedVariant.variant_id, {
          quantity: parseInt(inputValue),
          reason
        });
      } else {
        await inventoryService.setStock(selectedVariant.variant_id, {
          stock: parseInt(inputValue),
          reason
        });
      }
      
      fetchData();
      setSelectedVariant(null);
    } catch (err) {
      console.error('Error updating stock:', err);
      alert(err.response?.data?.message || 'Failed to update stock');
    }
  };

  const closeModals = () => {
    setSelectedVariant(null);
    setActionType(null);
    setHistory([]);
  };

  if (loading && inventory.length === 0) {
    return <div className={styles.inventoryContainer}><div className={styles.loading}>Loading inventory...</div></div>;
  }

  return (
    <div className={styles.inventoryContainer}>
      <SearchFilter placeholder="Search by product name..." />

      <section className={styles.sectionCard}>
        <div className={styles.cardHeader}>
          <h2 className={`${styles.serif} ${styles.cardTitle}`}>Stock Management</h2>
          <span className={styles.skuCount}>{inventory.length} Variants tracked</span>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.customTable}>
            <thead>
              <tr className={styles.serif}>
                <th>Product & SKU</th>
                <th style={{ textAlign: 'center' }}>Current Stock</th>
                <th>Last Updated</th>
                <th style={{ textAlign: 'center' }}>History</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const isOut = item.quantity <= 0;
                const isLow = item.quantity <= item.low_stock_threshold;
                const status = isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock');

                return (
                  <tr key={item.variant_id}>
                    <td>
                      <div className={styles.productName}>{item.product_name}</div>
                      <div className={styles.variantInfo}>{item.sku}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`${styles.stockBadge} ${
                        status === 'In Stock' ? styles.inStock : 
                        status === 'Low Stock' ? styles.lowStock : 
                        styles.outOfStock
                      }`}>
                        {item.quantity} {status === 'In Stock' ? '' : `(${status})`}
                      </span>
                    </td>
                    <td className={styles.variantInfo}>
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className={styles.infoBtn}
                        onClick={() => handleActionClick(item, 'HISTORY')}
                        title="View Full History"
                      >
                        <span className="material-symbols-outlined">info</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.actionGroup}>
                        <button 
                          className={styles.addBtn}
                          onClick={() => handleActionClick(item, 'ADD')}
                          title="Add Stock (Restock)"
                        >
                          <span className="material-symbols-outlined">add_circle</span>
                        </button>
                        <button 
                          className={styles.setBtn}
                          onClick={() => handleActionClick(item, 'SET')}
                          title="Set Absolute Stock"
                        >
                          <span className="material-symbols-outlined">edit_square</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Unified Action & History Modal */}
      {selectedVariant && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.wideModal}`}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={`${styles.serif} ${styles.modalTitle}`}>
                  {actionType === 'ADD' ? 'Add Inventory' : 
                   actionType === 'SET' ? 'Total Stock Correction' : 'Stock Audit History'}
                </h3>
                <p className={styles.modalSubtitle}>{selectedVariant.product_name} ({selectedVariant.sku})</p>
              </div>
              <button className={styles.closeBtn} onClick={closeModals}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className={actionType === 'HISTORY' ? styles.fullHistoryLayout : styles.modalGrid}>
              {/* Form Side - Only show if not just viewing history */}
              {actionType !== 'HISTORY' && (
                <div className={styles.modalForm}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      {actionType === 'ADD' ? 'Quantity to Add' : 'New Absolute Stock'}
                    </label>
                    <input 
                      type="number" 
                      className={styles.modalInput}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={actionType === 'ADD' ? "e.g. 50" : "e.g. 100"}
                      autoFocus
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Reason / Remark</label>
                    <input 
                      type="text" 
                      className={styles.modalInput}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reference number or note"
                    />
                  </div>

                  <button className={`${styles.saveBtn} ${styles.fullWidth}`} onClick={handleSave}>
                    {actionType === 'ADD' ? 'Confirm Addition' : 'Set Final Stock'}
                  </button>
                </div>
              )}

              {/* History Side */}
              <div className={actionType === 'HISTORY' ? styles.fullHistoryBody : styles.modalHistory}>
                <h4 className={styles.historyTitle}>
                  {actionType === 'HISTORY' ? 'Complete Transaction Log' : 'Recent Stock Changes'}
                </h4>
                {historyLoading ? (
                  <div className={styles.miniLoading}>Loading history...</div>
                ) : (
                  <div className={actionType === 'HISTORY' ? styles.scrollableHistory : styles.historyList}>
                    {history.length === 0 ? (
                      <div className={styles.noHistory}>No history records found.</div>
                    ) : (
                      history.map(item => (
                        <div key={item.id} className={styles.historyItem}>
                          <div className={styles.historyHeader}>
                            <span className={`${styles.historyAction} ${styles[item.action.toLowerCase()]}`}>
                              {item.action.replace('_', ' ')}
                            </span>
                            <span className={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className={styles.historyDetails}>
                            <span className={item.quantity >= 0 ? styles.pos : styles.neg}>
                              {item.quantity >= 0 ? `+${item.quantity}` : item.quantity}
                            </span>
                            <span className={styles.historyFlow}>{item.previous_stock} → {item.new_stock}</span>
                          </div>
                          {item.reason && <div className={styles.historyReason}>{item.reason}</div>}
                          {item.reference_id && <div className={styles.historyRef}>Ref: {item.reference_id}</div>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
