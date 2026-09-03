import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Printer, 
  ArrowLeft, 
  Package, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Receipt,
  Sparkles
} from 'lucide-react';
import './PaymentSuccess.css';

const PaymentSuccess = ({ order, onViewChange }) => {
  const [animationStep, setAnimationStep] = useState(1); // 1: Initial celebration, 2: Full details view

  useEffect(() => {
    window.scrollTo(0, 0);
    // Smooth micro-transition from checkmark focus to full receipt presentation
    const timer = setTimeout(() => {
      setAnimationStep(2);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!order) {
    return (
      <div className="payment-success-fallback">
        <p>No recent order found.</p>
        <button className="btn-primary" onClick={() => onViewChange('home')}>
          Return to Home
        </button>
      </div>
    );
  }

  const details = order.delivery_details || order.deliveryDetails || {};
  const orderDate = new Date(order.created_at || order.createdAt || Date.now());
  const formattedDate = orderDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = orderDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const handlePrint = () => {
    window.print();
  };

  const rawId = order.id || order._id || '';
  const shortOrderId = rawId ? rawId.replace(/-/g, '').slice(-6).toUpperCase() : 'KH-ORD';
  const subtotal = order.total_amount ?? order.totalAmount ?? 0;
  const deliveryFee = order.delivery_charge ?? order.deliveryCharge ?? 50;
  const grandTotal = order.grand_total ?? order.grandTotal ?? (subtotal + deliveryFee);
  const rzpRef = order.razorpay_payment_id || order.razorpayPaymentId || 'Pay-Verified';

  return (
    <div className="payment-success-page">
      {/* Top Banner / Celebration Animation */}
      <div className={`success-hero-card ${animationStep >= 2 ? 'expanded' : ''}`}>
        <div className="success-icon-wrapper">
          <div className="success-circle-ripple"></div>
          <div className="success-icon-badge">
            <CheckCircle2 size={56} className="success-check-svg" />
          </div>
        </div>

        <div className="success-heading-group">
          <div className="success-tag">
            <Sparkles size={14} /> <span>Official Payment Verified</span>
          </div>
          <h1 className="success-main-title">Payment Successful!</h1>
          <p className="success-subtitle">
            Your order has been confirmed and the kitchen is getting ready.
          </p>
        </div>

        <div className="quick-order-meta">
          <div className="meta-pill">
            <span className="pill-label">KhanaHub Order ID</span>
            <span className="pill-value">#{shortOrderId}</span>
          </div>
          <div className="meta-pill">
            <span className="pill-label">Razorpay Reference</span>
            <span className="pill-value">{rzpRef}</span>
          </div>
          <div className="meta-pill status-pill">
            <span className="pill-label">Payment Status</span>
            <span className="pill-badge-paid"><ShieldCheck size={14} /> PAID</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: E-Bill / Receipt */}
      <div className="receipt-and-actions-wrapper">
        <div className="ebill-container" id="printable-ebill">
          {/* Receipt Header */}
          <div className="ebill-header">
            <div className="ebill-brand-section">
              <div className="ebill-logo-row">
                <img src="https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1788190253/newlogo_sterro.png" alt="KhanaHub" className="ebill-logo" />
                <span className="ebill-brand-name italic-brand">KhanaHub</span>
              </div>
              <span className="ebill-tagline">Authentic Food & Fast Delivery</span>
            </div>

            <div className="ebill-invoice-meta">
              <div className="invoice-title-row">
                <Receipt size={18} />
                <h3>TAX INVOICE / E-RECEIPT</h3>
              </div>
              <p className="invoice-meta-item"><strong>Date:</strong> {formattedDate}</p>
              <p className="invoice-meta-item"><strong>Time:</strong> {formattedTime}</p>
              <p className="invoice-meta-item"><strong>Method:</strong> Razorpay (Test Mode)</p>
            </div>
          </div>

          <div className="ebill-divider" />

          {/* Customer & Delivery Section */}
          <div className="ebill-customer-grid">
            <div className="customer-col">
              <h4><User size={15} /> Customer Details</h4>
              <p className="customer-name">{details.name || details.fullName || 'Valued Customer'}</p>
              {details.email && <p className="customer-detail"><Mail size={13} /> {details.email}</p>}
              {(details.phoneNumber || details.contactNumber) && (
                <p className="customer-detail"><Phone size={13} /> {details.phoneNumber || details.contactNumber}</p>
              )}
            </div>

            <div className="customer-col">
              <h4><MapPin size={15} /> Delivery Address</h4>
              <p className="delivery-address-text">{details.address || 'Address on file'}</p>
              {details.city && <p className="delivery-city-text">{details.city}</p>}
              <div className="delivery-eta-badge">
                <Clock size={13} /> Estimated Delivery: 30-40 mins
              </div>
            </div>
          </div>

          <div className="ebill-divider" />

          {/* Items Table */}
          <div className="ebill-items-section">
            <h4>Ordered Items</h4>
            <table className="ebill-table">
              <thead>
                <tr>
                  <th className="th-item">Item Description</th>
                  <th className="th-qty">Qty</th>
                  <th className="th-rate">Unit Price</th>
                  <th className="th-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="td-item">
                      <span className="item-title">{item.name}</span>
                    </td>
                    <td className="td-qty">{item.quantity}</td>
                    <td className="td-rate">₹{item.price}</td>
                    <td className="td-total">₹{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary Breakdown */}
          <div className="ebill-summary-section">
            <div className="summary-col-empty">
              <div className="ebill-note-box">
                <span className="note-title">Thank you for dining with KhanaHub!</span>
                <p>This is a computer-generated invoice. Your payment has been verified via Razorpay.</p>
              </div>
            </div>
            
            <div className="summary-col-totals">
              <div className="totals-line">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="totals-line">
                <span>Delivery Charge</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="totals-line total-highlight">
                <span>Grand Total Paid</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="ebill-footer">
            <span>Payment Gateway: Razorpay Test Mode</span>
            <span>Transaction ID: {rzpRef}</span>
            <span>Order Status: CONFIRMED</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="success-action-bar hide-on-print">
          <button className="action-btn btn-print" onClick={handlePrint}>
            <Printer size={18} />
            <span>Print / Save E-Bill</span>
          </button>
          
          <button className="action-btn btn-orders" onClick={() => onViewChange('my-orders')}>
            <Package size={18} />
            <span>View My Orders</span>
          </button>
          
          <button className="action-btn btn-home" onClick={() => onViewChange('home')}>
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
