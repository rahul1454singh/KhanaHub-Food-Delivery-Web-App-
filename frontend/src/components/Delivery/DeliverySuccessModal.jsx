import React from 'react';
import { CheckCircle2, Package, MapPin } from 'lucide-react';
import './DeliverySuccessModal.css';

const DeliverySuccessModal = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  return (
    <div className="delivery-success-overlay">
      <div className="delivery-success-card">
        <div className="success-badge-icon-wrap">
          <CheckCircle2 size={52} strokeWidth={2.5} />
        </div>

        <h3 className="delivery-success-title">Order Delivered Successfully!</h3>
        <p className="delivery-success-msg">
          Delivery confirmed via customer OTP. The order has been archived to history.
        </p>

        <div className="delivery-success-details">
          <div className="success-detail-row">
            <span>Order ID</span>
            <strong>#{order.id?.substring(0, 8).toUpperCase()}</strong>
          </div>
          <div className="success-detail-row">
            <span>Customer</span>
            <span>{order.delivery_details?.name || order.delivery_details?.fullName || 'Customer'}</span>
          </div>
          <div className="success-detail-row">
            <span>Items Count</span>
            <span>{order.items?.length || 0} items</span>
          </div>
          <div className="success-detail-row">
            <span>Total Collected</span>
            <span>₹{order.grand_total || order.total_amount || 0}</span>
          </div>
        </div>

        <button className="success-done-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

export default DeliverySuccessModal;
