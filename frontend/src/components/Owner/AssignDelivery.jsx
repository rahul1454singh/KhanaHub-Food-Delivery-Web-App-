import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { getGlobalRealtimeChannel, broadcastOrderUpdate } from '../../api/realtimeHub';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  Phone, 
  User, 
  CheckCircle, 
  Navigation, 
  ArrowLeft, 
  Truck, 
  Search, 
  CheckCircle2, 
  Clock, 
  Package,
  Activity,
  AlertCircle
} from 'lucide-react';
import IOSSpinner from '../IOSSpinner';
import './AssignDelivery.css';

const AssignDelivery = ({ orderId, onBack }) => {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [activeOrdersMap, setActiveOrdersMap] = useState({});
  const [completedCountMap, setCompletedCountMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFleetData();

    if (orderId) {
      fetchOrderDetails();
    }

    // 1. Postgres realtime subscription on orders & users
    const ordersChannel = supabase
      .channel('owner_fleet_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchFleetData();
        }
      )
      .subscribe();

    // 2. Global Realtime Broadcast listener
    const globalChannel = getGlobalRealtimeChannel();
    const handleBroadcast = () => {
      fetchFleetData();
    };

    globalChannel.on('broadcast', { event: 'order_status_changed' }, handleBroadcast);
    globalChannel.on('broadcast', { event: 'order_updated' }, handleBroadcast);

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [orderId]);

  const fetchFleetData = async () => {
    try {
      // 1. Fetch delivery users
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*');

      if (usersErr) throw usersErr;

      const boys = (usersData || []).filter(u => u.role === 'delivery' || (u.email && u.email.startsWith('db')));
      setDeliveryBoys(boys);

      // 2. Fetch all non-delivered active orders to determine busy/free status
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, delivery_boy_id, order_status, delivery_details, grand_total, total_amount, created_at');

      if (ordersErr) throw ordersErr;

      const activeMap = {};
      const completedMap = {};

      (ordersData || []).forEach(ord => {
        if (!ord.delivery_boy_id) return;

        if (ord.order_status === 'delivered') {
          completedMap[ord.delivery_boy_id] = (completedMap[ord.delivery_boy_id] || 0) + 1;
        } else if (ord.order_status !== 'cancelled') {
          // Rider has an active delivery underway
          activeMap[ord.delivery_boy_id] = ord;
        }
      });

      setActiveOrdersMap(activeMap);
      setCompletedCountMap(completedMap);

    } catch (err) {
      console.error('Error fetching fleet status:', err);
      toast.error('Failed to load delivery personnel');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (error) throw error;
      setOrderDetails(data);
    } catch (err) {
      console.error('Error fetching order details:', err);
    }
  };

  const assignOrder = async (boy) => {
    if (!orderId) {
      toast.error('No order selected to assign');
      return;
    }
    
    setAssigningId(boy.id);
    try {
      const boyName = boy.name && boy.name !== 'User' ? boy.name : boy.email?.split('@')[0];
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_boy_id: boy.id
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Broadcast instant assignment
      await broadcastOrderUpdate('order_status_changed', {
        orderId,
        deliveryBoyId: boy.id,
        boyName,
        status: 'assigned'
      });

      toast.success(`Order #${orderId.substring(0, 6).toUpperCase()} assigned to ${boyName}`);
      if (onBack) onBack();
      
    } catch (err) {
      console.error('Error assigning order:', err);
      toast.error('Failed to assign order');
    } finally {
      setAssigningId(null);
    }
  };

  const filteredBoys = deliveryBoys.filter(b => {
    const name = (b.name || '').toLowerCase();
    const email = (b.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch = name.includes(term) || email.includes(term);

    // When assigning an order, ONLY show available / free delivery partners!
    if (orderId) {
      return matchesSearch && !activeOrdersMap[b.id];
    }
    return matchesSearch;
  });

  const totalRiders = deliveryBoys.length;
  const busyCount = Object.keys(activeOrdersMap).length;
  const availableCount = Math.max(0, totalRiders - busyCount);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px' }}>
        <IOSSpinner size={36} color="#0284c7" />
        <p style={{ color: '#64748b', fontWeight: '600' }}>Loading delivery fleet live status...</p>
      </div>
    );
  }

  return (
    <div className="assign-delivery-container">
      {/* Header */}
      <div className="assign-header">
        {orderId && onBack && (
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Back to Active Orders
          </button>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2>{orderId ? 'Assign Delivery Partner' : 'Delivery Fleet & Partners'}</h2>
            <p className="order-context" style={{ margin: '4px 0 0 0' }}>
              {orderId && orderDetails ? (
                <>Assigning Order <strong>#{orderDetails.id.substring(0, 6).toUpperCase()}</strong> • Drop: <strong>{orderDetails.delivery_details?.address || 'Customer Location'}</strong></>
              ) : (
                <>Live overview of all registered delivery personnel and real-time availability status.</>
              )}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
              <Truck size={16} color="#64748b" />
              <span>Total Fleet: <strong>{totalRiders}</strong></span>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: '600' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <span>Available: <strong>{availableCount}</strong></span>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: '600' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              <span>On Delivery: <strong>{busyCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Search Filter */}
        <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <Search size={18} color="#64748b" style={{ marginRight: '0.6rem' }} />
          <input 
            type="text" 
            placeholder={orderId ? "Filter available partners..." : "Search delivery partner by name or email..."} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.92rem' }}
          />
        </div>
      </div>

      {/* Grid of Delivery Riders */}
      {filteredBoys.length === 0 ? (
        <div className="no-delivery-boys" style={{ padding: '60px 20px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <Truck size={48} className="empty-icon" style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '6px' }}>
            {orderId ? 'No Delivery Partners Currently Available' : 'No Delivery Partners Found'}
          </h3>
          <p style={{ color: '#64748b', maxWidth: '480px', margin: '0 auto', lineHeight: '1.5' }}>
            {orderId
              ? 'All registered delivery partners are currently busy delivering other orders. As soon as an active order is delivered via OTP, they will appear here.'
              : searchTerm 
                ? 'No riders match your search query.' 
                : 'Create a delivery account on the signup page (Email starting with db, e.g. db1@gmail.com).'}
          </p>
        </div>
      ) : (
        <div className="delivery-boys-grid">
          {filteredBoys.map((boy) => {
            const displayName = boy.name && boy.name !== 'User' ? boy.name : boy.email?.split('@')[0];
            const displayEmail = boy.email;
            const activeOrder = activeOrdersMap[boy.id];
            const completedCount = completedCountMap[boy.id] || 0;
            const isBusy = !!activeOrder;

            return (
              <div 
                key={boy.id} 
                className="delivery-boy-card"
                style={{
                  border: isBusy ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                  boxShadow: isBusy ? '0 4px 14px rgba(249, 115, 22, 0.08)' : '0 4px 14px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* Avatar with Status Indicator */}
                <div style={{ position: 'relative', margin: '0 auto 12px' }}>
                  <div className="dboy-avatar" style={{ background: isBusy ? '#fff7ed' : '#e0f2fe', color: isBusy ? '#ea580c' : '#0284c7' }}>
                    <User size={34} />
                  </div>
                  <span 
                    style={{
                      position: 'absolute',
                      bottom: '15px',
                      right: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: isBusy ? '#f59e0b' : '#22c55e',
                      border: '2px solid white',
                      boxShadow: isBusy ? '0 0 6px #f59e0b' : '0 0 6px #22c55e'
                    }} 
                    title={isBusy ? 'Busy on Active Delivery' : 'Available for Delivery'}
                  />
                </div>

                <div className="dboy-info" style={{ width: '100%' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: '#0f172a' }}>{displayName}</h4>
                  <div className="dboy-contact" style={{ marginBottom: '12px' }}>
                    <span className="contact-item" style={{ fontSize: '0.82rem', color: '#64748b' }}>{displayEmail}</span>
                  </div>

                  {/* Real-time Status Badge */}
                  <div style={{ marginBottom: '14px' }}>
                    {isBusy ? (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#fff7ed',
                        color: '#c2410c',
                        border: '1px solid #fed7aa',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: '700'
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ea580c' }} />
                        <span>Busy (Order #{activeOrder.id.substring(0, 6).toUpperCase()})</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: '700'
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                        <span>Available for Deliveries</span>
                      </div>
                    )}
                  </div>

                  {/* Rider Performance Stats */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    padding: '10px',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-around',
                    marginBottom: orderId ? '16px' : '4px',
                    fontSize: '0.84rem'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Active</span>
                      <strong style={{ color: isBusy ? '#ea580c' : '#0f172a' }}>{isBusy ? '1 Order' : '0'}</strong>
                    </div>
                    <div style={{ borderLeft: '1px solid #e2e8f0', height: '24px', margin: 'auto 0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Delivered</span>
                      <strong style={{ color: '#16a34a' }}>{completedCount} orders</strong>
                    </div>
                  </div>

                  {/* If Busy, show active delivery details preview */}
                  {isBusy && (
                    <div style={{ textAlign: 'left', background: '#fffbeb', border: '1px solid #fef3c7', padding: '8px 10px', borderRadius: '8px', marginTop: '10px', fontSize: '0.8rem', color: '#92400e' }}>
                      <div style={{ fontWeight: '700', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Navigation size={12} /> {activeOrder.order_status.replace('_', ' ').toUpperCase()}
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Drop: {activeOrder.delivery_details?.address || 'Customer Address'}
                      </div>
                    </div>
                  )}
                </div>

                {/* If assigning a specific order, show action button */}
                {orderId && (
                  <button 
                    className="assign-btn" 
                    onClick={() => assignOrder(boy)}
                    disabled={assigningId === boy.id}
                    style={{
                      marginTop: 'auto',
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {assigningId === boy.id ? (
                      <>
                        <IOSSpinner size={16} color="white" /> Assigning...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} /> Assign Order
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignDelivery;
