import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './CustomerDetails.module.css';
import customerService from '../../../services/customerService';

const CustomerDetails = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomerById(id);
      setCustomer(data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!customer) return;
    try {
      const newStatus = customer.status === 1 ? 0 : 1;
      await customerService.updateStatus(id, newStatus);
      setCustomer({ ...customer, status: newStatus });
    } catch (err) {
      console.error('Error updating customer status:', err);
      alert('Failed to update status');
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

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (error) return <div className="text-center py-5 text-danger">{error}</div>;
  if (!customer) return <div className="text-center py-5">Customer not found.</div>;

  return (
    <div className={styles.customerDetailsContainer}>
      {/* Customer Header */}
      <section className={styles.headerSection}>
        <div className="flex-grow-1">
          <div className={styles.badge}>{customer.total_spent > 100000 ? 'High Value Customer' : 'Standard Customer'}</div>
          <h2 className={styles.customerName}>{customer.name}</h2>
          <div className={styles.contactInfo}>
            <div className={styles.infoItem}>
              <span className={`material-symbols-outlined ${styles.infoIcon}`}>mail</span>
              {customer.email}
            </div>
            <div className={styles.infoItem}>
              <span className={`material-symbols-outlined ${styles.infoIcon}`}>call</span>
              {customer.phone}
            </div>
            <div className={styles.infoItem}>
              <span className={`material-symbols-outlined ${styles.infoIcon}`}>calendar_today</span>
              Joined {formatDate(customer.created_at)}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={customer.status === 1 ? styles.btnBlock : styles.btnSendMessage} 
            onClick={handleToggleStatus}
          >
            {customer.status === 1 ? 'Block' : 'Activate'}
          </button>
          <button className={styles.btnSendMessage}>Send Message</button>
        </div>
      </section>

      {/* Stats Bar */}
      <section className={styles.statsBar}>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Total Spend</p>
            <p className={`${styles.statValue} ${styles.statValuePrimary}`}>{formatCurrency(customer.stats?.total_spent || 0)}</p>
          </div>
          <span className={`material-symbols-outlined ${styles.statIcon} ${styles.statIconPrimary}`}>payments</span>
        </div>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Purchases</p>
            <p className={styles.statValue}>{customer.stats?.purchases_count || 0}</p>
          </div>
          <span className={`material-symbols-outlined ${styles.statIcon}`}>shopping_bag</span>
        </div>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Return Rate</p>
            <p className={styles.statValue}>{customer.stats?.return_rate || '0%'}</p>
          </div>
          <span className={`material-symbols-outlined ${styles.statIcon}`}>assignment_return</span>
        </div>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Score</p>
            <p className={`${styles.statValue} ${styles.statValueSecondary}`}>{customer.stats?.score || 'N/A'}</p>
          </div>
          <span className={`material-symbols-outlined ${styles.statIcon} ${styles.statIconSecondary}`}>grade</span>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className={styles.contentGrid}>
        {/* Left: Orders Table */}
        <section className={styles.mainCard}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.activeTab}`}>Orders</button>
            <button className={styles.tab}>Returns</button>
            <button className={styles.tab}>Wishlist</button>
          </div>
          
          <div className={styles.tableContainer}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recent History</h3>
              <div className={styles.tableActions}>
                <button className={styles.iconBtn}><span className="material-symbols-outlined" style={{fontSize: '1.1rem'}}>filter_list</span></button>
                <button className={styles.iconBtn}><span className="material-symbols-outlined" style={{fontSize: '1.1rem'}}>download</span></button>
              </div>
            </div>

            <div className={styles.scrollArea}>
              <table className={styles.customTable}>
                <thead>
                  <tr className={styles.tableHeadRow}>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(customer.recent_orders || []).map((order, index) => (
                    <tr key={order.order_id} className={styles.tableRow}>
                      <td className="fw-medium">#{order.order_number.split('-').pop()}</td>
                      <td className="text-muted">{formatDate(order.date)}</td>
                      <td className="text-muted">Multiple Items</td>
                      <td>
                        <span className={`${styles.statusBadge} ${
                          order.status === 'Delivered' 
                            ? styles.statusDelivered 
                            : styles.statusReturned
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="text-end fw-bold">{formatCurrency(order.total)}</td>
                    </tr>
                  ))}
                  {(!customer.recent_orders || customer.recent_orders.length === 0) && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">No recent orders found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.tableFooter}>
              <p className={styles.footerText}>Showing {customer.recent_orders?.length || 0} recent orders</p>
              <div className={styles.pagination}>
                <button className={`${styles.pageBtn} ${styles.prevBtn}`} disabled>Prev</button>
                <button className={`${styles.pageBtn} ${styles.nextBtn}`}>Next</button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column */}
        <div className={styles.sideColumn}>
          {/* Addresses */}
          <section className={styles.sideCard}>
            <div className={styles.sideCardHeader}>
              <h3 className={styles.cardTitle}>Addresses</h3>
              <button className={styles.newAddrBtn}>
                <span className="material-symbols-outlined" style={{fontSize: '1.1rem'}}>add</span> New
              </button>
            </div>
            <div className={styles.addressList} style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {(customer.addresses || []).map((addr, index) => (
                <div key={addr.address_id || index} className={styles.addressBox} style={{ marginBottom: '1rem' }}>
                  <div>
                    <div className={styles.addrTitle}>
                      {addr.zip_code ? 'Standard Address' : 'Residence (Home)'}
                      {addr.is_default ? <span className={styles.primaryBadge}>Primary</span> : null}
                    </div>
                    <p className={styles.addrText}>
                      {addr.address_line1}, {addr.address_line2 ? addr.address_line2 + ', ' : ''} 
                      {addr.city}, {addr.state} - {addr.zip_code}, {addr.country}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-muted cursor-pointer" style={{fontSize: '1.1rem'}}>edit</span>
                </div>
              ))}
              {(!customer.addresses || customer.addresses.length === 0) && (
                <p className="text-muted text-center py-3">No addresses found</p>
              )}
            </div>
          </section>

          {/* Admin Notes */}
          <section className={`${styles.sideCard} ${styles.notesCard}`}>
            <h3 className={styles.cardTitle} style={{marginBottom: '1rem'}}>Admin Notes</h3>
            <div className={styles.notesList}>
              {/* Note: In a real app, you'd fetch notes from an API. Showing mock for now as requested. */}
              {[
                { author: 'Rahul Sharma', time: '2d ago', text: '"Prefers heavy zari work but lightweight fabric. Show silk-organza."', isPrimary: true },
                { author: 'Ananya K.', time: 'Nov 15', text: '"Discussed bespoke blouse stitching. Vintage patterns."', isPrimary: false }
              ].map((note, index) => (
                <div key={index} className={`${styles.noteItem} ${!note.isPrimary ? styles.noteItemAlt : ''}`}>
                  <div className={styles.noteMeta}>
                    <span className={`${styles.authorName} ${!note.isPrimary ? styles.authorNameAlt : ''}`}>{note.author}</span>
                    <span className={styles.noteTime}>{note.time}</span>
                  </div>
                  <p className={styles.noteText}>{note.text}</p>
                </div>
              ))}
            </div>
            <div className={styles.noteInputArea}>
              <textarea className={styles.textarea} placeholder="Add note..."></textarea>
              <button className={styles.btnPostNote}>Post Note</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
