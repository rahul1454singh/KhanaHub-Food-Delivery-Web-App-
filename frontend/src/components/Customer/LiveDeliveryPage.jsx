import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import { getGlobalRealtimeChannel } from '../../api/realtimeHub';
import { toast } from 'react-hot-toast';
import { 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  ShieldAlert, 
  Clock, 
  Receipt, 
  Navigation,
  CheckCircle2
} from 'lucide-react';
import LiveTrackingMap from '../Delivery/LiveTrackingMap';
import IOSSpinner from '../IOSSpinner';
import './LiveDeliveryPage.css';

const LiveDeliveryPage = ({ onViewChange }) => {
  const { user } = useAuth();
  const [activeOrder, setActiveOrder] = useState(null);
  const [riderInfo, setRiderInfo] = useState(null);
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActiveDelivery();

      // 1. Database table change listener
      const dbChannel = supabase
        .channel(`customer_live_delivery_db_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Customer order change:', payload);
            if (payload.new && payload.new.order_status === 'delivered') {
              toast.success('Your order has been delivered! Enjoy your meal 🍕', { duration: 6000 });
              if (onViewChange) onViewChange('order-history');
            } else {
              fetchActiveDelivery();
            }
          }
        )
        .subscribe();

      // 2. Global Realtime Broadcast Listener
      const globalChannel = getGlobalRealtimeChannel();
      const handleGlobalBroadcast = (payload) => {
        if (payload?.payload?.status === 'otp_requested' && payload.payload.otp) {
          setActiveOrder(prev => {
            if (prev && prev.id === payload.payload.orderId) {
              toast.success('Your delivery partner requested OTP! Give this code to receive your food.', { duration: 7000 });
              return {
                ...prev,
                delivery_details: {
                  ...(prev.delivery_details || {}),
                  delivery_otp: payload.payload.otp
                }
              };
            }
            return prev;
          });
        }
        fetchActiveDelivery();
      };

      globalChannel.on('broadcast', { event: 'order_status_changed' }, handleGlobalBroadcast);
      globalChannel.on('broadcast', { event: 'order_updated' }, handleGlobalBroadcast);

      return () => {
        supabase.removeChannel(dbChannel);
      };
    }
  }, [user]);

  // 2. Real-time broadcast channel for live GPS movement & OTP
  useEffect(() => {
    if (!activeOrder) return;

    const trackingChannel = supabase
      .channel(`order_tracking_${activeOrder.id}`)
      .on('broadcast', { event: 'location_update' }, (payload) => {
        const { lat, lng } = payload.payload;
        if (lat && lng) {
          setDeliveryBoyLocation({ lat, lng });
        }
      })
      .on('broadcast', { event: 'otp_requested' }, (payload) => {
        const receivedOtp = payload.payload?.otp;
        if (receivedOtp) {
          setActiveOrder(prev => prev ? ({
            ...prev,
            delivery_details: {
              ...(prev.delivery_details || {}),
              delivery_otp: receivedOtp
            }
          }) : prev);
          toast.success('Your delivery partner is at your doorstep! Share this OTP code.', { duration: 7000 });
        }
      })
      .on('broadcast', { event: 'order_delivered' }, () => {
        toast.success('Your order has been delivered! Enjoy your meal 🍕', { duration: 6000 });
        if (onViewChange) onViewChange('order-history');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(trackingChannel);
    };
  }, [activeOrder?.id]);

  const fetchActiveDelivery = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('order_status', 'out_for_delivery')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const ord = data[0];
        setActiveOrder(ord);

        // Fetch rider name from users table
        if (ord.delivery_boy_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', ord.delivery_boy_id)
            .single();

          if (userData) {
            setRiderInfo(userData);
          }
        }
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Error fetching live delivery:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <IOSSpinner size={36} color="#0284c7" />
        <p style={{ color: '#64748b', fontWeight: '600' }}>Connecting to Live Delivery...</p>
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="live-delivery-container">
        <div className="live-delivery-content" style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
          <Truck size={56} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '8px' }}>No Active Deliveries Right Now</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            When a delivery partner picks up your food and marks it Out for Delivery, live tracking will appear here.
          </p>
          <button 
            onClick={() => onViewChange && onViewChange('home')}
            style={{ padding: '12px 24px', background: '#f97316', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
          >
            Explore Our Menu
          </button>
        </div>
      </div>
    );
  }

  const details = activeOrder.delivery_details || {};
  const deliveryBoyName = (riderInfo?.name && riderInfo.name !== 'User')
    ? riderInfo.name 
    : (riderInfo?.email ? riderInfo.email.split('@')[0] : (activeOrder.delivery_boy_name || 'KhanaHub Delivery Partner'));
  const deliveryBoyPhone = '+91 9876543210';

  return (
    <div className="live-delivery-container">
      <div className="live-delivery-content">
        {/* Status Banner */}
        <div className="live-status-banner">
          <div className="banner-left">
            <div className="banner-icon-pulse">
              <Truck size={28} />
            </div>
            <div className="banner-text">
              <h2>Your Food is on the Way!</h2>
              <p>Delivery partner is riding toward your location.</p>
            </div>
          </div>
          <span className="banner-order-tag">
            Order #{activeOrder.id.substring(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Live Road Navigation Map */}
        <div className="live-delivery-grid">
          <div className="live-delivery-left">
            <LiveTrackingMap
              customerLocation={details.location || { lat: details.lat, lng: details.lng }}
              customerAddress={details.address}
              deliveryBoyLocation={deliveryBoyLocation}
              isLiveTracking={true}
            />
          </div>

          <div className="live-delivery-right">
            {/* Delivery Partner Contact Card */}
            <div className="delivery-partner-card">
              <div className="partner-profile">
                <div className="partner-avatar">
                  <User size={26} />
                </div>
                <div className="partner-details">
                  <h3>{deliveryBoyName}</h3>
                  <p>KhanaHub Assigned Delivery Partner</p>
                </div>
              </div>

              <a href={`tel:${deliveryBoyPhone}`} className="partner-call-btn">
                <Phone size={18} /> Call
              </a>
            </div>

            {/* OTP Verification Notice */}
            <div className="otp-notice-box" style={{ background: '#f0fdf4', border: '2px dashed #86efac', borderRadius: '14px', padding: '16px' }}>
              <ShieldAlert size={28} className="otp-notice-icon" style={{ color: '#16a34a' }} />
              <div className="otp-notice-text" style={{ flex: 1 }}>
                <h4 style={{ color: '#14532d', fontSize: '1rem', fontWeight: '800', margin: 0 }}>Delivery OTP</h4>
                {details.delivery_otp ? (
                  <div style={{
                    marginTop: '8px',
                    display: 'inline-block',
                    background: 'white',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: '2px solid #16a34a',
                    fontSize: '1.4rem',
                    fontWeight: '900',
                    letterSpacing: '4px',
                    color: '#15803d',
                    boxShadow: '0 2px 10px rgba(22, 163, 74, 0.15)'
                  }}>
                    {details.delivery_otp}
                  </div>
                ) : (
                  <p style={{ marginTop: '4px', fontSize: '0.8rem', color: '#166534' }}>
                    Give this 6-digit OTP to your delivery partner. It will appear here when requested.
                  </p>
                )}
              </div>
            </div>

            {/* Order Breakdown */}
            <div className="live-order-summary">
              <h3>Order Summary</h3>
              <ul className="live-items-list">
                {(activeOrder.items || []).map((item, idx) => (
                  <li key={idx} className="live-item-row">
                    <span>
                      <strong>{item.quantity}x</strong> {item.name} {item.variant ? `(${item.variant})` : ''}
                    </span>
                    <span style={{ fontWeight: '600' }}>₹{(item.price || 0) * item.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="live-bill-totals">
                <span>Total Paid</span>
                <span>₹{activeOrder.grand_total || activeOrder.total_amount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDeliveryPage;
