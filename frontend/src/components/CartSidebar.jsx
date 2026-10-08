import React from 'react';
import { X, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import './CartSidebar.css';

const CartSidebar = ({ onCheckout }) => {
  const { isCartOpen, closeCart, cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { user, setShowAuthModal } = useAuth();
  const [promoCode, setPromoCode] = React.useState('');
  const [discount, setDiscount] = React.useState(0);
  const handleApplyPromo = () => { if (promoCode.toUpperCase() === 'KHANA50') { setDiscount(50); toast.success('Promo code KHANA50 applied!'); } else if (promoCode.trim() !== '') { setDiscount(0); toast.error('Invalid promo code'); } };

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout();
    }
  };

    React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCartOpen) {
        closeCart();
      }
    };
    if (isCartOpen) {
      document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = ''; document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = ''; document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, closeCart]);

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
            <div className="empty-state-container">
              <ShoppingCart className="empty-state-icon" />
              <h3 className="empty-state-title">Hungry?</h3>
              <p className="empty-state-text">Your cart is feeling a little light. Add some delicious items to get started!</p>
              <button className="btn-primary" onClick={closeCart}>Browse Menu</button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-image" />
                <div className="cart-item-details">
                  <h4 className="cart-item-title">{item.name}</h4>
                  <span className="cart-item-price">â‚¹{item.price}</span>
                  
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
            <div className="promo-code-container" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Promo Code (e.g. KHANA50)" style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', textTransform: 'uppercase' }} />
              <button onClick={handleApplyPromo} style={{ padding: '8px 16px', background: 'var(--bg-subtle)', color: 'var(--text-dark)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Apply</button>
            </div>
            {discount > 0 && (
              <div className="cart-discount" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-brand)', fontWeight: 'bold', marginBottom: '8px', fontSize: '1.1rem' }}>
                <span>Discount:</span>
                <span>-?{discount}</span>
              </div>
            )}
            <div className="cart-total">
              <span>Total:</span>
              <span>â‚¹{Math.max(0, cartTotal - discount)}</span>
            </div>
            <button className="btn-primary checkout-btn" onClick={handleCheckout}>
              <span>Proceed to Order</span>
              <span className="checkout-btn-arrow">â†’</span>
            </button>
          </div>
        )}
      </div>

    </>
  );
};

export default CartSidebar;


