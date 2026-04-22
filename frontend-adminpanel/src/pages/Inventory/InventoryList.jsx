import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, History, X } from 'lucide-react';
import styles from './InventoryList.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import useInventoryStore from '../../store/inventoryStore';

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
  const {
    filteredInventory,
    loading,
    history,
    historyLoading,
    page,
    limit,
    total,
    searchTerm,
    activeFilter,
    setFilter,
    setSearch,
    setPage,
    fetchInventory,
    fetchHistory,
    restock,
    setStock,
    resetInventoryState
  } = useInventoryStore();

  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Modal / Action State (Ephemeral)
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [actionType, setActionType] = useState(null); // 'ADD', 'SET', 'HISTORY'
  const [inputValue, setInputValue] = useState('');
  const [thresholdValue, setThresholdValue] = useState('');
  const [reason, setReason] = useState('');

  // Trigger fetch when pagination changes
  useEffect(() => {
    fetchInventory();
  }, [page, limit, fetchInventory]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => resetInventoryState();
  }, [resetInventoryState]);

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
    setInputValue('');
    setReason('');
  };

  const handleSave = async () => {
    if (!selectedVariant || !actionType) return;
    
    let success = false;
    if (actionType === 'ADD') {
      success = await restock(selectedVariant.variant_id, {
        quantity: parseInt(inputValue),
        reason,
        threshold: parseInt(thresholdValue)
      });
    } else {
      success = await setStock(selectedVariant.variant_id, {
        stock: parseInt(inputValue),
        reason,
        threshold: parseInt(thresholdValue)
      });
    }

    if (success) closeModals();
  };

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
            onClick={() => setFilter(f)}
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
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
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
        {!loading && total > limit && (
          <Pagination
            totalItems={total}
            itemsPerPage={limit}
            currentPage={page}
            onPageChange={setPage}
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
