import React from 'react';
import { X, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import './CartSidebar.css';

const CartSidebar = ({ onCheckout }) => {
  const { isCartOpen, closeCart, cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { user, setShowAuthModal } = useAuth();

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout();
    }
  };

  React.useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  return (
    <>
      <div 
        className={`cart-overlay ${isCartOpen ? 'open' : ''}`} 
        onClick={closeCart}
        aria-hidden="true"
      ></div>
      
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Your Cart</h2>
          <button className="close-cart-btn" onClick={closeCart} aria-label="Close cart">
            <X size={24} />
          </button>
        </div>
        
        <div className="cart-body">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart size={48} style={{ opacity: 0.2, margin: '0 auto 15px' }} />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-image" />
                <div className="cart-item-details">
                  <h4 className="cart-item-title">{item.name}</h4>
                  <span className="cart-item-price">₹{item.price}</span>
                  
                  <div className="cart-item-actions">
                    <div className="quantity-controls">
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease quantity">-</button>
                      <span className="qty-display">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)} aria-label="Increase quantity">+</button>
                    </div>
                    <button className="remove-btn" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span>₹{cartTotal}</span>
            </div>
            <button className="btn-primary checkout-btn" onClick={handleCheckout}>
              <span>Proceed to Order</span>
              <span className="checkout-btn-arrow">→</span>
            </button>
          </div>
        )}
      </div>

    </>
  );
};

export default CartSidebar;
