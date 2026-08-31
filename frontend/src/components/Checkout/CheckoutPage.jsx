import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, MapPin, Navigation, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import LocationPickerMap from './LocationPickerMap';
import './Checkout.css';
import { toast } from 'react-hot-toast';
import { supabase } from '../../api/supabase';
import { broadcastOrderUpdate } from '../../api/realtimeHub';

const CheckoutPage = ({ onBack, onPaymentSuccess, onViewChange }) => {
  const { cartItems, cartTotal, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('khanahub_billing_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      } catch (e) {}
    }
    return {
      name: user?.name || '',
      email: user?.email || '',
      phoneCode: '+91',
      phoneNumber: '',
      city: '',
      address: ''
    };
  });

  const [location, setLocation] = useState({ lat: 27.7172, lon: 85.3240 }); // Default KTM
  const [isLocating, setIsLocating] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);

  const phoneOptions = [
    { code: '+91', flag: '🇮🇳', label: 'India (+91)' },
    { code: '+977', flag: '🇳🇵', label: 'Nepal (+977)' },
    { code: '+1', flag: '🇺🇸', label: 'USA (+1)' },
    { code: '+44', flag: '🇬🇧', label: 'UK (+44)' },
    { code: '+61', flag: '🇦🇺', label: 'Australia (+61)' },
  ];
  const selectedPhone = phoneOptions.find(opt => opt.code === formData.phoneCode) || phoneOptions[0];

  // Sync internal view properly (clearing legacy modal pathing)
  useEffect(() => {
    if (onViewChange && window.location.pathname === '/payment') {
      // Convert /payment to generic /checkout, as the old payment modal is removed
      onViewChange('checkout');
    }
  }, [onViewChange]);

  // Persist billing form data
  useEffect(() => {
    sessionStorage.setItem('khanahub_billing_form', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    // Scroll to top when mounting
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            setFormData(prev => ({
              ...prev,
              city: data.address?.city || data.address?.town || prev.city,
              address: data.display_name || prev.address
            }));
          }
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        }
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        toast.error('Could not get your location');
        setIsLocating(false);
      }
    );
  };

  const deliveryCharge = 50;
  const grandTotal = cartTotal + deliveryCharge;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.id = 'razorpay-checkout-js';
      
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      
      document.body.appendChild(script);
    });
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();

    if (!cartItems || cartItems.length === 0) {
      toast.error('Your cart is empty. Please add items before proceeding.');
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.phoneNumber.trim() || !formData.city.trim() || !formData.address.trim()) {
      toast.error('Please fill in all delivery details before proceeding.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // 1. Load Razorpay SDK
      const resScript = await loadRazorpayScript();
      if (!resScript) {
        throw new Error('Razorpay SDK failed to load. Please check your connection.');
      }

      // 2. Initialize Razorpay Order via Supabase Edge Function
      const { data: orderData, error } = await supabase.functions.invoke('razorpay', {
        body: { action: 'create-order', items: cartItems }
      });

      if (error || !orderData) {
        throw new Error(error?.message || 'Failed to create order on server');
      }

      const userEmail = formData.email?.trim() || 'test@khanahub.com';
      const rawContact = formData.phoneNumber || '9999999999';
      const userContact = (formData.phoneCode || '+91') + rawContact.replace(/\s+/g, '');

      const prefillConfig = {
        name: formData.name,
        email: userEmail,
        contact: userContact
      };

      // Resolve Logo URL securely to bypass localhost mixed-content restrictions in Razorpay's HTTPS iframe
      let finalLogoImage = undefined;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
          // Fetch local image and convert to Base64 Data URI
          const logoRes = await fetch('https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1/khanahub/logo/newlogo.png');
          if (logoRes.ok) {
            const logoBlob = await logoRes.blob();
            finalLogoImage = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(logoBlob);
            });
          }
        } catch (e) {
          console.warn("Could not load local logo for Razorpay Base64 conversion:", e);
        }
      } else {
        // In production, an absolute HTTPS URL is perfectly safe
        finalLogoImage = window.location.origin + 'https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1/khanahub/logo/newlogo.png';
      }

      // 3. Initialize official Razorpay Checkout
      const options = {
        key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID, // fallback to env
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'KhanaHub',
        description: 'Order Payment',
        ...(finalLogoImage && { image: finalLogoImage }),
        order_id: orderData.id,
        prefill: prefillConfig,
        theme: {
          color: '#16a34a' // KhanaHub Primary Green Theme for Razorpay iFrame
        },
        handler: async function (response) {
          try {
            // 4. Verify Payment on Backend via Supabase Edge Function
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay', {
              body: {
                action: 'verify',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderDetails: {
                  items: cartItems,
                  totalAmount: cartTotal,
                  deliveryCharge: deliveryCharge,
                  grandTotal: grandTotal,
                  deliveryDetails: {
                    ...formData,
                    lat: location.lat,
                    lng: location.lon
                  }
                }
              }
            });
            
            if (verifyData && verifyData.success) {
              clearCart();
              setIsProcessingPayment(false);

              // Broadcast real-time order creation event to Owner & Customers instantly
              await broadcastOrderUpdate('order_status_changed', {
                orderId: verifyData.order?.id,
                status: 'pending',
                order: verifyData.order
              });

              toast.success(`Payment of ₹${grandTotal.toFixed(2)} has been successfully done!`, { duration: 3000 });
              if (onPaymentSuccess) {
                onPaymentSuccess(verifyData.order);
              }
            } else {
              throw new Error(verifyData?.message || verifyError?.message || 'Payment verification failed');
            }
          } catch (verifyErr) {
            setIsProcessingPayment(false);
            const errMsg = verifyErr.message || 'Verification failed';
            toast.error(`Payment failed: ${errMsg}`);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
            toast('Payment was cancelled. Your cart is still saved.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        setIsProcessingPayment(false);
        toast.error(`Payment failed: ${response.error.description || 'Unknown error'}`);
      });

      rzp.open();
      
    } catch (err) {
      setIsProcessingPayment(false);
      const errMsg = err.response?.data?.message || err.message || 'Payment initialization failed. Please try again.';
      toast.error(errMsg);
    }
  };

  return (
    <div className="checkout-container">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={20} /> Back to Menu
      </button>

      <div className="checkout-content">
        {/* Left Side - Details Form */}
        <div className="checkout-form-section">
          <div className="checkout-section-header">
            <h2 className="checkout-title">Delivery Details</h2>
          </div>

          <form className="checkout-form" onSubmit={handleProceedToPayment}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>Contact Number</label>
              <div className="phone-input" style={{ display: 'flex', position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex' }}>
                  <button 
                    type="button"
                    onClick={() => setIsPhoneDropdownOpen(!isPhoneDropdownOpen)}
                    style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--border-light)', borderRight: 'none', padding: '0 16px', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '48px', fontSize: '18px', outline: 'none' }}
                  >
                    {selectedPhone.flag}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▼</span>
                  </button>
                  
                  {isPhoneDropdownOpen && (
                    <>
                      <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} 
                        onClick={() => setIsPhoneDropdownOpen(false)}
                      />
                      <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #e5e7eb', zIndex: 10, borderRadius: '6px', overflow: 'hidden', width: 'max-content', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: '4px' }}>
                        {phoneOptions.map(opt => (
                          <div 
                            key={opt.code}
                            style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #f3f4f6', background: formData.phoneCode === opt.code ? '#f0fdf4' : 'white' }}
                            onClick={() => {
                              setFormData({...formData, phoneCode: opt.code});
                              setIsPhoneDropdownOpen(false);
                            }}
                          >
                            <span style={{ fontSize: '18px' }}>{opt.flag}</span>
                            <span style={{ fontSize: '14px', color: '#374151' }}>{opt.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required placeholder="Enter phone number" style={{ flex: 1, borderRadius: '0 var(--radius-md) var(--radius-md) 0' }} />
              </div>
            </div>

            <div className="location-section">
              <div className="location-header">
                <h3><MapPin size={18} /> Delivery Location</h3>
                <button type="button" className="get-location-btn" onClick={handleGetLocation} disabled={isLocating}>
                  <Navigation size={16} /> Use My Current Location
                </button>
              </div>
              
              <LocationPickerMap 
                lat={location.lat} 
                lon={location.lon} 
                onLocationChange={(locData) => {
                  setLocation({ lat: locData.lat, lon: locData.lon });
                  if (locData.address) {
                    setFormData(prev => ({
                      ...prev,
                      address: locData.address,
                      city: locData.city || prev.city
                    }));
                  }
                }}
              />
              
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                </div>
              </div>
              
              <div className="form-group">
                <label>Full Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} required rows={3}></textarea>
              </div>
            </div>

            <button type="submit" className="submit-checkout-btn" disabled={cartItems.length === 0 || isProcessingPayment}>
              <span className="btn-pay-content">
                {isProcessingPayment ? <Loader2 size={18} className="spinner-inline" /> : <CreditCard size={18} />} 
                {isProcessingPayment ? 'Initializing...' : `Proceed to Pay ₹${grandTotal}`}
              </span>
            </button>

            <div className="checkout-trust-badge">
              <ShieldCheck size={16} className="trust-icon" />
              <span>Secured by Razorpay • UPI • Cards • Wallets • Netbanking</span>
            </div>
          </form>
        </div>

        {/* Right Side - Order Summary */}
        <div className="checkout-summary-section">
          <h2 className="checkout-title">Order Summary</h2>
          <div className="summary-items">
            {cartItems.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              cartItems.map(item => (
                <div key={item.id} className="summary-item">
                  <div className="summary-item-info">
                    <span className="summary-item-name">{item.name}</span>
                    <div className="summary-qty-controls">
                      <button type="button" onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                  <span className="summary-item-price">₹{item.price * item.quantity}</span>
                </div>
              ))
            )}
          </div>
          
          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{cartTotal}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Charge</span>
              <span>₹{deliveryCharge}</span>
            </div>
            <div className="summary-row grand-total">
              <span>Grand Total</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
