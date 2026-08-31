import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Receipt, 
  Package, 
  Eye, 
  X, 
  ShieldCheck 
} from 'lucide-react';
import IOSSpinner from '../IOSSpinner';
import './ActiveOrders.css'; // Uses same shared modal styles

const OwnerOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [deliveryBoysMap, setDeliveryBoysMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedOrder]);

  useEffect(() => {
    fetchDeliveredOrders();

    const channel = supabase
      .channel('owner_history_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchDeliveredOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDeliveredOrders = async () => {
    try {
      // 1. Fetch delivery partners for mapping
      const { data: usersData } = await supabase.from('users').select('id, name, email');
      const boysMap = {};
      (usersData || []).forEach(u => {
        boysMap[u.id] = {
          name: u.name && u.name !== 'User' ? u.name : (u.email ? u.email.split('@')[0] : 'Rider'),
          email: u.email
        };
      });
      setDeliveryBoysMap(boysMap);

      // 2. Fetch delivered orders
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_status', 'delivered')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching owner order history:', err);
      toast.error('Failed to load completed order history');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDeliveredTime = (isoString) => {
    if (!isoString) return 'Delivered';
    const d = new Date(isoString);
    return `${d.toLocaleDateString('en-GB')} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    const rider = deliveryBoysMap[o.delivery_boy_id];
    const riderName = rider?.name?.toLowerCase() || '';
    const customerName = o.delivery_details?.name?.toLowerCase() || '';
    const orderId = o.id?.toLowerCase() || '';
    
    return orderId.includes(term) || customerName.includes(term) || riderName.includes(term);
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px' }}>
        <IOSSpinner size={36} color="#2E7D32" />
        <p style={{ color: '#64748b', fontWeight: '600' }}>Loading completed order records...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px' }}>
      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <Search size={20} color="#64748b" style={{ marginRight: '0.6rem' }} />
        <input 
          type="text" 
          placeholder="Search by Order ID, Customer, or Delivery Partner..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' }}
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <Package size={56} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.3rem', color: '#1e293b', marginBottom: '6px' }}>No Delivered Orders Found</h3>
          <p style={{ color: '#64748b' }}>{searchTerm ? 'No delivered orders match your search query.' : 'Orders completed with customer OTP will be archived here.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredOrders.map(order => {
            const details = order.delivery_details || {};
            const items = order.items || [];
            const rider = deliveryBoysMap[order.delivery_boy_id] || { name: order.delivery_boy_name || 'Rider', email: '' };
            const deliveredTimestamp = order.delivered_at || details.delivered_at || order.created_at;

            return (
              <div 
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                      #{order.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '800' }}>
                      <CheckCircle2 size={14} /> DELIVERED
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={15} color="#2E7D32" /> <strong>{details.name || 'Customer'}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={15} color="#2E7D32" /> <span>{details.phoneNumber || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={15} color="#2E7D32" /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{details.address || 'N/A'}</span>
                    </div>
                    
                    {/* Delivery Partner details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', background: '#f0f9ff', padding: '6px 10px', borderRadius: '8px', marginTop: '4px', fontWeight: '600' }}>
                      <Truck size={16} /> <span>Delivered by: <strong>{rider.name}</strong></span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: '700', color: '#64748b' }}>
                      Items ({items.length})
                    </span>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0 0', fontSize: '0.88rem' }}>
                      {items.map((it, idx) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span><strong>{it.quantity}x</strong> {it.name}</span>
                          <span>{formatCurrency((it.price || 0) * it.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      {new Date(order.created_at).toLocaleDateString('en-GB')} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16a34a' }}>
                      {formatCurrency(order.grand_total || order.total_amount)}
                    </div>
                  </div>

                  {/* View Details Button (Matching Active Orders UI) */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0284c7',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={16} /> View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal with Delivery Boy Info & Exact Delivered At */}
      {selectedOrder && (
        <div 
          className="logout-modal-overlay" 
          onClick={() => setSelectedOrder(null)} 
          style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div 
            className="logout-modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: '2rem', margin: 'auto', borderRadius: '16px', boxSizing: 'border-box' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a' }}>
                  Order Details #{selectedOrder.id.substring(0, 8).toUpperCase()}
                </h3>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', marginTop: '4px' }}>
                  <CheckCircle2 size={13} /> COMPLETED & DELIVERED
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedOrder(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            {/* Delivery Completion & Rider Highlight Card */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '16px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '36px', height: '36px', background: '#16a34a', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#14532d', fontWeight: '800' }}>
                    Delivered by: {deliveryBoysMap[selectedOrder.delivery_boy_id]?.name || selectedOrder.delivery_boy_name || 'Assigned Rider'}
                  </h4>
                  {deliveryBoysMap[selectedOrder.delivery_boy_id]?.email && (
                    <span style={{ fontSize: '0.8rem', color: '#166534' }}>
                      {deliveryBoysMap[selectedOrder.delivery_boy_id].email}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #bbf7d0', paddingTop: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.86rem' }}>
                <div style={{ color: '#14532d' }}>
                  <Clock size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                  <strong>Delivered at:</strong> {formatDeliveredTime(selectedOrder.delivered_at || selectedOrder.delivery_details?.delivered_at)}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#15803d', fontWeight: '700', fontSize: '0.8rem' }}>
                  <ShieldCheck size={16} /> OTP Verified
                </div>
              </div>
            </div>

            {/* Customer Location Map */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#475569', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Delivery Location</h4>
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '220px' }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedOrder.delivery_details?.address || 'Katari Bazar')}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            </div>

            {/* Customer Info & Summary Grid */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ color: '#475569', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Customer Details</h4>
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Name:</strong> {selectedOrder.delivery_details?.name}</p>
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Phone:</strong> {selectedOrder.delivery_details?.phoneNumber}</p>
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Address:</strong> {selectedOrder.delivery_details?.address}</p>
                {selectedOrder.delivery_details?.city && <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>City:</strong> {selectedOrder.delivery_details?.city}</p>}
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ color: '#475569', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Payment & Billing</h4>
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Method:</strong> {selectedOrder.payment_method?.toUpperCase() || 'RAZORPAY'}</p>
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Status:</strong> <span style={{ color: '#16a34a', fontWeight: '700' }}>{selectedOrder.payment_status?.toUpperCase() || 'PAID'}</span></p>
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Total:</strong> <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#16a34a' }}>{formatCurrency(selectedOrder.grand_total || selectedOrder.total_amount)}</span></p>
              </div>
            </div>

            {/* Ordered Items List */}
            <div>
              <h4 style={{ color: '#475569', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Order Items ({selectedOrder.items?.length || 0})</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                {(selectedOrder.items || []).map((item, idx) => (
                  <li key={idx} style={{ padding: '0.75rem 1rem', borderBottom: idx !== selectedOrder.items.length - 1 ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <strong style={{ color: '#2E7D32', marginRight: '6px' }}>{item.quantity}x</strong> 
                      {item.name} {item.variant ? `(${item.variant})` : ''}
                    </span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency((item.price || 0) * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Close Modal Button */}
            <div style={{ marginTop: '1.8rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedOrder(null)}
                style={{ padding: '10px 24px', background: '#64748b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerOrderHistory;
