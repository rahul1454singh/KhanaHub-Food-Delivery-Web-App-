import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MenuSection from './components/MenuSection';
import { RestaurantInfo, CallToAction } from './components/InfoSection';
import Footer from './components/Footer';
import CartSidebar from './components/CartSidebar';
import AuthModal from './components/AuthModal';
import CheckoutPage from './components/Checkout/CheckoutPage';
import OrdersPage from './components/Orders/OrdersPage';
import PaymentSuccess from './components/PaymentSuccess/PaymentSuccess';
import OwnerDashboard from './components/Owner/OwnerDashboard';
import DeliveryDashboard from './components/Delivery/DeliveryDashboard';
import LiveDeliveryPage from './components/Customer/LiveDeliveryPage';
import LoadingScreen from './components/LoadingScreen';
import OwnerDashboardPlaceholder from './components/OwnerDashboardPlaceholder';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import { Toaster, toast, ToastBar } from 'react-hot-toast';
import './index.css';

const getInitialView = () => {
  const path = window.location.pathname;
  if (path === '/menu') return 'menu';
  if (path === '/cart') return 'cart';
  if (path === '/') return 'home';
  if (path === '/owner-dashboard') return 'owner-dashboard';
  if (path === '/delivery-dashboard') return 'delivery-dashboard';
  if (path === '/checkout' || path === '/billing') return 'checkout';
  if (path === '/payment') return 'payment'; // Map /payment to checkout but open modal
  if (path === '/orders' || path === '/my-orders') return 'my-orders';
  if (path === '/order-history') return 'order-history';
  if (path === '/live-delivery' || path === '/tracking') return 'live-delivery';
  if (path === '/payment-success') return 'payment-success';
  return 'not-found';
};

function App() {
  const { isCartOpen, openCart, closeCart } = useCart();
  const { user, loading: authLoading, showAuthModal, setShowAuthModal, setAuthPromptMessage, globalLoading } = useAuth();
  
  const [view, setView] = useState(getInitialView()); 
  const [placedOrder, setPlacedOrder] = useState(null);
  
  // Track protected route intended before auth
  const [pendingRoute, setPendingRoute] = useState(null);
  const [isScreenLoading, setIsScreenLoading] = useState(false);

  // Sync internal view state to URL
  useEffect(() => {
    let path = '/';
    if (view === 'checkout') path = '/checkout';
    if (view === 'payment') path = '/payment';
    if (view === 'my-orders') path = '/orders';
    if (view === 'order-history') path = '/order-history';
    if (view === 'live-delivery') path = '/live-delivery';
    if (view === 'payment-success') path = '/payment-success';
    if (view === 'menu') path = '/menu';
    if (view === 'cart') path = '/cart';
    if (view === 'owner-dashboard') path = '/owner-dashboard';
    if (view === 'delivery-dashboard') path = '/delivery-dashboard';

    // Only pushState if the current path doesn't already match, avoiding extra history entries
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, [view]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle specific URL actions on mount and view changes
  useEffect(() => {
    if (authLoading) return;

    const savedSection = sessionStorage.getItem('last_active_section');
    if (view === 'cart') {
      openCart();
    } else if (view === 'menu' || (view === 'home' && savedSection === 'menu')) {
      setTimeout(() => {
        const el = document.getElementById('menu') || document.getElementById('menu-section');
        if (el) {
          const top = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 400);
    } else if (view === 'home' && savedSection === 'about') {
      setTimeout(() => {
        const el = document.getElementById('about');
        if (el) {
          const top = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 400);
    }
  }, [view, openCart, authLoading]);

  const handleViewChange = (newView) => {
    setView(newView);
    if (newView === 'home') {
      sessionStorage.setItem('last_active_section', 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCheckoutClick = () => {
    if (!user) {
      if (setAuthPromptMessage) setAuthPromptMessage('Please login before placing your order');
      setPendingRoute('checkout');
      setShowAuthModal(true);
      closeCart();
    } else {
      setView('checkout');
      closeCart();
    }
  };

  // Auth Guard & Transitions
  useEffect(() => {
    if (authLoading || globalLoading.isLoading) return; // Wait until auth restoration or logout is complete

    const protectedRoutes = ['checkout', 'payment', 'my-orders', 'order-history', 'live-delivery', 'owner-dashboard', 'delivery-dashboard'];

    // 1. Unauthenticated user trying to access protected route
    if (!user && protectedRoutes.includes(view)) {
      setPendingRoute(view);
      if (setAuthPromptMessage) setAuthPromptMessage('Please login to access this page');
      setView('home');
      setShowAuthModal(true);
    } 
    // 2. Authenticated user missing required role on direct navigation
    else if (user && view === 'owner-dashboard' && user.role !== 'owner') {
      setView('home');
    }
    else if (user && view === 'delivery-dashboard' && !(user.role === 'delivery' || user.email.startsWith('db') || user.email.includes('+db@'))) {
      setView('home');
    }
    // 3. User successfully authenticated and has a pending protected route
    else if (user && pendingRoute) {
      const target = pendingRoute;
      setPendingRoute(null);
      
      if (user.role === 'owner') {
        if (target === 'owner-dashboard') {
          setView('owner-dashboard');
        } else {
          setView('home');
        }
      } else if (user.role === 'delivery' || user.email.startsWith('db') || user.email.includes('+db@')) {
        setView('delivery-dashboard');
      } else {
        // Regular customer
        if (target === 'owner-dashboard' || target === 'delivery-dashboard') {
          setView('home');
        } else {
          setView(target);
        }
      }
    }
    // 4. Owner lands on Home upon login and never gets forced to My Orders
    else if (user && user.role === 'owner') {
      const hasRedirected = sessionStorage.getItem('owner_redirected');
      if (!hasRedirected) {
        sessionStorage.setItem('owner_redirected', 'true');
        if (view === 'my-orders' || view === 'order-history' || view === 'checkout' || view === 'payment') {
          setView('home');
        }
      }
    }
    // 5. Redirect Delivery to Dashboard upon login
    else if (user && (user.role === 'delivery' || user.email.startsWith('db') || user.email.includes('+db@'))) {
      const hasRedirected = sessionStorage.getItem('delivery_redirected');
      if (!hasRedirected) {
        setView('delivery-dashboard');
        sessionStorage.setItem('delivery_redirected', 'true');
      }
    }
    // 6. Clear redirect flags if logged out
    else if (!user) {
      sessionStorage.removeItem('owner_redirected');
      sessionStorage.removeItem('delivery_redirected');
    }
  }, [user, authLoading, globalLoading.isLoading, view, pendingRoute, setShowAuthModal, setAuthPromptMessage]);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show beautiful branded loading screen during initial auth restoration or global loading
  if (authLoading) {
    return <LoadingScreen message="Initializing KhanaHub..." />;
  }

  if (globalLoading?.isLoading) {
    return <LoadingScreen message={globalLoading.message} />;
  }

  return (
    <div className="app">
      {isScreenLoading && <LoadingScreen message="Loading..." />}
      <Navbar view={view} onViewChange={handleViewChange} />
      <CartSidebar onCheckout={handleCheckoutClick} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <Toaster 
        position="top-right"
        containerStyle={{
          top: 85,
          right: 20,
          zIndex: 9999999,
        }}
        toastOptions={{
          duration: 4500,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.15), 0 6px 12px -4px rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            padding: '12px 18px',
            fontWeight: '600',
            fontSize: '0.92rem',
            maxWidth: '420px',
            width: 'auto',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            }
          }
        }} 
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                <div style={{ flex: 1, paddingRight: '8px', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                  {message}
                </div>
                {t.type !== 'loading' && (
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      flexShrink: 0,
                      borderRadius: '50%',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    aria-label="Close notification"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>

      <main>
        {['home', 'menu', 'cart'].includes(view) && (
          <>
            <Hero />
            <MenuSection />
            <RestaurantInfo />
            <CallToAction />
          </>
        )}
        {['checkout', 'payment'].includes(view) && (
          <CheckoutPage 
            onBack={() => handleViewChange('home')} 
            onViewChange={handleViewChange}
            onPaymentSuccess={(order) => {
              setPlacedOrder(order);
              handleViewChange('payment-success');
            }} 
          />
        )}
        {view === 'payment-success' && (
          <PaymentSuccess 
            order={placedOrder} 
            onViewChange={handleViewChange} 
          />
        )}
        {view === 'my-orders' && <OrdersPage type="my-orders" />}
        {view === 'order-history' && <OrdersPage type="order-history" />}
        {view === 'live-delivery' && <LiveDeliveryPage onViewChange={handleViewChange} />}
        {view === 'owner-dashboard' && <OwnerDashboard />}
        {view === 'delivery-dashboard' && <DeliveryDashboard />}
        {view === 'not-found' && (
          <div style={{ padding: '100px 20px', textAlign: 'center', minHeight: '60vh' }}>
            <h1 style={{ fontSize: '3rem', color: '#1e293b', marginBottom: '20px' }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', color: '#475569', marginBottom: '30px' }}>Page Not Found</h2>
            <p style={{ color: '#64748b', marginBottom: '40px' }}>The page you are looking for does not exist or has been moved.</p>
            <button 
              onClick={() => handleViewChange('home')}
              style={{ padding: '12px 24px', backgroundColor: 'var(--primary-brand)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Return to Home
            </button>
          </div>
        )}
      </main>
        {!(view === 'my-orders' || view === 'order-history' || view === 'owner-dashboard' || view === 'delivery-dashboard' || view === 'menu') && <Footer />}
    </div>
  );
}

export default App;
