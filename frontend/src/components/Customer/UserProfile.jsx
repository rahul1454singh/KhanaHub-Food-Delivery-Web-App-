import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, MapPin, Phone, ShieldCheck, Edit3, Key, Crosshair } from 'lucide-react';
import { supabase } from '../../api/supabase';
import { toast } from 'react-hot-toast';
import LocationPickerMap from '../Checkout/LocationPickerMap';
import './UserProfile.css';

const UserProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    phoneCode: '+977',
    phone: '',
    address: '',
    latitude: 27.7172,
    longitude: 85.3240
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.user_metadata?.full_name || user.name || '',
        phoneCode: user.phone_code || user.user_metadata?.phone_code || '+977',
        phone: user.contact_number || user.user_metadata?.contact_number || '',
        address: user.address || '',
        latitude: user.latitude || 27.7172,
        longitude: user.longitude || 85.3240
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setProfileData(prev => ({ ...prev, address: data.display_name }));
      }
    } catch (err) {
      console.error('Failed to fetch address:', err);
    }
  };

  const handleLocationChange = (lat, lng) => {
    setProfileData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    fetchAddressFromCoords(lat, lng);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.loading('Finding your location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast.dismiss();
          toast.success('Location found!');
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setProfileData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
          fetchAddressFromCoords(lat, lng);
        },
        (error) => {
          toast.dismiss();
          toast.error('Could not get location. Please allow location access.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        id: user.id,
        name: profileData.name,
        phone_code: profileData.phoneCode,
        contact_number: profileData.phone,
        address: profileData.address,
        latitude: profileData.latitude,
        longitude: profileData.longitude
      };

      const { error } = await supabase
        .from('users')
        .update(updates).eq('id', user.id);

      if (error) throw error;
      
      // Update Auth metadata if name changed
      if (profileData.name !== user.user_metadata?.full_name) {
        await supabase.auth.updateUser({
          data: { 
            full_name: profileData.name,
            phone_code: profileData.phoneCode,
            contact_number: profileData.phone
          }
        });
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update profile');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const isOwner = user.role === 'owner';

  return (
    <div className="user-profile-page">
      <div className="profile-container">
        
<div className="profile-card security-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>Account Security</h3>
            <div className="security-info" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '50%' }}>
                <ShieldCheck size={28} color="var(--primary-brand)" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1e293b' }}>Secure Account</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                  Your account is protected and connected via {user.app_metadata?.provider || 'Email'}.
                </p>
                <button style={{ marginTop: '16px', background: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: '500' }}>
                  <Key size={16} /> Change Password
                </button>
              </div>
            </div>
          </div>

          
<div className="profile-header">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" />
            ) : (
              <User size={48} color="white" />
            )}
          </div>
          <div className="profile-title-area">
            <h2>{profileData.name || 'User Profile'}</h2>
            <span className="profile-role-badge">
              {isOwner ? 'RESTAURANT OWNER' : user.role === 'customer' ? 'Foodie' : user.role.toUpperCase()}
            </span>
          </div>
          {!isEditing ? (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              <Edit3 size={18} /> Edit Profile
            </button>
          ) : null}
        </div>

        <div className="profile-content">
<div className="profile-card">
            <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
              Personal Information
            </h3>
            <div className="profile-grid">
              <div className="profile-field full-width">
                <label><Mail size={16} /> Email Address</label>
                <div className="field-value disabled-field">{user.email}</div>
                <small style={{ color: '#94a3b8' }}>Email cannot be changed directly here</small>
              </div>

              <div className="profile-field">
                <label><User size={16} /> Full Name</label>
                {isEditing ? (
                  <input type="text" name="name" value={profileData.name} onChange={handleChange} />
                ) : (
                  <div className="field-value">{profileData.name || <span style={{ color: '#94a3b8' }}>Not set</span>}</div>
                )}
              </div>

              <div className="profile-field">
                <label><Phone size={16} /> Contact Number</label>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select name="phoneCode" value={profileData.phoneCode} onChange={handleChange} style={{ width: '80px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                      <option value="+977">+977</option>
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                    </select>
                    <input type="tel" name="phone" value={profileData.phone} onChange={handleChange} placeholder="e.g. 98XXXXXXXX" style={{ flex: 1 }} />
                  </div>
                ) : (
                  <div className="field-value">
                    {profileData.phone ? `${profileData.phoneCode} ${profileData.phone}` : <span style={{ color: '#94a3b8' }}>Not set</span>}
                  </div>
                )}
              </div>

              <div className="profile-field full-width">
                <label><MapPin size={16} /> {isOwner ? 'Restaurant Location & Address' : 'Default Delivery Address'}</label>
                {isEditing ? (
                  <>
                    <textarea name="address" value={profileData.address} onChange={handleChange} rows="2" placeholder="Enter full address..." style={{ marginBottom: '12px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Pinpoint exact location on map</span>
                      <button type="button" onClick={handleUseCurrentLocation} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        <Crosshair size={14} /> Use my current location
                      </button>
                    </div>
                    <div style={{ height: '250px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <LocationPickerMap lat={profileData.latitude} lon={profileData.longitude} onLocationChange={handleLocationChange} pinLabel={isOwner ? 'KhanaHub Restaurant' : 'Delivery Pin'} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="field-value address-value" style={{ marginBottom: isOwner ? '12px' : '0' }}>
                      {profileData.address || <span style={{ color: '#94a3b8' }}>Not set</span>}
                    </div>
                    {isOwner && (
                      <div style={{ height: '250px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', pointerEvents: 'none', opacity: 0.9 }}>
                        <LocationPickerMap lat={profileData.latitude} lon={profileData.longitude} onLocationChange={() => {}} pinLabel={isOwner ? 'KhanaHub Restaurant' : 'Delivery Pin'} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="profile-actions" style={{ marginTop: '24px' }}>
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
