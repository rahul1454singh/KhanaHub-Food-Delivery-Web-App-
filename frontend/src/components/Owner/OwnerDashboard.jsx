import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Package, Clock, PlusCircle, List, Truck, LogOut, LayoutDashboard } from 'lucide-react';
import './OwnerDashboard.css';
import ActiveOrders from './ActiveOrders';
import AssignDelivery from './AssignDelivery';
import OwnerOrderHistory from './OwnerOrderHistory';
import AddMenu from './AddMenu';
import ViewMenu from './ViewMenu';
import Analytics from './Analytics';
import { supabase } from '../../api/supabase';
import { toast } from 'react-hot-toast';

const OwnerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [orderToAssign, setOrderToAssign] = useState(null);

  useEffect(() => {
    if (user && user.role === 'owner') {
      const channel = supabase.channel('owner_notifications')
        .on(
          'broadcast',
          { event: 'delivery_accepted' },
          (payload) => {
            const { orderId, deliveryBoyName } = payload.payload;
            toast.success(`Delivery for Order #${orderId.substring(0, 6).toUpperCase()} was accepted by ${deliveryBoyName}`, { duration: 6000 });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (!user || user.role !== 'owner') {
    return (
      <div className="owner-access-denied">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleAssignClick = (orderId) => {
    setOrderToAssign(orderId);
    setActiveTab('assign-delivery');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return <ActiveOrders setPendingCount={setPendingOrdersCount} onAssign={handleAssignClick} />;
      case 'history':
        return <OwnerOrderHistory />;
      case 'analytics':
        return <Analytics />;
      case 'add-menu':
        return <AddMenu onMenuAdded={() => setActiveTab('view-menu')} />;
      case 'view-menu':
        return <ViewMenu />;
      case 'assign-delivery':
        return (
          <AssignDelivery 
            orderId={orderToAssign} 
            onBack={() => { setActiveTab('orders'); setOrderToAssign(null); }} 
          />
        );
      default:
        return <ActiveOrders setPendingCount={setPendingOrdersCount} onAssign={handleAssignClick} />;
    }
  };

  return (
    <div className="owner-dashboard-container">
      {/* Sidebar */}
      <aside className="owner-sidebar">
        <div className="owner-sidebar-header">
          <LayoutDashboard size={24} className="owner-sidebar-icon" />
          <h2>Owner Panel</h2>
        </div>

        <nav className="owner-sidebar-nav">
          <button 
            className={`owner-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Package size={20} />
            <span>Order</span>
            {/* Only show badge if there are pending orders */}
            {pendingOrdersCount > 0 && <span className="owner-badge">{pendingOrdersCount}</span>}
          </button>
          
          <button 
            className={`owner-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={20} />
            <span>Order History</span>
          </button>

          <button 
            className={`owner-nav-btn ${activeTab === 'add-menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-menu')}
          >
            <PlusCircle size={20} />
            <span>Add Menu</span>
          </button>

          <button 
            className={`owner-nav-btn ${activeTab === 'view-menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('view-menu')}
          >
            <List size={20} />
            <span>View All Menu</span>
          </button>

          <button 
            className={`owner-nav-btn ${activeTab === 'assign-delivery' ? 'active' : ''}`}
            onClick={() => setActiveTab('assign-delivery')}
          >
            <Truck size={20} />
            <span>Assign Delivery</span>
          </button>
          <button 
            className={`owner-nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <LayoutDashboard size={20} />
            <span>Analytics & Revenue</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="owner-main-content">
        <header className="owner-main-header">
          <h1>{activeTab.replace('-', ' ').toUpperCase()}</h1>
          <div className="owner-header-user">
            <span className="owner-email">{user.email}</span>
            <img src="https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1/khanahub/logo/newlogo.png" alt="KhanaHub Logo" className="owner-avatar-logo" />
          </div>
        </header>
        
        <div className="owner-content-wrapper">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
