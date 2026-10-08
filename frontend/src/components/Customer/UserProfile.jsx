import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, MapPin, Phone, ShieldCheck, Edit3 } from 'lucide-react';
import { supabase } from '../../api/supabase';
import { toast } from 'react-hot-toast';
import './UserProfile.css';

const UserProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.user_metadata?.full_name || user.name || '',
        phone: user.contact_number || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        id: user.id,
        name: profileData.name,
        contact_number: profileData.phone,
        address: profileData.address,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('users')
        .upsert(updates, { returning: 'minimal' });

      if (error) throw error;
      
      // Update Auth metadata if name changed
      if (profileData.name !== user.user_metadata?.full_name) {
        await supabase.auth.updateUser({
          data: { full_name: profileData.name }
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

  return (
    <div className="user-profile-page">
      <div className="profile-container">
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
              {user.role === 'customer' ? 'Foodie' : user.role.toUpperCase()}
            </span>
          </div>
          {!isEditing ? (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              <Edit3 size={18} /> Edit
            </button>
          ) : null}
        </div>

        <div className="profile-content">
          <div className="profile-card">
            <h3>Personal Information</h3>
            <div className="profile-grid">
              <div className="profile-field">
                <label><Mail size={16} /> Email Address</label>
                <div className="field-value disabled-field">{user.email}</div>
                <small>Email cannot be changed</small>
              </div>

              <div className="profile-field">
                <label><User size={16} /> Full Name</label>
                {isEditing ? (
                  <input type="text" name="name" value={profileData.name} onChange={handleChange} />
                ) : (
                  <div className="field-value">{profileData.name || 'Not set'}</div>
                )}
              </div>

              <div className="profile-field">
                <label><Phone size={16} /> Contact Number</label>
                {isEditing ? (
                  <input type="tel" name="phone" value={profileData.phone} onChange={handleChange} placeholder="e.g. +977 98..." />
                ) : (
                  <div className="field-value">{profileData.phone || 'Not set'}</div>
                )}
              </div>

              <div className="profile-field full-width">
                <label><MapPin size={16} /> Default Delivery Address</label>
                {isEditing ? (
                  <textarea name="address" value={profileData.address} onChange={handleChange} rows="3" placeholder="Enter your full address..." />
                ) : (
                  <div className="field-value address-value">{profileData.address || 'Not set'}</div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="profile-actions">
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div className="profile-card security-card">
            <h3>Account Security</h3>
            <div className="security-info">
              <ShieldCheck size={24} color="var(--primary-brand)" />
              <div>
                <h4>Secure Account</h4>
                <p>Your account is protected. Connected via {user.app_metadata?.provider || 'Email'}.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
