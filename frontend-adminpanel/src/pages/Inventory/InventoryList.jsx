import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit, History, X } from 'lucide-react';
import styles from './InventoryList.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import inventoryService from '../../services/inventoryService';
import { toast } from 'react-hot-toast';

// ── Components & Helpers ─────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const getStockStatus = (quantity, threshold) => {
  if (quantity <= 0) return { label: 'Out of Stock', cls: 'danger' };
  if (quantity <= threshold) return { label: 'Low Stock', cls: 'warning' };
  return { label: 'In Stock', cls: 'success' };
};

const getHistoryActionBadge = (action) => {
  const clsMap = {
    'order_created': 'order',
    'order_cancelled': 'danger',
    'admin_purchase': 'success',
    'admin_set': 'warning',
  };
  const cls = clsMap[action.toLowerCase()] || 'primary';
  const label = action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  return <span className={`${styles.actionBadge} ${styles[`badge_${cls}`]}`}>{label}</span>;
};

// ── Main Page ────────────────────────────────────────────────────────
const InventoryList = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination State
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Modal / Action State
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [actionType, setActionType] = useState(null); // 'ADD', 'SET', 'HISTORY'
  const [inputValue, setInputValue] = useState('');
  const [thresholdValue, setThresholdValue] = useState('');
  const [reason, setReason] = useState('');

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Backend does not natively filter by search/status in the API right now, 
      // but we pull limit and page. However, our search is client-side for now.
      const res = await inventoryService.getFullInventory(pagination.page, pagination.limit);
      setInventory(res.data || []);
      setPagination(prev => ({ ...prev, total: res.pagination?.total_items || res.data?.length || 0 }));
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory data');
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const fetchHistory = async (variantId) => {
    try {
      setHistoryLoading(true);
      const res = await inventoryService.getStockHistory(variantId);
      setHistory(res.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleActionClick = (item, type) => {
    setSelectedVariant(item);
    setActionType(type);

    if (type === 'HISTORY') {
      fetchHistory(item.variant_id);
    } else {
      setInputValue(type === 'SET' ? item.quantity : '');
      setThresholdValue(item.low_stock_threshold || 10);
      setReason(type === 'SET' ? 'Inventory correction' : 'New purchase');
    }
  };

  const closeModals = () => {
    setSelectedVariant(null);
    setActionType(null);
    setHistory([]);
    setInputValue('');
    setReason('');
  };

  const handleSave = async () => {
    if (!selectedVariant || !actionType) return;
    try {
      if (actionType === 'ADD') {
        await inventoryService.restock(selectedVariant.variant_id, {
          quantity: parseInt(inputValue),
          reason,
          threshold: parseInt(thresholdValue)
        });
        toast.success(`Successfully added ${inputValue} units`);
      } else {
        await inventoryService.setStock(selectedVariant.variant_id, {
          stock: parseInt(inputValue),
          reason,
          threshold: parseInt(thresholdValue)
        });
        toast.success(`Stock correctly set to ${inputValue}`);
      }

      fetchInventory();
      closeModals();
    } catch (err) {
      console.error('Error updating stock:', err);
      toast.error(err.response?.data?.message || 'Failed to update stock');
    }
  };

  // ── Client-side Filtering ──
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;

    const { label } = getStockStatus(item.quantity, item.low_stock_threshold);
    return label === activeFilter;
  });

  // ── DataTable Columns ───────────────────────────────────────────────
  const columns = [
    {
      label: 'Product & SKU',
      key: 'product',
      width: '30%',
      render: (row) => (
        <div className={styles.productCell}>
          <div className={styles.productName}>{row.product_name}</div>
          <div className={styles.productSku}>{row.sku}</div>
        </div>
      )
    },
    {
      label: 'Quantity',
      key: 'stock',
      width: '10%',
      align: 'center',
      render: (row) => (
        <span className={styles.stockQuantity}>{row.quantity}</span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      width: '15%',
      align: 'center',
      render: (row) => {
        const { label, cls } = getStockStatus(row.quantity, row.low_stock_threshold);
        return <span className={`${styles.badge} ${styles[`badge_${cls}`]}`}>{label}</span>;
      }
    },
    {
      label: 'Recent Sales',
      key: 'activity',
      width: '20%',
      render: (row) => (
        <div className={styles.activityCell}>
          {row.last_action ? (
            <>
              <div className={styles.activityAdjustment}>
                <span className={row.last_adjustment >= 0 ? styles.qtyPos : styles.qtyNeg}>
                  {row.last_adjustment > 0 ? '+' : ''}{row.last_adjustment}
                </span>
                <span className={styles.activityAction}> {row.last_action.replace('_', ' ')}</span>
              </div>
              <div className={styles.activityDate}>{formatDate(row.last_action_date)}</div>
            </>
          ) : (
            <span className={styles.mutedText}>No sales yet</span>
          )}
        </div>
      )
    },
    {
      label: 'Last Sync',
      key: 'updated',
      width: '15%',
      render: (row) => (
        <span className={styles.dateText}>{formatDate(row.updated_at)}</span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      width: '15%',
      align: 'right',
      render: (row) => (
        <div className={styles.actionCell}>
          <button 
            className={styles.iconBtn} 
            onClick={() => handleActionClick(row, 'HISTORY')}
            title="View History"
          >
            <History size={15} />
          </button>
          <button 
            className={`${styles.iconBtn} ${styles.iconBtnSuccess}`} 
            onClick={() => handleActionClick(row, 'ADD')}
            title="Add Stock"
          >
            <PlusCircle size={15} />
          </button>
          <button 
            className={`${styles.iconBtn} ${styles.iconBtnWarning}`} 
            onClick={() => handleActionClick(row, 'SET')}
            title="Set Absolute Stock"
          >
            <Edit size={15} />
          </button>
        </div>
      )
    }
  ];

  const historyColumns = [
    {
      label: 'Action & Date',
      key: 'action',
      width: '35%',
      render: (row) => (
        <div className={styles.historyActionCell}>
          {getHistoryActionBadge(row.action)}
          <span className={styles.historyDate}>{formatDate(row.created_at)}</span>
        </div>
      )
    },
    {
      label: 'Adjustment',
      key: 'qty',
      width: '20%',
      render: (row) => (
        <span className={`${styles.historyQty} ${row.quantity >= 0 ? styles.qtyPos : styles.qtyNeg}`}>
          {row.quantity > 0 ? '+' : ''}{row.quantity}
        </span>
      )
    },
    {
      label: 'Flow',
      key: 'flow',
      width: '15%',
      render: (row) => (
        <span className={styles.historyFlow}>{row.previous_stock} → {row.new_stock}</span>
      )
    },
    {
      label: 'Reason / Ref',
      key: 'reason',
      width: '30%',
      render: (row) => (
        <div className={styles.historyReasonCell}>
          {row.reason && <div className={styles.reasonText}>{row.reason}</div>}
          {row.reference_id && <div className={styles.refText}>Ref: {row.reference_id}</div>}
        </div>
      )
    }
  ];

  const filtersOptions = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

  const headerActions = (
    <div className={styles.headerControls}>
      <div className={styles.filterGroup}>
        {filtersOptions.map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${activeFilter === f ? styles.activeFilter : ''}`}
            onClick={() => {
              setActiveFilter(f);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="page-container">

      <div className={styles.tableContainer}>
        <DataTable
          title="Inventory Management"
          columns={columns}
          data={filteredInventory}
          actions={headerActions}
          emptyMessage={loading ? "Loading inventory..." : "No inventory records found."}
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

      {/* ── Modals ── */}
      {selectedVariant && (
        <div className={styles.modalOverlay} onClick={closeModals}>
          <div
            className={`${styles.modalCard} ${actionType === 'HISTORY' ? styles.modalWide : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitles}>
                <h3 className={styles.modalTitle}>
                  {actionType === 'ADD' ? 'Add Inventory' :
                    actionType === 'SET' ? 'Set Absolute Stock' : 'Stock Audit History'}
                </h3>
                <span className={styles.modalSubtitle}>
                  {selectedVariant.product_name} ({selectedVariant.sku})
                </span>
              </div>
              <button className={styles.closeBtn} onClick={closeModals}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {actionType === 'HISTORY' ? (
                <div className={styles.historyContainer}>
                  <DataTable
                    columns={historyColumns}
                    data={history}
                    emptyMessage={historyLoading ? "Loading history..." : "No history records found."}
                  />
                </div>
              ) : (
                <div className={styles.formContainer}>
                  <div className={styles.formGrid2}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        {actionType === 'ADD' ? 'Quantity to Add' : 'New Total Stock'}
                      </label>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={actionType === 'ADD' ? "e.g. 50" : "e.g. 100"}
                        autoFocus
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Low Stock Alert at</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(e.target.value)}
                        placeholder="e.g. 10"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Reason / Reference</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Restock from supplier, Damaged goods..."
                    />
                  </div>

                  <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={closeModals}>Cancel</button>
                    <button className={styles.saveBtn} onClick={handleSave}>
                      {actionType === 'ADD' ? 'Confirm Addition' : 'Set Stock Level'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
