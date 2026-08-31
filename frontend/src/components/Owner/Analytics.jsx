import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { toast } from 'react-hot-toast';
import { BarChart, DollarSign, TrendingUp, Calendar, AlertCircle, Info } from 'lucide-react';
import './OwnerDashboard.css';

const Analytics = () => {
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchAnalytics();
    checkMonthlyReminder();
  }, []);

  const checkMonthlyReminder = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // If tomorrow is a new month, it means today is the last day of the month
    if (today.getMonth() !== tomorrow.getMonth()) {
      const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
      const storageKey = `revenueReminder_${monthKey}`;
      const shownCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
      
      if (shownCount < 3) {
        setShowReminderModal(true);
        localStorage.setItem(storageKey, (shownCount + 1).toString());
      }
    }
  };

  const fetchAnalytics = async () => {
    try {
      // 1. Fetch today's revenue from orders
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayOrders, error: ordersError } = await supabase
        .from('orders')
        .select('grand_total')
        .gte('created_at', startOfDay.toISOString());

      if (ordersError) throw ordersError;

      const revenue = todayOrders.reduce((sum, order) => sum + (order.grand_total || 0), 0);
      setDailyRevenue(revenue);

      // 2. Fetch ALL selling items from menu (sold_count > 0)
      const { data: menuData, error: menuError } = await supabase
        .from('menu')
        .select('name, sold_count, image, section')
        .gt('sold_count', 0) // Only fetch items that have been sold at least once
        .order('sold_count', { ascending: false });

      if (menuError) throw menuError;
      setTopItems(menuData);
      
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmResetMonthlyData = async () => {
    try {
      const { error } = await supabase
        .from('menu')
        .update({ sold_count: 0 })
        .neq('id', 0);
        
      if (error) throw error;
      
      setTopItems([]); // Clear the list since everything is 0 now
      setCurrentPage(1);
      setShowResetModal(false);
      toast.success("Monthly data has been reset successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset monthly data.");
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(topItems.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = topItems.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  if (loading) {
    return <div className="owner-placeholder"><div className="spinner"></div><p>Loading analytics...</p></div>;
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Business Analytics</h2>
        <p>Track your daily revenue and most popular dishes.</p>
      </div>

      <div className="analytics-cards">
        <div className="metric-card primary-metric">
          <div className="metric-icon"><DollarSign size={24} /></div>
          <div className="metric-details">
            <h3>Today's Revenue</h3>
            <p className="metric-value">₹{dailyRevenue.toFixed(2)}</p>
            <span className="metric-subtitle">Resets automatically at midnight</span>
          </div>
        </div>

        <div className="metric-card warning-metric">
          <div className="metric-icon"><AlertCircle size={24} /></div>
          <div className="metric-details">
            <h3>Monthly Review Reminder</h3>
            <p className="metric-desc">Please review your top selling items before resetting the monthly tracker.</p>
            <button className="btn-reset-month" onClick={() => setShowResetModal(true)}>
              Reset Monthly Tracker
            </button>
          </div>
        </div>
      </div>

      <div className="top-sellers-section">
        <div className="section-header-row">
          <TrendingUp size={20} className="text-orange-500" />
          <h3>Most Popular Dishes (All Time / This Month)</h3>
        </div>
        
        <div className="top-sellers-list">
          {currentItems.map((item, idx) => {
            const rank = indexOfFirstItem + idx + 1;
            return (
              <div key={idx} className="top-seller-row">
                <div className="rank-badge">#{rank}</div>
                <img 
                  src={item.image.startsWith('http') ? item.image : item.image} 
                  alt={item.name} 
                  onError={(e) => { e.target.src = 'https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1/khanahub/logo/newlogo.png'; }}
                />
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <span>{item.section}</span>
                </div>
                <div className="sales-count">
                  <strong>{item.sold_count}</strong> Plates Sold
                </div>
              </div>
            );
          })}
          
          {topItems.length === 0 && (
            <div className="owner-placeholder" style={{ padding: '2rem' }}>
              <p>No sales data available yet. When a customer buys something, it will appear here instantly!</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button 
              className="btn-secondary" 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ fontWeight: '600', color: '#475569' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="btn-secondary" 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {showResetModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Reset Monthly Tracker?</h3>
            <p style={{marginBottom: '1.5rem', color: '#64748b'}}>
              WARNING: Are you sure you want to reset all item sold counts back to 0? Make sure you have reviewed your monthly sales data!
            </p>
            <div className="logout-modal-actions">
              <button className="btn-secondary" onClick={() => setShowResetModal(false)}>Cancel</button>
              <button className="btn-primary" style={{backgroundColor: '#ef4444'}} onClick={confirmResetMonthlyData}>Yes, Reset Data</button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Popup Modal */}
      {showReminderModal && (
        <div className="logout-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="logout-modal">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
              <Info size={28} />
              <h3 style={{ margin: 0 }}>End of Month Reminder</h3>
            </div>
            <p style={{marginBottom: '1.5rem', color: '#475569'}}>
              Today is the last day of the month! Please make sure to record your <strong>Today's Revenue</strong> and <strong>Monthly Revenue</strong> in your notebook before they reset.
            </p>
            <div className="logout-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => setShowReminderModal(false)}>OK, I will record it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
