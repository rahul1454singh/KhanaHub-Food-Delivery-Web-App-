import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, Power, Tag } from 'lucide-react';
import './OwnerDashboard.css';

const ManagePromos = () => {
  const [promos, setPromos] = useState([]);
  const [isPromoGlobalActive, setIsPromoGlobalActive] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPromosAndSettings = async () => {
    setLoading(true);
    const { data: settings } = await supabase.from('store_settings').select('id, is_promo_active').single();
    if (settings) setIsPromoGlobalActive(settings.is_promo_active);

    const { data: promoList } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (promoList) setPromos(promoList);
    setLoading(false);
  };

  useEffect(() => {
    fetchPromosAndSettings();
  }, []);

  const handleToggleGlobalPromo = async () => {
    const newValue = !isPromoGlobalActive;
    const { data } = await supabase.from('store_settings').select('id').single();
    if (data) {
        const { error } = await supabase.from('store_settings').update({ is_promo_active: newValue }).eq('id', data.id);
        if (error) {
            toast.error('Failed to update settings');
        } else {
            setIsPromoGlobalActive(newValue);
            toast.success(newValue ? 'Promo codes enabled globally' : 'Promo codes disabled globally');
        }
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!newCode || !newDiscount) return;
    
    const discountNum = parseInt(newDiscount);
    if (discountNum <= 0 || discountNum > 100) {
        toast.error('Discount must be between 1 and 100');
        return;
    }

    const { data, error } = await supabase.from('promo_codes').insert([
      { code: newCode.toUpperCase(), discount_percentage: discountNum }
    ]).select();

    if (error) {
      toast.error('Failed to create promo. Code might already exist.');
    } else if (data) {
      toast.success('Promo code created!');
      setNewCode('');
      setNewDiscount('');
      setPromos([data[0], ...promos]);
    }
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (!error) {
      toast.success('Promo deleted');
      setPromos(promos.filter(p => p.id !== id));
    } else {
      toast.error('Failed to delete promo');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div className="owner-content-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Manage Promo Codes</h2>
        <button 
          onClick={handleToggleGlobalPromo}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '8px', border: 'none',
            background: isPromoGlobalActive ? '#ef4444' : '#10b981',
            color: 'white', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          <Power size={18} />
          {isPromoGlobalActive ? 'Disable All Promos' : 'Enable Promos'}
        </button>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Create New Promo Code</h3>
        <form onSubmit={handleCreatePromo} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#64748b' }}>Code Name</label>
            <input 
              type="text" 
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="e.g. SUMMER50"
              style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', textTransform: 'uppercase' }}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#64748b' }}>Discount Percentage (%)</label>
            <input 
              type="number" 
              value={newDiscount}
              onChange={(e) => setNewDiscount(e.target.value)}
              placeholder="e.g. 20"
              min="1" max="100"
              style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              required
            />
          </div>
          <button type="submit" style={{ padding: '12px 24px', background: 'var(--primary-brand)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', height: '43px' }}>
            <Plus size={18} /> Create
          </button>
        </form>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '16px', textAlign: 'left', color: '#475569' }}>Code</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#475569' }}>Discount</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#475569' }}>Created At</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#475569' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No promo codes found</td></tr>
            ) : (
              promos.map(promo => (
                <tr key={promo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--primary-brand)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '6px' }}>
                      <Tag size={14} /> {promo.code}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{promo.discount_percentage}% OFF</td>
                  <td style={{ padding: '16px', color: '#64748b' }}>{new Date(promo.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button onClick={() => handleDeletePromo(promo.id)} style={{ padding: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagePromos;
