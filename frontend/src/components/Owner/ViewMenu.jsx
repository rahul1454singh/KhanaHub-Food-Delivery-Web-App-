import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { toast } from 'react-hot-toast';
import { Trash2, Edit2, Search, Plus, Minus, X } from 'lucide-react';
import './OwnerDashboard.css';

const ViewMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menu')
        .select('*')
        .order('section', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setMenuItems(data);
    } catch (err) {
      console.error('Error fetching menu:', err);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (id, currentStatus) => {
    try {
      const { data, error } = await supabase
        .from('menu')
        .update({ available: !currentStatus })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Update blocked by database (RLS). Please disable RLS on the menu table.");
      
      setMenuItems(items => 
        items.map(item => item.id === id ? { ...item, available: !currentStatus } : item)
      );
      toast.success('Item availability updated');
    } catch (err) {
      console.error('Error updating availability:', err);
      toast.error(err.message === "Update blocked by database (RLS). Please disable RLS on the menu table." ? err.message : 'Failed to update availability');
    }
  };

  const updateQuantity = async (id, currentQty, change) => {
    const newQty = Math.max(0, currentQty + change);
    try {
      // If it drops to 0, automatically make it unavailable
      const updates = { daily_quantity: newQty };
      if (newQty === 0) updates.available = false;

      const { data, error } = await supabase
        .from('menu')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Update blocked by database (RLS). Please disable RLS on the menu table.");

      setMenuItems(items => items.map(item => {
        if (item.id === id) {
          return { ...item, daily_quantity: newQty, available: newQty === 0 ? false : item.available };
        }
        return item;
      }));
    } catch (err) {
      console.error('Error updating quantity:', err);
      toast.error(err.message === "Update blocked by database (RLS). Please disable RLS on the menu table." ? err.message : 'Failed to update quantity');
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const { error } = await supabase
        .from('menu')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;
      
      setMenuItems(items => items.filter(item => item.id !== itemToDelete.id));
      toast.success('Item deleted successfully');
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error('Failed to delete item');
    } finally {
      setItemToDelete(null);
    }
  };

  const openEditModal = (item) => {
    setItemToEdit(item);
    setEditForm({
      name: item.name,
      price: item.price,
      description: item.description || '',
      image: item.image
    });
    setEditImageFile(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setEditImageFile(e.target.files[0]);
    }
  };

  const uploadEditImage = async () => {
    if (!editImageFile) return null;
    setUploading(true);
    const toastId = toast.loading('Uploading new image to Cloudinary...');
    
    try {
      const formData = new FormData();
      formData.append('file', editImageFile);
      
      // Loaded from .env with fallback to actual names just in case
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'khanahub_preset'; 
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'n3wagpa9';

      // Use Cloudinary Unsigned Upload API
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Cloudinary upload failed');
      }

      toast.success('Image uploaded successfully to Cloudinary', { id: toastId });
      // return the URL of the uploaded image
      return data.secure_url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading image to Cloudinary. Check your Cloud Name / Preset.', { id: toastId });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      let finalImageUrl = editForm.image;
      if (editImageFile) {
        const uploadedUrl = await uploadEditImage();
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const { data, error } = await supabase
        .from('menu')
        .update({
          name: editForm.name,
          price: parseFloat(editForm.price),
          description: editForm.description,
          image: finalImageUrl
        })
        .eq('id', itemToEdit.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Update blocked by database (RLS). Please disable RLS on the menu table.");

      toast.success('Menu item updated!');
      setMenuItems(items => items.map(item => 
        item.id === itemToEdit.id 
          ? { ...item, ...editForm, image: finalImageUrl }
          : item
      ));
      setItemToEdit(null);
    } catch (err) {
      console.error('Error updating item:', err);
      toast.error(err.message === "Update blocked by database (RLS). Please disable RLS on the menu table." ? err.message : 'Failed to update item');
    }
  };

  const filteredMenu = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="owner-placeholder"><div className="spinner"></div><p>Loading menu...</p></div>;
  }

  return (
    <div className="view-menu-container">
      <div className="view-menu-header">
        <h2>All Menu Items ({menuItems.length})</h2>
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by name or section..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="menu-cards-grid">
        {filteredMenu.map(item => (
          <div key={item.id} className={`menu-admin-card ${!item.available || item.daily_quantity === 0 ? 'out-of-stock-card' : ''}`}>
            
            {(!item.available || item.daily_quantity === 0) && (
              <div className="out-of-stock-overlay">
                <span>OUT OF STOCK</span>
              </div>
            )}
            
            <img 
              src={item.image.startsWith('http') ? item.image : item.image} 
              alt={item.name} 
              className="admin-card-img"
              onError={(e) => { e.target.src = '/logo/newlogo.png'; }}
            />
            
            <div className="admin-card-content">
              <div className="admin-card-header">
                <h3>{item.name}</h3>
                <span className="section-badge">{item.section}</span>
              </div>
              <p className="admin-card-price">₹{item.price}</p>
              {item.description && <p className="admin-card-desc">{item.description}</p>}
              
              <div className="admin-card-controls">
                <div className="qty-control">
                  <span className="qty-label">Daily Qty:</span>
                  <div className="qty-buttons">
                    <button onClick={() => updateQuantity(item.id, item.daily_quantity || 0, -1)}><Minus size={14}/></button>
                    <span>{item.daily_quantity || 0}</span>
                    <button onClick={() => updateQuantity(item.id, item.daily_quantity || 0, 1)}><Plus size={14}/></button>
                  </div>
                </div>
                
                <button 
                  className={`toggle-btn ${item.available ? 'active' : 'inactive'}`}
                  onClick={() => toggleAvailability(item.id, item.available)}
                >
                  {item.available ? 'Turn Off' : 'Turn On'}
                </button>
              </div>

              <div className="admin-card-actions">
                <button className="btn-edit" onClick={() => openEditModal(item)}>
                  <Edit2 size={16} /> Edit
                </button>
                <button className="btn-delete" onClick={() => setItemToDelete(item)}>
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredMenu.length === 0 && (
          <div className="no-results">No menu items found.</div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Delete Menu Item?</h3>
            <p style={{marginBottom: '1.5rem', color: '#64748b'}}>Are you sure you want to permanently remove "{itemToDelete.name}"? This action cannot be undone.</p>
            <div className="logout-modal-actions">
              <button className="btn-secondary" onClick={() => setItemToDelete(null)}>Cancel</button>
              <button className="btn-primary" style={{backgroundColor: '#ef4444'}} onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {itemToEdit && editForm && (
        <div className="logout-modal-overlay edit-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Edit Menu Item</h3>
              <button className="close-btn" onClick={() => setItemToEdit(null)}><X size={20}/></button>
            </div>
            
            <form onSubmit={saveEdit} className="add-menu-form">
              <div className="form-group">
                <label>Item Name</label>
                <input type="text" name="name" value={editForm.name} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input type="number" name="price" value={editForm.price} onChange={handleEditChange} required min="0"/>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={editForm.description} onChange={handleEditChange} className="menu-textarea" rows="2"></textarea>
              </div>
              <div className="form-group">
                <label>Update Image (Optional)</label>
                <div className="file-upload-wrapper">
                  <input type="file" accept="image/*" onChange={handleEditImageChange} className="file-input" id="edit-image-upload" />
                  <label htmlFor="edit-image-upload" className="file-upload-button">
                    {editImageFile ? editImageFile.name : 'Choose a new Image...'}
                  </label>
                </div>
              </div>
              <div className="logout-modal-actions" style={{marginTop: '1rem'}}>
                <button type="button" className="btn-secondary" onClick={() => setItemToEdit(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewMenu;
