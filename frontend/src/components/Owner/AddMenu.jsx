import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { toast } from 'react-hot-toast';
import { PlusCircle, Image as ImageIcon, Tag, DollarSign, List as ListIcon, UploadCloud, AlignLeft, Hash } from 'lucide-react';
import './OwnerDashboard.css';

const AddMenu = ({ onMenuAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    section: 'Momo',
    newSection: '',
    daily_quantity: 20,
    available: true
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [existingSections, setExistingSections] = useState(['Momo', 'Biryani', 'Burger', 'Pizza', 'Snacks', 'Noodles', 'Drinks']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase.from('menu').select('section');
      if (error) throw error;
      if (data) {
        const uniqueSections = [...new Set(data.map(item => item.section))];
        // Merge unique sections with default ones, keeping it unique
        const merged = [...new Set([...existingSections, ...uniqueSections])];
        setExistingSections(merged);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Description word count validation
    if (name === 'description') {
      const words = value.trim().split(/\s+/);
      if (words.length > 25 && value.length > formData.description.length) {
        toast.error("Description cannot exceed 25 words.");
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    setUploading(true);
    const toastId = toast.loading('Uploading image...');
    
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

      toast.success('Image uploaded successfully', { id: toastId });
      return data.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading image. Make sure the storage bucket exists.', { id: toastId });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || (!imageFile && !formData.image)) {
      toast.error('Please fill all required fields including the image');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload image first
      let imageUrl = formData.image;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) {
          setLoading(false);
          return; // Stop if upload failed
        }
        imageUrl = uploadedUrl;
      }

      // 2. Determine final section
      const finalSection = formData.newSection.trim() ? formData.newSection.trim() : formData.section;

      // 3. Save to database
      const { data, error } = await supabase
        .from('menu')
        .insert([{
          name: formData.name,
          price: parseFloat(formData.price),
          description: formData.description,
          section: finalSection,
          image: imageUrl,
          daily_quantity: parseInt(formData.daily_quantity),
          sold_count: 0,
          available: formData.available
        }]);

      if (error) throw error;

      toast.success('Menu item added successfully!');
      
      // Reset form
      setFormData({
        name: '',
        price: '',
        description: '',
        section: existingSections.includes(finalSection) ? finalSection : existingSections[0],
        newSection: '',
        daily_quantity: 20,
        available: true
      });
      setImageFile(null);
      
      if (onMenuAdded) onMenuAdded();
    } catch (err) {
      console.error('Error adding menu item:', err);
      toast.error('Failed to add menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-menu-container">
      <h2>Add New Menu Item</h2>
      <form className="add-menu-form" onSubmit={handleSubmit}>
        
        {/* Name & Price Row */}
        <div className="form-row">
          <div className="form-group flex-1">
            <label><Tag size={16} /> Item Name</label>
            <input 
              type="text" 
              name="name"
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g., Spicy Chicken Wings"
              required 
            />
          </div>
          <div className="form-group flex-1">
            <label><DollarSign size={16} /> Price (₹)</label>
            <input 
              type="number" 
              name="price"
              value={formData.price} 
              onChange={handleChange} 
              placeholder="e.g., 250"
              min="0"
              required 
            />
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label><AlignLeft size={16} /> Description (Max 25 words)</label>
          <textarea 
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="A short, tasty description of the dish..."
            rows="2"
            className="menu-textarea"
          ></textarea>
        </div>

        {/* Category Row */}
        <div className="form-row">
          <div className="form-group flex-1">
            <label><ListIcon size={16} /> Select Category</label>
            <select name="section" value={formData.section} onChange={handleChange}>
              {existingSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div className="form-group flex-1">
            <label><PlusCircle size={16} /> Or Add New Category</label>
            <input 
              type="text" 
              name="newSection"
              value={formData.newSection} 
              onChange={handleChange} 
              placeholder="Type new category..."
            />
          </div>
        </div>

        {/* Quantity & Image Row */}
        <div className="form-row">
          <div className="form-group flex-1">
            <label><Hash size={16} /> Daily Quantity Limit</label>
            <input 
              type="number" 
              name="daily_quantity"
              value={formData.daily_quantity} 
              onChange={handleChange} 
              min="0"
              required 
            />
          </div>
          
          <div className="form-group flex-1">
            <label><ImageIcon size={16} /> Upload Image</label>
            <div className="file-upload-wrapper">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="file-upload-button">
                <UploadCloud size={20} />
                {imageFile ? imageFile.name : 'Choose an Image...'}
              </label>
            </div>
          </div>
        </div>

        <div className="form-group checkbox-group" style={{ marginTop: '10px' }}>
          <label>
            <input 
              type="checkbox" 
              name="available"
              checked={formData.available} 
              onChange={handleChange} 
            />
            Available for ordering
          </label>
        </div>

        <button type="submit" className="btn-add-menu" disabled={loading || uploading}>
          {loading || uploading ? (
            'Processing...'
          ) : (
            <><PlusCircle size={18} /> Add Menu Item</>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddMenu;
