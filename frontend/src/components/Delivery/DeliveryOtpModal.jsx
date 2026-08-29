import React, { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../api/supabase';
import { broadcastOrderUpdate } from '../../api/realtimeHub';
import { toast } from 'react-hot-toast';
import IOSSpinner from '../IOSSpinner';
import './DeliveryOtpModal.css';

const DeliveryOtpModal = ({ order, isOpen, onClose, onSuccess }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setCountdown(60);
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen || !order) return null;

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    // Handle multi-character paste
    if (value.length > 1) {
      const pastedDigits = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedDigits[i] || '';
      }
      setOtp(newOtp);
      const nextIdx = Math.min(pastedDigits.length, 5);
      if (inputRefs.current[nextIdx]) {
        inputRefs.current[nextIdx].focus();
      }
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    // Auto advance to next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    try {
      // 1. Fetch fresh order from Supabase
      const { data: freshOrder, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();

      if (fetchErr || !freshOrder) {
        throw new Error('Order not found');
      }

      if (freshOrder.order_status === 'delivered') {
        toast.success('Order is already marked as delivered!');
        if (onSuccess) onSuccess(freshOrder);
        onClose();
        return;
      }

      // Check OTP match
      const storedOtp = freshOrder.delivery_otp || freshOrder.delivery_details?.delivery_otp;
      const expiresAt = freshOrder.otp_expires_at || freshOrder.delivery_details?.otp_expires_at;

      if (expiresAt && new Date(expiresAt) < new Date()) {
        throw new Error('OTP has expired. Please click Resend OTP.');
      }

      if (!storedOtp || storedOtp.toString() !== enteredOtp.toString()) {
        throw new Error('Invalid OTP. Please check with customer.');
      }

      // 2. Mark order as Delivered and clear OTP inside delivery_details
      const updatedDetails = {
        ...(freshOrder.delivery_details || {}),
        delivery_otp: null,
        delivered_at: new Date().toISOString()
      };

      const { data: updatedOrder, error: updateErr } = await supabase
        .from('orders')
        .update({
          order_status: 'delivered',
          delivery_details: updatedDetails
        })
        .eq('id', order.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Broadcast real-time delivery completion
      const trackingChannel = supabase.channel(`order_tracking_${order.id}`);
      await trackingChannel.send({
        type: 'broadcast',
        event: 'order_delivered',
        payload: { orderId: order.id, status: 'delivered' }
      });

      // Central global broadcast for instant sync
      await broadcastOrderUpdate('order_status_changed', {
        orderId: order.id,
        status: 'delivered'
      });

      toast.success('OTP verified! Order marked as Delivered');
      if (onSuccess) onSuccess(updatedOrder || freshOrder);
      onClose();

    } catch (err) {
      console.error('OTP verification error:', err);
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    try {
      // Generate new 6-digit OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const updatedDetails = {
        ...(order.delivery_details || {}),
        delivery_otp: newOtp,
        otp_expires_at: expiresAt
      };

      await supabase
        .from('orders')
        .update({
          delivery_details: updatedDetails
        })
        .eq('id', order.id);

      // Broadcast OTP update
      await broadcastOrderUpdate('order_status_changed', {
        orderId: order.id,
        status: 'otp_requested',
        otp: newOtp
      });

      setCountdown(60);
      toast.success(`New OTP sent to ${order.delivery_details?.email || 'customer'}`);
    } catch (err) {
      toast.error('Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="delivery-otp-overlay" onClick={onClose}>
      <div className="delivery-otp-container" onClick={e => e.stopPropagation()}>
        <button className="otp-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="otp-icon-header">
          <ShieldCheck size={32} />
        </div>

        <h3 className="otp-title">Customer Delivery OTP</h3>
        <p className="otp-subtitle">
          Ask customer <strong>{order.delivery_details?.name || order.delivery_details?.fullName || 'Customer'}</strong> for the 6-digit delivery confirmation code sent to their email.
        </p>

        <form onSubmit={handleVerify}>
          <div className="otp-boxes-wrapper">
            {[0, 1, 2, 3, 4, 5].map(index => (
              <input
                key={index}
                ref={el => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp[index]}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className="otp-digit-box"
                autoComplete="one-time-code"
                disabled={isVerifying}
              />
            ))}
          </div>

          <button 
            type="submit" 
            className="otp-verify-submit-btn" 
            disabled={isVerifying || otp.join('').length !== 6}
          >
            {isVerifying ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <IOSSpinner size={18} color="white" /> Verifying OTP...
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={20} /> Confirm Delivery
              </span>
            )}
          </button>
        </form>

        <div className="otp-footer-actions">
          <span>Didn't receive code?</span>
          <button 
            type="button" 
            className="otp-resend-btn" 
            onClick={handleResendOtp}
            disabled={countdown > 0 || isResending}
          >
            {isResending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryOtpModal;
