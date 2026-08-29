import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import { getGlobalRealtimeChannel } from '../../api/realtimeHub';
import { toast } from 'react-hot-toast';
import './Orders.css';
import { Loader2, Package, MapPin, Receipt, Clock, Calendar, KeyRound, ShieldCheck } from 'lucide-react';

const OrdersPage = ({ type = 'my-orders' }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const ordersRef = useRef(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!user) return;
        
        let query = supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Map Supabase column names to frontend expected names
        let formattedOrders = (data || []).map(order => ({
          _id: order.id,
          createdAt: order.created_at,
          orderStatus: order.order_status || 'pending',
          paymentStatus: order.payment_status || 'pending',
          items: order.items,
          deliveryDetails: order.delivery_details,
          totalAmount: order.total_amount,
          deliveryCharge: order.delivery_charge,
          grandTotal: order.grand_total,
          razorpayPaymentId: order.razorpay_payment_id
        }));

        // Filter based on page type
        if (type === 'my-orders') {
          // Show active orders (not yet delivered/cancelled)
          formattedOrders = formattedOrders.filter(o => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled' && o.orderStatus !== 'refunded');
        } else {
          // Order history: only completed/cancelled orders
          formattedOrders = formattedOrders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'cancelled' || o.orderStatus === 'refunded');
        }
        
        setOrders(formattedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrders();

      // 1. Postgres Database Changes
      const pgChannel = supabase
        .channel(`customer_orders_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      // 2. Global Realtime Broadcast
      const globalChannel = getGlobalRealtimeChannel();
      const handleBroadcast = (payload) => {
        console.log('[Customer] Received order update broadcast:', payload);
        fetchOrders();
      };

      globalChannel.on('broadcast', { event: 'order_status_changed' }, handleBroadcast);
      globalChannel.on('broadcast', { event: 'order_updated' }, handleBroadcast);

      return () => {
        supabase.removeChannel(pgChannel);
      };
    }
  }, [user, type]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    return {
      date: date.toLocaleDateString('en-GB', dateOptions),
      time: date.toLocaleTimeString('en-US', timeOptions)
    };
  };

  const getStatusBadge = (status) => {
    if (!status) return <span className="status-badge status-pending">Pending</span>;
    const s = status.toLowerCase();
    
    if (s === 'pending') {
      return <span className="status-badge status-pending" style={{ background: '#fef3c7', color: '#b45309', fontWeight: '700' }}>Pending</span>;
    }
    if (s === 'confirmed' || s === 'approved') {
      return <span className="status-badge status-confirmed" style={{ background: '#dcfce7', color: '#16a34a', fontWeight: '700' }}>Approved</span>;
    }
    if (s === 'preparing') {
      return <span className="status-badge status-preparing" style={{ background: '#ffedd5', color: '#c2410c', fontWeight: '700' }}>Preparing in Kitchen</span>;
    }
    if (s === 'ready') {
      return <span className="status-badge status-ready" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '700' }}>Food Ready</span>;
    }
    if (s === 'out_for_delivery') {
      return <span className="status-badge status-out-for-delivery" style={{ background: '#e0f2fe', color: '#0284c7', fontWeight: '700' }}>Order on the Way</span>;
    }
    if (s === 'delivered') {
      return <span className="status-badge status-delivered" style={{ background: '#dcfce7', color: '#15803d', fontWeight: '700' }}>Delivered</span>;
    }
    
    return <span className={`status-badge status-${s.replace(/_/g, '-')}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentOrders = orders.slice(startIndex, startIndex + itemsPerPage);

  const scrollToOrders = () => {
    if (ordersRef.current) {
      const navbarOffset = 90;
      const elementPosition = ordersRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setTimeout(scrollToOrders, 30);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      setTimeout(scrollToOrders, 30);
    }
  };

  if (!user) {
    return (
      <div className="orders-container">
        <h2>Please login to view your orders.</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="orders-container loading-container">
        <Loader2 className="spinner" size={40} />
      </div>
    );
  }

  return (
    <div className="orders-container" ref={ordersRef}>
      <h2 className="orders-title">
        <Package size={32} color="#16a34a" /> 
        {type === 'my-orders' ? 'My Orders' : 'Order History'}
      </h2>
      
      {orders.length === 0 ? (
        <div className="empty-orders">
          <Receipt size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
          <p>You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="orders-list">
          {currentOrders.map(order => {
            const { date, time } = formatDate(order.createdAt);
            return (
              <div key={order._id} className={`order-card status-${order.orderStatus?.toLowerCase().replace(/_/g, '-') || 'pending'}`}>
                
                {/* Header */}
                <div className="order-header-premium">
                  <div className="premium-id-section">
                    <div className="order-icon-wrapper">
                      <Receipt size={24} />
                    </div>
                    <div className="order-id-premium">
                      <span>Order ID</span>
                      #{order._id.substring(order._id.length - 8)}
                    </div>
                  </div>
                  <div className="order-date-premium">
                    <span><Calendar size={14} style={{display:'inline', marginBottom:'-2px'}}/> {date}</span>
                    <span style={{color: '#6b7280', fontSize: '0.85rem'}}><Clock size={12} style={{display:'inline', marginBottom:'-1px'}}/> {time}</span>
                  </div>
                </div>
                
                {/* Body */}
                <div className="order-body-premium">
                  <div className="premium-status-row">
                    <div className="premium-badge-group">
                      <span className="premium-badge-label">Order Status</span>
                      {getStatusBadge(order.orderStatus)}
                    </div>
                    <div className="premium-badge-group">
                      <span className="premium-badge-label">Payment</span>
                      {getStatusBadge(order.paymentStatus)}
                    </div>
                  </div>

                  {/* Delivery Confirmation OTP for Customer */}
                  {order.deliveryDetails?.delivery_otp && order.orderStatus !== 'delivered' && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                      border: '2px dashed #16a34a',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      margin: '14px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', background: '#16a34a', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <KeyRound size={22} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#14532d', fontWeight: '800' }}>Your Delivery Confirmation OTP</h4>
                          <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#166534' }}>
                            Give this 6-digit code to your delivery partner to receive your order.
                          </p>
                        </div>
                      </div>
                      <div style={{
                        background: 'white',
                        padding: '8px 20px',
                        borderRadius: '10px',
                        border: '2px solid #86efac',
                        fontSize: '1.45rem',
                        fontWeight: '900',
                        letterSpacing: '5px',
                        color: '#15803d',
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)',
                        marginLeft: 'auto'
                      }}>
                        {order.deliveryDetails.delivery_otp}
                      </div>
                    </div>
                  )}

                  <div className="order-items-premium">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="item-row-premium">
                        <div className="item-qty-name">
                          <span className="item-qty-badge">{item.quantity}x</span>
                          <span className="item-name-premium">{item.name}</span>
                        </div>
                        <span className="item-price-premium">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-footer-premium">
                    <div className="delivery-info-premium">
                      <MapPin className="delivery-icon" size={36} />
                      <div className="delivery-text">
                        <h4>Delivery Address</h4>
                        <p>{order.deliveryDetails.address}</p>
                        <p>{order.deliveryDetails.city}</p>
                      </div>
                    </div>
                    
                    <div className="totals-premium">
                      <div className="total-line">
                        <span>Subtotal</span>
                        <span>₹{order.totalAmount}</span>
                      </div>
                      <div className="total-line">
                        <span>Delivery Fee</span>
                        <span>₹{order.deliveryCharge}</span>
                      </div>
                      <div className="total-line grand">
                        <span>Total</span>
                        <span>₹{order.grandTotal}</span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '30px', padding: '20px 0' }}>
          <button 
            onClick={handlePrevPage} 
            disabled={currentPage === 1}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: currentPage === 1 ? '#f3f4f6' : '#fff', color: currentPage === 1 ? '#9ca3af' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.95rem', color: '#4b5563', fontWeight: '500' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={handleNextPage} 
            disabled={currentPage === totalPages}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: currentPage === totalPages ? '#f3f4f6' : '#fff', color: currentPage === totalPages ? '#9ca3af' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
