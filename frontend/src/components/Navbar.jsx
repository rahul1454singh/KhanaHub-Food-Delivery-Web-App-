import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, User, LogOut, X, Home, UtensilsCrossed, Info, Package, History, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../api/supabase';
import { getGlobalRealtimeChannel } from '../api/realtimeHub';
import { toast } from 'react-hot-toast';
import IOSSpinner from './IOSSpinner';
import './Navbar.css';

const Navbar = ({ view, onViewChange }) => {
  const { cartCount, openCart, clearCart } = useCart();
  const { user, logout, setShowAuthModal, setGlobalLoading } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasActiveDelivery, setHasActiveDelivery] = useState(false);

  // Check if customer has an order Out for Delivery
  useEffect(() => {
    if (!user || user.role === 'owner' || user.role === 'delivery' || user.email?.startsWith('db')) {
      setHasActiveDelivery(false);
      return;
    }

    const checkActiveDelivery = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user.id)
          .eq('order_status', 'out_for_delivery')
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasActiveDelivery(true);
        } else {
          setHasActiveDelivery(false);
        }
      } catch (e) {
        console.error('Error checking active delivery:', e);
      }
    };

    checkActiveDelivery();

    // 1. Postgres Database Changes
    const channel = supabase
      .channel(`navbar_delivery_status_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          checkActiveDelivery();
        }
      )
      .subscribe();

    // 2. Global Realtime Broadcast
    const globalChannel = getGlobalRealtimeChannel();
    const handleBroadcast = () => {
      checkActiveDelivery();
    };

    globalChannel.on('broadcast', { event: 'order_status_changed' }, handleBroadcast);
    globalChannel.on('broadcast', { event: 'order_updated' }, handleBroadcast);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getDisplayName = (u) => {
    if (!u) return '';
    if (u.name) return u.name;
    if (u.user_metadata?.full_name) return u.user_metadata.full_name;
    if (u.email) {
      const nameBeforeAt = u.email.split('@')[0];
      const nameWithoutNumbers = nameBeforeAt.replace(/[0-9]/g, '');
      if (nameWithoutNumbers) {
        return nameWithoutNumbers.charAt(0).toUpperCase() + nameWithoutNumbers.slice(1);
      }
      return nameBeforeAt; // Fallback if it was entirely numbers
    }
    return 'User';
  };

  // Track active section as user scrolls when on home page
  useEffect(() => {
    if (view !== 'home') {
      setActiveSection(view);
      return;
    }

    const handleScroll = () => {
      const scrollPos = window.scrollY + 180;
      const aboutEl = document.getElementById('about');
      const menuEl = document.getElementById('menu');

      let currentSec = 'home';
      if (aboutEl && scrollPos >= aboutEl.offsetTop) {
        currentSec = 'about';
      } else if (menuEl && scrollPos >= menuEl.offsetTop) {
        currentSec = 'menu';
      }
      setActiveSection(currentSec);
      sessionStorage.setItem('last_active_section', currentSec);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [view]);

  const handleNavigate = (target) => {
    setIsMobileMenuOpen(false);
    sessionStorage.setItem('last_active_section', target);

    if (target === 'home') {
      if (view !== 'home') onViewChange('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === 'menu') {
      if (view !== 'home') {
        onViewChange('home');
        setTimeout(() => {
          const el = document.getElementById('menu');
          if (el) {
            const top = el.getBoundingClientRect().top + window.pageYOffset - 90;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }, 150);
      } else {
        const el = document.getElementById('menu');
        if (el) {
          const top = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    } else if (target === 'about') {
      if (view !== 'home') {
        onViewChange('home');
        setTimeout(() => {
          const el = document.getElementById('about');
          if (el) {
            const top = el.getBoundingClientRect().top + window.pageYOffset - 90;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }, 150);
      } else {
        const el = document.getElementById('about');
        if (el) {
          const top = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    } else {
      onViewChange(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    const startTime = Date.now();
    try {
      if (clearCart) clearCart();
      await logout();
      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) {
        await new Promise((res) => setTimeout(res, 1500 - elapsed));
      }
      setShowLogoutModal(false);
      setShowAuthModal(false);
      sessionStorage.removeItem('last_active_section');
      onViewChange('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-container">
          <div className="navbar-left">
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={26} />
            </button>
            <a href="/" className="navbar-brand" onClick={(e) => { e.preventDefault(); handleNavigate('home'); }}>
              <img src="/logo/newlogo.png" alt="KhanaHub Logo" className="navbar-logo" />
              <span className="navbar-title italic-brand" style={{ display: 'flex', alignItems: 'center' }}>
                KhanaHub 
                {user && (
                  <span className="navbar-username" style={{ 
                    color: user.role === 'owner' ? '#16a34a' : '#64748b', 
                    fontSize: '0.6em', 
                    marginLeft: '8px', 
                    fontWeight: '800', 
                    display: 'inline-block', 
                    transform: 'translateY(-2px)'
                  }}>
                    {user.role === 'owner' ? 'Owner' : getDisplayName(user)}
                  </span>
                )}
              </span>
            </a>
          </div>
          
          <div className="navbar-center">
            <div className="navbar-links">
              <button 
                className={`nav-link-btn ${view === 'home' && activeSection === 'home' ? 'active' : ''}`} 
                onClick={() => handleNavigate('home')}
              >
                Home
              </button>
              <button 
                className={`nav-link-btn ${view === 'home' && activeSection === 'menu' ? 'active' : ''}`} 
                onClick={() => handleNavigate('menu')}
              >
                Our Menu
              </button>
              {!user && (
                <button 
                  className={`nav-link-btn ${view === 'home' && activeSection === 'about' ? 'active' : ''}`} 
                  onClick={() => handleNavigate('about')}
                >
                  About Us
                </button>
              )}
              {user && user.role === 'owner' && (
                <button 
                  className={`nav-link-btn ${view === 'owner-dashboard' ? 'active' : ''}`} 
                  onClick={() => handleNavigate('owner-dashboard')}
                >
                  Owner Dashboard
                </button>
              )}
              {user && (user.role === 'delivery' || user.email?.startsWith('db')) && (
                <button 
                  className={`nav-link-btn ${view === 'delivery-dashboard' ? 'active' : ''}`} 
                  onClick={() => handleNavigate('delivery-dashboard')}
                >
                  Delivery Dashboard
                </button>
              )}
              {user && user.role !== 'owner' && !(user.role === 'delivery' || user.email?.startsWith('db')) && (
                <>
                  {hasActiveDelivery && (
                    <button 
                      className={`nav-link-btn live-delivery-nav-btn ${view === 'live-delivery' ? 'active' : ''}`} 
                      onClick={() => handleNavigate('live-delivery')}
                    >
                      <span className="live-pulse-dot"></span>
                      <Truck size={17} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      Live Delivery
                    </button>
                  )}
                  <button 
                    className={`nav-link-btn ${view === 'my-orders' ? 'active' : ''}`} 
                    onClick={() => handleNavigate('my-orders')}
                  >
                    My Orders
                  </button>
                  <button 
                    className={`nav-link-btn ${view === 'order-history' ? 'active' : ''}`} 
                    onClick={() => handleNavigate('order-history')}
                  >
                    Order History
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="navbar-right">
            {(!user || user.role !== 'owner') && (
              <button className="cart-btn" aria-label="View Your Cart" onClick={openCart}>
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="cart-badge">{cartCount}</span>
                )}
              </button>
            )}

            {user ? (
              <button className="logout-btn" onClick={handleLogoutClick} aria-label="Logout">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            ) : (
              <button className="login-btn" onClick={() => setShowAuthModal(true)} aria-label="Login to your account">
                <User size={18} />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Left Drawer & Blur Backdrop */}
      <div 
        className={`mobile-drawer-backdrop ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div className={`mobile-left-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand" onClick={() => handleNavigate('home')}>
            <img src="/logo/newlogo.png" alt="KhanaHub Logo" className="mobile-drawer-logo" />
            <span className="navbar-title italic-brand">
              KhanaHub {user && (
                <span style={{ 
                  color: user.role === 'owner' ? '#16a34a' : '#64748b', 
                  fontSize: '0.6em', 
                  marginLeft: '6px', 
                  fontWeight: '800', 
                  display: 'inline-block', 
                  transform: 'translateY(-2px)' 
                }}>
                  {user.role === 'owner' ? 'Owner' : getDisplayName(user)}
                </span>
              )}
            </span>
          </div>
          <button className="mobile-drawer-close" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>

          {user && (
            <div className="mobile-drawer-user-card">
              <div className="user-avatar-circle">
                <User size={22} />
              </div>
              <div className="user-info-text">
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          )}

        <div className="mobile-drawer-nav">
          <button 
            className={`mobile-nav-item ${view === 'home' && activeSection === 'home' ? 'active' : ''}`}
            onClick={() => handleNavigate('home')}
          >
            <Home size={20} />
            <span>Home</span>
          </button>

          <button 
            className={`mobile-nav-item ${view === 'home' && activeSection === 'menu' ? 'active' : ''}`}
            onClick={() => handleNavigate('menu')}
          >
            <UtensilsCrossed size={20} />
            <span>Our Menu</span>
          </button>

          {!user && (
            <button 
              className={`mobile-nav-item ${view === 'home' && activeSection === 'about' ? 'active' : ''}`}
              onClick={() => handleNavigate('about')}
            >
              <Info size={20} />
              <span>About Us</span>
            </button>
          )}

          {user && user.role === 'owner' && (
            <button 
              className={`mobile-nav-item ${view === 'owner-dashboard' ? 'active' : ''}`}
              onClick={() => handleNavigate('owner-dashboard')}
            >
              <Package size={20} />
              <span>Owner Dashboard</span>
            </button>
          )}

          {user && (user.role === 'delivery' || user.email?.startsWith('db')) && (
            <button 
              className={`mobile-nav-item ${view === 'delivery-dashboard' ? 'active' : ''}`}
              onClick={() => handleNavigate('delivery-dashboard')}
            >
              <Package size={20} />
              <span>Delivery Dashboard</span>
            </button>
          )}

          {user && user.role !== 'owner' && !(user.role === 'delivery' || user.email?.startsWith('db')) ? (
            <>
              {hasActiveDelivery && (
                <button 
                  className={`mobile-nav-item live-delivery-mobile-item ${view === 'live-delivery' ? 'active' : ''}`}
                  onClick={() => handleNavigate('live-delivery')}
                  style={{ color: '#0284c7', background: '#f0f9ff', fontWeight: '800' }}
                >
                  <Truck size={20} />
                  <span>Live Delivery</span>
                  <span className="live-pulse-dot" style={{ marginLeft: 'auto' }}></span>
                </button>
              )}

              <button 
                className={`mobile-nav-item ${view === 'my-orders' ? 'active' : ''}`}
                onClick={() => handleNavigate('my-orders')}
              >
                <Package size={20} />
                <span>My Orders</span>
              </button>

              <button 
                className={`mobile-nav-item ${view === 'order-history' ? 'active' : ''}`}
                onClick={() => handleNavigate('order-history')}
              >
                <History size={20} />
                <span>Order History</span>
              </button>

              <div className="mobile-drawer-divider" />
            </>
          ) : (user ? <div className="mobile-drawer-divider" /> : null)}
          
          {user && user.role !== 'owner' ? (
              <button 
                className="mobile-nav-item mobile-logout-action"
                onClick={() => { setIsMobileMenuOpen(false); handleLogoutClick(); }}
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            ) : (!user ? (
              <button 
                className="mobile-nav-item mobile-login-action"
                onClick={() => { setIsMobileMenuOpen(false); setShowAuthModal(true); }}
              >
                <User size={20} />
                <span>Login / Sign Up</span>
              </button>
            ) : null)}
        </div>
      </div>

      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <button className="logout-close-btn" onClick={cancelLogout} aria-label="Close modal">
              <X size={20} />
            </button>
            <h3>Are you sure you want to logout?</h3>
            <div className="logout-modal-actions">
              <button className="btn-primary" onClick={confirmLogout} disabled={isLoggingOut}>
                {isLoggingOut ? (
                  <>
                    <IOSSpinner size={20} color="white" /> <span>Logging out...</span>
                  </>
                ) : (
                  'Yes, Logout'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
