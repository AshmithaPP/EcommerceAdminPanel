import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchFilter from '../../components/ui/SearchFilter';
import styles from './CustomerList.module.css';
import customerService from '../../services/customerService';

const CustomerList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, statusFilter, page]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        status: statusFilter === 'All Statuses' ? undefined : (statusFilter === 'Active' ? 1 : 0),
        page,
        limit
      };
      const response = await customerService.getAllCustomers(params);
      if (response.success) {
        setCustomers(response.data);
        setTotalCount(response.total);
        setTotalPages(Math.ceil(response.total / limit));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className={styles.customerPageContent}>
      {/* Filter & Control Bar */}
      <SearchFilter 
        placeholder="Search patrons by name or email..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        className={styles.searchFilterOverride}
      >
        <div className="d-flex flex-column flex-md-row gap-2 gap-md-3 align-items-md-center align-items-start w-100 w-md-auto justify-content-md-end">
          <select 
            className={styles.statusSelect} 
            value={statusFilter} 
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option>All Statuses</option>
            <option>Active</option>
            <option>Blocked</option>
          </select>

          <div className={styles.topPagination}>
            <button 
              className={styles.pageNavBtn} 
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>chevron_left</span>
            </button>
            <span className={styles.paginationText}>Page {page.toString().padStart(2, '0')} of {totalPages.toString().padStart(2, '0')}</span>
            <button 
              className={styles.pageNavBtn} 
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>chevron_right</span>
            </button>
          </div>
        </div>
      </SearchFilter>

      {/* Table Canvas */}
      <section className={styles.tableWrapper}>
        <div className={styles.tableScrollArea}>
          <table className={styles.customerTable}>
            <thead className={styles.tableHeader}>
              <tr>
                <th>Patron</th>
                <th>Registration</th>
                <th>Order Depth</th>
                <th>LTV</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">No patrons found</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.user_id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <div className={styles.patronCell}>
                        <div className={styles.patronImageWrapper}>
                          <img 
                            src={customer.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=random`} 
                            alt={customer.name} 
                            className={styles.patronImage} 
                          />
                        </div>
                        <div>
                          <p className={styles.patronName}>{customer.name}</p>
                          <p className={styles.patronContact}>{customer.email} | {customer.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.standardText}>{formatDate(customer.created_at)}</span>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.standardText}>{customer.orders_count || 0} Orders</span>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.ltvText}>{formatCurrency(customer.total_spent || 0)}</span>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${customer.status === 1 ? styles.statusActive : styles.statusBlocked}`}>
                        {customer.status === 1 ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className={`${styles.tableCell} text-end`}>
                      <button className={styles.actionBtn} onClick={() => navigate(`/customers/${customer.user_id}`)}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className={styles.tableFooter}>
          <p className={styles.footerInfo}>
            Showing {customers.length.toString().padStart(2, '0')} of {totalCount.toString().padStart(2, '0')} Patrons
          </p>
          <div className={styles.paginationControls}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button 
                  key={pageNum}
                  className={`${styles.pageBtn} ${page === pageNum ? styles.pageBtnActive : styles.pageBtnInactive}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className={styles.ellipsis}>...</span>}
            {totalPages > 5 && (
              <button 
                className={`${styles.pageBtn} ${page === totalPages ? styles.pageBtnActive : styles.pageBtnInactive}`}
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CustomerList;
