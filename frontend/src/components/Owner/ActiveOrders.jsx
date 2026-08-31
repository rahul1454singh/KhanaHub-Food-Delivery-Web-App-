import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { getGlobalRealtimeChannel, broadcastOrderUpdate } from '../../api/realtimeHub';
import { toast } from 'react-hot-toast';
import { Clock, MapPin, Phone, User, CheckCircle, ChefHat, Package, Check, Search, X, Eye, Truck, Navigation } from 'lucide-react';
import LiveTrackingMap from '../Delivery/LiveTrackingMap';
import './ActiveOrders.css';

const ActiveOrders = ({ setPendingCount, onAssign }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryBoysMap, setDeliveryBoysMap] = useState({});
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null);

  // Real-time tracking listener for Owner Dashboard
  useEffect(() => {
    if (!selectedOrder || selectedOrder.order_status !== 'out_for_delivery') {
      setDeliveryBoyLocation(null);
      return;
    }

    const trackingChannel = supabase
      .channel(`order_tracking_${selectedOrder.id}`)
      .on('broadcast', { event: 'location_update' }, (payload) => {
        const { lat, lng } = payload.payload;
        if (lat && lng) {
          setDeliveryBoyLocation({ lat, lng });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(trackingChannel);
    };
  }, [selectedOrder]);
  
  // In-place Assign Delivery Modal State
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [availableBoys, setAvailableBoys] = useState([]);
  const [loadingBoys, setLoadingBoys] = useState(false);
  const [isAssigningId, setIsAssigningId] = useState(null);

  const openAssignModal = async (order) => {
    setAssignModalOrder(order);
    setLoadingBoys(true);
    try {
      // 1. Fetch registered delivery boys
      const { data: usersData, error: usersError } = await supabase.from('users').select('*');
      if (usersError) throw usersError;
      const allBoys = (usersData || []).filter(u => u.role === 'delivery' || (u.email && u.email.startsWith('db')));

      // 2. Fetch all active orders to check which delivery partners are currently busy
      const { data: activeOrdersData, error: ordersError } = await supabase
        .from('orders')
        .select('delivery_boy_id')
        .not('delivery_boy_id', 'is', null)
        .neq('order_status', 'delivered')
        .neq('order_status', 'cancelled');

      if (ordersError) throw ordersError;

      const busyBoyIds = new Set((activeOrdersData || []).map(o => o.delivery_boy_id));

      // Filter: ONLY delivery partners who are currently FREE (0 active orders)
      const freeBoys = allBoys.filter(boy => !busyBoyIds.has(boy.id));
      setAvailableBoys(freeBoys);
    } catch (err) {
      console.error('Error fetching delivery partners:', err);
      toast.error('Failed to load delivery partners');
    } finally {
      setLoadingBoys(false);
    }
  };

  const closeAssignModal = () => {
    setAssignModalOrder(null);
    setIsAssigningId(null);
  };

  const handleAssignDeliveryBoy = async (orderId, boy) => {
    setIsAssigningId(boy.id);
    try {
      const boyName = boy.name && boy.name !== 'User' ? boy.name : boy.email?.split('@')[0];
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_boy_id: boy.id
        })
        .eq('id', orderId);

      if (error) throw error;

      // Broadcast instant assignment to Delivery Boy & Customer
      await broadcastOrderUpdate('order_status_changed', {
        orderId,
        deliveryBoyId: boy.id,
        boyName,
        status: 'assigned'
      });

      toast.success(`Order assigned to ${boyName}`);
      closeAssignModal();
      fetchActiveOrders();
    } catch (err) {
      console.error('Error assigning order:', err);
      toast.error('Failed to assign order');
    } finally {
      setIsAssigningId(null);
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedOrder || assignModalOrder) {
      document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = ''; document.documentElement.style.overflow = '';
    };
  }, [selectedOrder, assignModalOrder]);

  useEffect(() => {
    fetchActiveOrders();

    // 1. Postgres Database Changes
    const postgresSub = supabase
      .channel('owner-orders-pg')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchActiveOrders();
        }
      )
      .subscribe();

    // 2. Global Instant Broadcast Channel
    const globalChannel = getGlobalRealtimeChannel();
    const handleBroadcast = (payload) => {
      console.log('[Owner] Received broadcast:', payload);
      fetchActiveOrders();
    };

    globalChannel.on('broadcast', { event: 'order_status_changed' }, handleBroadcast);
    globalChannel.on('broadcast', { event: 'order_updated' }, handleBroadcast);
    globalChannel.on('broadcast', { event: 'delivery_accepted' }, handleBroadcast);

    return () => {
      supabase.removeChannel(postgresSub);
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      // 1. Fetch delivery partners for mapping
      const { data: usersData } = await supabase.from('users').select('id, name, email');
      const boysMap = {};
      (usersData || []).forEach(u => {
        boysMap[u.id] = u.name && u.name !== 'User' ? u.name : (u.email ? u.email.split('@')[0] : 'Rider');
      });
      setDeliveryBoysMap(boysMap);

      // 2. Fetch active orders
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .neq('order_status', 'delivered')
        .neq('order_status', 'cancelled')
        .order('created_at', { ascending: true }); // Oldest first (FIFO)

      if (error) throw error;
      
      setOrders(data || []);
      
      // Update the badge count in the parent dashboard for 'pending' or 'confirmed'
      const pendingOrders = (data || []).filter(o => o.order_status === 'pending' || o.order_status === 'confirmed');
      if (setPendingCount) {
        setPendingCount(pendingOrders.length);
      }
      
    } catch (err) {
      console.error('Error fetching active orders:', err);
      toast.error('Failed to load active orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, e) => {
    if (e) e.stopPropagation(); // Prevent modal from opening
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      await broadcastOrderUpdate('order_status_changed', {
        orderId,
        newStatus
      });

      toast.success(`Order marked as ${newStatus}`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, order_status: newStatus }));
      }
      fetchActiveOrders();
    } catch (err) {
      console.error('Error updating order:', err);
      toast.error('Failed to update order status');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleCardClick = (order) => {
    setSelectedOrder(order);
  };

  const closeModal = () => {
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="active-orders-loading">
        <div className="spinner"></div>
        <p>Loading incoming orders...</p>
      </div>
    );
  }

  // Filter orders by search term
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="active-orders-container">
      {/* Search Bar */}
      <div className="orders-search-bar" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <Search size={20} color="#64748b" style={{ marginRight: '0.5rem' }} />
        <input 
          type="text" 
          placeholder="Search by Order ID..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem' }}
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div className="active-orders-empty">
          <Package size={64} className="empty-icon" />
          <h3>No Active Orders</h3>
          <p>{searchTerm ? 'No orders match your search.' : 'Waiting for customers to place new orders...'}</p>
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => {
            const { id, created_at, order_status, grand_total, delivery_details, items } = order;
            const details = delivery_details || {};
            const isPending = order_status === 'pending';
            const isConfirmed = order_status === 'confirmed';
            const isPreparing = order_status === 'preparing';
            const isOutForDelivery = order_status === 'out_for_delivery';

            return (
              <div key={id} className={`order-card status-${order_status}`} onClick={() => handleCardClick(order)} style={{ cursor: 'pointer' }}>
                <div className="order-card-header">
                  <div className="order-id-time">
                    <span className="order-id">#{id.substring(0, 6).toUpperCase()}</span>
                    <span className="order-time"><Clock size={14} /> {formatTime(created_at)}</span>
                  </div>
                  <div className={`order-badge ${order_status}`}>
                    {order_status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                <div className="order-customer-info">
                  <div className="info-row">
                    <User size={16} /> <span className="fw-600">{details.name || 'Guest'}</span>
                  </div>
                  <div className="info-row">
                    <Phone size={16} /> <span>{details.phoneNumber || 'N/A'}</span>
                  </div>
                  <div className="info-row address-row">
                    <MapPin size={16} className="shrink-0" />
                    <span>{details.address}</span>
                  </div>
                  {order.delivery_boy_id && (
                    <div className="info-row" style={{ color: '#0284c7', background: '#f0f9ff', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', fontWeight: '600' }}>
                      <Truck size={16} /> <span>Assigned to: {deliveryBoysMap[order.delivery_boy_id] || 'Rider'}</span>
                    </div>
                  )}
                </div>

                <div className="order-items-list">
                  <h4>Order Items ({items?.length || 0})</h4>
                  <ul>
                    {(items || []).map((item, idx) => (
                      <li key={idx}>
                        <span className="item-qty">{item.quantity}x</span>
                        <span className="item-name">{item.name}</span>
                        {item.variant && <span className="item-variant">({item.variant})</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="order-card-footer">
                  <div className="order-total">
                    Total: <span>{formatCurrency(grand_total)}</span>
                  </div>
                  
                  <div className="order-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-view-details" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleCardClick(order); 
                      }}
                    >
                      <Eye size={16} /> View Details
                    </button>
                    {isPending && (
                      <button 
                        className="btn-action prepare"
                        style={{ backgroundColor: '#16a34a', color: 'white' }}
                        onClick={(e) => updateOrderStatus(id, 'confirmed', e)}
                      >
                        <Check size={16} /> Approve Order
                      </button>
                    )}
                    {isConfirmed && (
                      <button 
                        className="btn-action prepare"
                        style={{ backgroundColor: '#2E7D32', color: 'white' }}
                        onClick={(e) => updateOrderStatus(id, 'preparing', e)}
                      >
                        <ChefHat size={16} /> Prepare Order
                      </button>
                    )}
                    {isPreparing && !order.delivery_boy_id && (
                      <button 
                        className="btn-action ready"
                        style={{ borderRadius: '10px', backgroundColor: '#0284c7', color: 'white' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignModal(order);
                        }}
                      >
                        <Truck size={16} /> Mark as Ready & Assign
                      </button>
                    )}
                    {isPreparing && order.delivery_boy_id && (
                      <div className="waiting-delivery" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0f9ff', color: '#0284c7', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem' }}>
                        <Clock size={16} /> Waiting for Pickup ({deliveryBoysMap[order.delivery_boy_id] || 'Rider'})
                      </div>
                    )}
                    {isOutForDelivery && (
                      <div className="waiting-delivery" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem' }}>
                        <Navigation size={16} /> Out for Delivery
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details & Map Modal */}
      {selectedOrder && (
        <div className="logout-modal-overlay" onClick={closeModal} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: '2rem', margin: 'auto', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Order Details #{selectedOrder.id.substring(0, 6).toUpperCase()}</h3>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>Customer Location Map</h4>
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '250px' }}>
                {selectedOrder.order_status === 'out_for_delivery' ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <LiveTrackingMap 
                      customerLocation={selectedOrder.delivery_details?.location || { lat: selectedOrder.delivery_details?.lat, lng: selectedOrder.delivery_details?.lng }}
                      customerAddress={selectedOrder.delivery_details?.address}
                      deliveryBoyLocation={deliveryBoyLocation}
                      isLiveTracking={true}
                    />
                  </div>
                ) : (
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedOrder.delivery_details?.address || '')}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>Customer Info</h4>
                <p><strong>Name:</strong> {selectedOrder.delivery_details?.name}</p>
                <p><strong>Phone:</strong> {selectedOrder.delivery_details?.phoneNumber}</p>
                <p><strong>Address:</strong> {selectedOrder.delivery_details?.address}</p>
                {selectedOrder.delivery_details?.landmark && <p><strong>Landmark:</strong> {selectedOrder.delivery_details?.landmark}</p>}
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>Order Summary</h4>
                <p><strong>Time:</strong> {formatTime(selectedOrder.created_at)}</p>
                <p><strong>Status:</strong> <span className={`order-badge ${selectedOrder.order_status}`} style={{ display: 'inline-block', fontSize: '0.75rem' }}>{selectedOrder.order_status.replace('_', ' ').toUpperCase()}</span></p>
                <p><strong>Total:</strong> <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(selectedOrder.grand_total)}</span></p>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>Items</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {(selectedOrder.items || []).map((item, idx) => (
                  <li key={idx} style={{ padding: '0.75rem 1rem', borderBottom: idx !== selectedOrder.items.length - 1 ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                    <span><span style={{ fontWeight: 'bold', color: '#f97316', marginRight: '0.5rem' }}>{item.quantity}x</span> {item.name} {item.variant ? `(${item.variant})` : ''}</span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency((item.price || 0) * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
              {selectedOrder.order_status === 'pending' && (
                <button 
                  className="btn-action prepare" 
                  style={{ width: 'auto', padding: '0.75rem 1.5rem', backgroundColor: '#16a34a', color: 'white' }}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                >
                  <Check size={16} /> Approve Order
                </button>
              )}
              {selectedOrder.order_status === 'confirmed' && (
                <button 
                  className="btn-action prepare" 
                  style={{ width: 'auto', padding: '0.75rem 1.5rem', backgroundColor: '#2E7D32', color: 'white' }}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                >
                  <ChefHat size={16} /> Prepare Order
                </button>
              )}
              {selectedOrder.order_status === 'preparing' && !selectedOrder.delivery_boy_id && (
                <button 
                  className="btn-action ready" 
                  style={{ width: 'auto', padding: '0.75rem 1.5rem', backgroundColor: '#0284c7', color: 'white' }}
                  onClick={() => {
                    const ord = selectedOrder;
                    closeModal();
                    openAssignModal(ord);
                  }}
                >
                  <Truck size={16} /> Mark as Ready & Assign
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-Place Assign Delivery Partner Modal */}
      {assignModalOrder && (
        <div className="logout-modal-overlay" onClick={closeAssignModal} style={{ zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: '1.5rem', margin: 'auto', borderRadius: '16px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.8rem', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', wordBreak: 'break-word' }}>Assign Delivery Partner</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b', wordBreak: 'break-word', lineHeight: '1.4' }}>
                  Order #{assignModalOrder.id.substring(0, 6).toUpperCase()} • Drop: {assignModalOrder.delivery_details?.address || 'Customer Location'}
                </p>
              </div>
              <button className="modal-close-btn" onClick={closeAssignModal} aria-label="Close modal" style={{ flexShrink: 0, marginTop: '2px' }}>
                <X size={18} />
              </button>
            </div>

            {loadingBoys ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                <p>Loading available delivery personnel...</p>
              </div>
            ) : availableBoys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <Truck size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
                <h4 style={{ color: '#1e293b', marginBottom: '6px' }}>No Delivery Partners Currently Available</h4>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '14px', lineHeight: '1.4' }}>
                  All delivery partners are currently busy delivering other orders. As soon as a delivery is completed via OTP, they will appear here.
                </p>
                <button 
                  onClick={closeAssignModal}
                  style={{ padding: '8px 18px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableBoys.map((boy) => {
                  const boyName = boy.name && boy.name !== 'User' ? boy.name : boy.email?.split('@')[0];
                  return (
                    <div 
                      key={boy.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px', flex: 1 }}>
                        <div style={{ width: '38px', height: '38px', background: '#e0f2fe', color: '#0284c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={20} />
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{boyName}</h4>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', wordBreak: 'break-all' }}>{boy.email}</span>
                        </div>
                      </div>

                      <button
                        style={{
                          background: '#16a34a',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexShrink: 0
                        }}
                        disabled={isAssigningId === boy.id}
                        onClick={() => handleAssignDeliveryBoy(assignModalOrder.id, boy)}
                      >
                        <CheckCircle size={16} />
                        {isAssigningId === boy.id ? 'Assigning...' : 'Assign Order'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveOrders;

