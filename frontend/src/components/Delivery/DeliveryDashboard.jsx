import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import { getGlobalRealtimeChannel, broadcastOrderUpdate } from '../../api/realtimeHub';
import { toast } from 'react-hot-toast';
import { 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle, 
  Navigation, 
  Clock, 
  Receipt, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2,
  Package,
  History,
  AlertCircle
} from 'lucide-react';
import LiveTrackingMap from './LiveTrackingMap';
import DeliveryOtpModal from './DeliveryOtpModal';
import DeliverySuccessModal from './DeliverySuccessModal';
import IOSSpinner from '../IOSSpinner';
import './DeliveryDashboard.css';

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'active', 'history'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tracking & Modals
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermissionError, setLocationPermissionError] = useState(null);
  const [otpModalOrder, setOtpModalOrder] = useState(null);
  const [successModalOrder, setSuccessModalOrder] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const geoWatchIdRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchAssignedOrders();

      // 1. Database Postgres Realtime Listener
      const pgChannel = supabase
        .channel('delivery_orders_realtime_pg')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchAssignedOrders();
          }
        )
        .subscribe();

      // 2. Global Instant Broadcast Channel
      const globalChannel = getGlobalRealtimeChannel();
      const handleBroadcast = (payload) => {
        console.log('[Delivery] Received broadcast event:', payload);
        fetchAssignedOrders();
      };

      globalChannel.on('broadcast', { event: 'order_status_changed' }, handleBroadcast);
      globalChannel.on('broadcast', { event: 'order_updated' }, handleBroadcast);

      return () => {
        supabase.removeChannel(pgChannel);
      };
    }
  }, [user]);

  // Geolocation tracking when active delivery is underway
  useEffect(() => {
    const hasOutForDelivery = orders.some(o => o.order_status === 'out_for_delivery');

    if (hasOutForDelivery && navigator.geolocation) {
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentLocation(coords);
          setLocationPermissionError(null);

          // Broadcast location to active order channel
          orders.filter(o => o.order_status === 'out_for_delivery').forEach(o => {
            const locChannel = supabase.channel(`order_tracking_${o.id}`);
            locChannel.send({
              type: 'broadcast',
              event: 'location_update',
              payload: {
                orderId: o.id,
                deliveryBoyId: user.id,
                lat: coords.lat,
                lng: coords.lng,
                timestamp: Date.now()
              }
            });
          });
        },
        (err) => {
          console.warn('Geolocation access issue:', err.message);
          setLocationPermissionError('Location permission is needed for live navigation tracking.');
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );
    } else {
      if (geoWatchIdRef.current) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    }

    return () => {
      if (geoWatchIdRef.current) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, [orders, user]);

  const fetchAssignedOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_boy_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching delivery orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // 1. APPROVE ORDER & START DELIVERY
  const handleApproveOrder = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          order_status: 'out_for_delivery'
        })
        .eq('id', orderId);

      if (error) throw error;

      // Broadcast acceptance to Owner
      const ownerChannel = supabase.channel('owner_notifications');
      await ownerChannel.send({
        type: 'broadcast',
        event: 'delivery_accepted',
        payload: {
          orderId,
          deliveryBoyName: user.name || user.email?.split('@')[0] || 'Delivery Partner'
        }
      });

      // Broadcast Out for Delivery event to Customer
      const trackingChannel = supabase.channel(`order_tracking_${orderId}`);
      await trackingChannel.send({
        type: 'broadcast',
        event: 'out_for_delivery',
        payload: { orderId: orderId, status: 'out_for_delivery' }
      });

      toast.success('Order Accepted! Live navigation map is now active.');
      setActiveTab('active');
      fetchAssignedOrders();
    } catch (err) {
      console.error('Error approving order:', err);
      toast.error('Failed to approve order');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. START "OUT FOR DELIVERY" (if already approved)
  const handleOutForDelivery = async (order) => {
    setActionLoadingId(order.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: 'out_for_delivery' })
        .eq('id', order.id);

      if (error) throw error;

      // Broadcast Out for Delivery event
      const trackingChannel = supabase.channel(`order_tracking_${order.id}`);
      await trackingChannel.send({
        type: 'broadcast',
        event: 'out_for_delivery',
        payload: { orderId: order.id, status: 'out_for_delivery' }
      });

      toast.success('Order is now Out for Delivery! Live tracking is active.');
      fetchAssignedOrders();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. REQUEST OTP
  const handleRequestOtp = async (order) => {
    setActionLoadingId(order.id);
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const updatedDetails = {
        ...(order.delivery_details || {}),
        delivery_otp: newOtp,
        otp_expires_at: expiresAt
      };

      const { error } = await supabase
        .from('orders')
        .update({
          delivery_details: updatedDetails
        })
        .eq('id', order.id);

      if (error) throw error;

      // Broadcast OTP requested event to Customer
      await broadcastOrderUpdate('order_status_changed', {
        orderId: order.id,
        status: 'otp_requested',
        otp: newOtp
      });

      const trackingChannel = supabase.channel(`order_tracking_${order.id}`);
      await trackingChannel.send({
        type: 'broadcast',
        event: 'otp_requested',
        payload: { orderId: order.id, otp: newOtp }
      });

      const customerEmail = order.delivery_details?.email || 'customer';
      toast.success(`6-digit OTP generated & sent to ${customerEmail}`);
      
      const orderWithOtp = {
        ...order,
        delivery_details: updatedDetails
      };
      
      setOtpModalOrder(orderWithOtp);
      fetchAssignedOrders();
    } catch (err) {
      console.error('Error generating OTP:', err);
      toast.error('Failed to generate OTP');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Split orders by status
  const requestOrders = orders.filter(o => o.order_status !== 'delivered' && o.order_status !== 'cancelled' && o.order_status !== 'out_for_delivery');
  const activeOrders = orders.filter(o => o.order_status === 'out_for_delivery');
  const historyOrders = orders.filter(o => o.order_status === 'delivered');

  if (!user || !(user.role === 'delivery' || user.email?.startsWith('db'))) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You need Delivery Boy permissions to view this portal.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <IOSSpinner size={36} color="#16a34a" />
        <p style={{ color: '#64748b', fontWeight: '600' }}>Loading deliveries...</p>
      </div>
    );
  }

  return (
    <div className="delivery-dashboard-container">
      {/* Header */}
      <header className="delivery-header">
        <div className="delivery-header-title">
          <Truck size={28} color="#16a34a" />
          <h1>Delivery Partner Portal</h1>
        </div>
        <div className="delivery-user-badge">
          <User size={16} />
          <span>{user.name && user.name !== 'User' ? user.name : user.email}</span>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="delivery-tabs-nav">
        <button 
          className={`delivery-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Package size={18} />
          <span>New Requests</span>
          {requestOrders.length > 0 && <span className="tab-badge">{requestOrders.length}</span>}
        </button>

        <button 
          className={`delivery-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <Navigation size={18} />
          <span>Active Delivery</span>
          {activeOrders.length > 0 && <span className="tab-badge" style={{ background: '#0284c7' }}>{activeOrders.length}</span>}
        </button>

        <button 
          className={`delivery-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          <span>Order History</span>
        </button>
      </div>

      {locationPermissionError && (
        <div style={{ maxWidth: '1100px', margin: '0 auto 16px', background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: '#b45309', fontSize: '0.9rem' }}>
          <AlertCircle size={20} />
          <span>{locationPermissionError}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="delivery-main">
        {/* TAB 1: NEW REQUESTS (MINIMAL CARD) */}
        {activeTab === 'requests' && (
          <div>
            {requestOrders.length === 0 ? (
              <div className="empty-delivery-state">
                <Truck size={52} className="empty-icon" />
                <h3>No New Requests</h3>
                <p>You have no pending delivery requests at the moment. Stand by!</p>
              </div>
            ) : (
              requestOrders.map(order => (
                <div key={order.id} className="request-card">
                  <div className="request-card-info">
                    <span className="request-label">New Delivery Request</span>
                    <span className="request-order-id">Order ID: #{order.id.substring(0, 8).toUpperCase()}</span>
                    <span className="request-time">
                      <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      Assigned {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button 
                    className="btn-approve-green"
                    onClick={() => handleApproveOrder(order.id)}
                    disabled={actionLoadingId === order.id}
                  >
                    {actionLoadingId === order.id ? (
                      <>
                        <IOSSpinner size={18} color="white" /> Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} /> APPROVE
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE DELIVERIES (FULL DETAILS + MAP + OTP) */}
        {activeTab === 'active' && (
          <div>
            {activeOrders.length === 0 ? (
              <div className="empty-delivery-state">
                <Navigation size={52} className="empty-icon" />
                <h3>No Active Deliveries</h3>
                <p>Approve a delivery request to start navigation and live delivery.</p>
              </div>
            ) : (
              activeOrders.map(order => {
                const details = order.delivery_details || {};
                const isOutForDelivery = order.order_status === 'out_for_delivery';

                return (
                  <div key={order.id} className="active-delivery-card">
                    {/* Header */}
                    <div className="active-card-top">
                      <div className="active-id-block">
                        <h3>Order #{order.id.substring(0, 8).toUpperCase()}</h3>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`active-status-badge badge-${order.order_status}`}>
                        {order.order_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Grid Dashboard Layout */}
                    <div className="active-delivery-grid">
                      
                      {/* Left Column: Interactive Road Navigation Map */}
                      <div className="active-delivery-left">
                        <LiveTrackingMap
                          customerLocation={details.location || { lat: details.lat, lng: details.lng }}
                          customerAddress={details.address}
                          deliveryBoyLocation={currentLocation}
                          isLiveTracking={isOutForDelivery}
                        />
                      </div>

                      {/* Right Column: Customer Details, Items, and Actions */}
                      <div className="active-delivery-right">
                        {/* Customer & Delivery Information Grid */}
                        <div className="customer-details-grid">
                          <div className="detail-item">
                            <User size={18} className="detail-icon" />
                            <div className="detail-text">
                              <h4>Customer Name</h4>
                              <p>{details.name || details.fullName || 'Valued Customer'}</p>
                            </div>
                          </div>

                          <div className="detail-item">
                            <Phone size={18} className="detail-icon" />
                            <div className="detail-text">
                              <h4>Contact Number</h4>
                              <p>{details.phoneNumber || details.contact || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="detail-item">
                            <MapPin size={18} className="detail-icon" />
                            <div className="detail-text">
                              <h4>Delivery Address</h4>
                              <p>{details.address || 'N/A'}{details.city ? `, ${details.city}` : ''}</p>
                            </div>
                          </div>

                          <div className="detail-item">
                            <Receipt size={18} className="detail-icon" />
                            <div className="detail-text">
                              <h4>Bill Total</h4>
                              <p>₹{order.grand_total || order.total_amount || 0} ({order.payment_status?.toUpperCase() || 'PAID'})</p>
                            </div>
                          </div>
                        </div>

                        {/* Ordered Items */}
                        <div className="delivery-items-section">
                          <h4>Food Items to Deliver ({order.items?.length || 0})</h4>
                          <ul className="delivery-items-list">
                            {(order.items || []).map((item, idx) => (
                              <li key={idx} className="delivery-item-row">
                                <span>
                                  <span className="item-qty-tag">{item.quantity}x</span>
                                  <strong>{item.name}</strong> {item.variant ? `(${item.variant})` : ''}
                                </span>
                                <span style={{ fontWeight: '600' }}>₹{(item.price || 0) * item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Action Bar */}
                        <div className="active-actions-bar">
                          {!isOutForDelivery ? (
                            <button 
                              className="btn-out-delivery"
                              onClick={() => handleOutForDelivery(order)}
                              disabled={actionLoadingId === order.id}
                            >
                              {actionLoadingId === order.id ? (
                                <>
                                  <IOSSpinner size={18} color="white" /> Updating...
                                </>
                              ) : (
                                <>
                                  <Navigation size={18} /> Out for Delivery
                                </>
                              )}
                            </button>
                          ) : (
                            <button 
                              className="btn-request-otp"
                              onClick={() => handleRequestOtp(order)}
                              disabled={actionLoadingId === order.id}
                            >
                              {actionLoadingId === order.id ? (
                                <>
                                  <IOSSpinner size={18} color="white" /> Sending OTP...
                                </>
                              ) : (
                                <>
                                  <KeyRound size={18} /> Request & Verify OTP
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: ORDER HISTORY */}
        {activeTab === 'history' && (
          <div>
            {historyOrders.length === 0 ? (
              <div className="empty-delivery-state">
                <Receipt size={52} className="empty-icon" />
                <h3>No Completed Deliveries</h3>
                <p>Orders you successfully deliver with OTP verification will appear here.</p>
              </div>
            ) : (
              historyOrders.map(order => (
                <div key={order.id} className="request-card" style={{ borderLeft: '4px solid #16a34a' }}>
                  <div className="request-card-info">
                    <span className="request-label" style={{ color: '#16a34a' }}>Completed Delivery</span>
                    <span className="request-order-id">Order #{order.id.substring(0, 8).toUpperCase()}</span>
                    <span className="request-time">
                      Delivered to {order.delivery_details?.name || 'Customer'} • ₹{order.grand_total || order.total_amount}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: '700' }}>
                    <CheckCircle2 size={20} /> Delivered
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* OTP Modal */}
      {otpModalOrder && (
        <DeliveryOtpModal
          order={otpModalOrder}
          isOpen={!!otpModalOrder}
          onClose={() => setOtpModalOrder(null)}
          onSuccess={(completedOrder) => {
            setOtpModalOrder(null);
            setSuccessModalOrder(completedOrder);
            fetchAssignedOrders();
            setActiveTab('history');
          }}
        />
      )}

      {/* Success Celebration Modal */}
      {successModalOrder && (
        <DeliverySuccessModal
          order={successModalOrder}
          isOpen={!!successModalOrder}
          onClose={() => setSuccessModalOrder(null)}
        />
      )}
    </div>
  );
};

export default DeliveryDashboard;
