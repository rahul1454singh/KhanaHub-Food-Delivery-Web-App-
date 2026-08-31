import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { menuData } from '../data/menuData'; // Fallback when Supabase table is empty
import { supabase } from '../api/supabase';
import './MenuSection.css';

import { useCart } from '../context/CartContext';

const MenuCard = ({ item }) => {
  const [imageError, setImageError] = useState(false);
  const { addToCart } = useCart();

  // daily_quantity does not exist in DB schema — only check `available`
  const isOutOfStock = item.available === false;
  const categoryClass = item.section ? `category-${item.section.toLowerCase().replace(/\s+/g, '-')}` : '';

  return (
    <div className={`menu-card ${categoryClass} ${isOutOfStock ? 'out-of-stock-public-card' : ''}`}>
      <div className="card-image-container" style={{ position: 'relative' }}>
        {isOutOfStock && (
          <div className="out-of-stock-overlay">
            <span>OUT OF STOCK</span>
          </div>
        )}
        {!imageError ? (
          <img 
            src={item.image.startsWith('http') ? item.image : item.image} 
            alt={item.name} 
            className="card-image"
            style={{ filter: isOutOfStock ? 'grayscale(100%) opacity(0.7)' : 'none' }}
            onError={(e) => { e.target.src = '/logo/newlogo.png'; setImageError(true); }}
          />
        ) : (
          <div className="image-fallback">
            <span>Image not available</span>
          </div>
        )}
      </div>
      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{item.name}</h3>
          <span className="card-price">₹{item.price}</span>
        </div>
        {item.description && <p className="card-description">{item.description}</p>}
        <button 
          className="add-to-cart-btn" 
          aria-label={`Add ${item.name} to cart`}
          onClick={() => addToCart(item)}
          disabled={isOutOfStock}
          style={{ opacity: isOutOfStock ? 0.5 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
        >
          <ShoppingCart size={18} />
          {isOutOfStock ? 'Out of Stock' : 'Add This Food'}
        </button>
      </div>
    </div>
  );
};

const MenuSection = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [dietaryFilter, setDietaryFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  const [currentPage, setCurrentPage] = useState(1);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All', 'Drinks']);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    fetchMenu();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('public_menu_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu' },
        (payload) => {
          fetchMenu();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menu')
        .select('*')
        .order('section', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // ✅ Fallback: if Supabase table is empty (not seeded), use local menuData
      if (!data || data.length === 0) {
        console.warn('Supabase menu table is empty — using local menuData as fallback.');
        const localItems = menuData.map(item => ({
          ...item,
          section: item.category,   // local uses 'category', component expects 'section'
          available: true,
        }));
        setMenuItems(localItems);
        const uniqueCats = [...new Set(localItems.map(item => item.section))];
        const formattedCats = ['All', ...uniqueCats.filter(c => c !== 'Drinks'), 'Drinks'];
        setCategories(formattedCats);
        return;
      }

      setMenuItems(data);

      // Extract unique categories
      const uniqueCats = [...new Set(data.map(item => item.section))];
      // Move Drinks to end, Add All to front
      const formattedCats = ['All', ...uniqueCats.filter(c => c !== 'Drinks'), 'Drinks'];
      setCategories(formattedCats);
    } catch (err) {
      console.error('Error fetching public menu:', err);
      // ✅ Fallback on network/auth error too
      const localItems = menuData.map(item => ({
        ...item,
        section: item.category,
        available: true,
      }));
      setMenuItems(localItems);
      const uniqueCats = [...new Set(localItems.map(item => item.section))];
      const formattedCats = ['All', ...uniqueCats.filter(c => c !== 'Drinks'), 'Drinks'];
      setCategories(formattedCats);
    } finally {
      setLoading(false);
    }
  };

  const filteredMenu = menuItems.filter(item => {
    // 1. Check Category
    let matchCategory = false;
    if (activeCategory === 'All') {
      matchCategory = item.section !== 'Drinks';
    } else {
      matchCategory = item.section === activeCategory;
    }

    // 2. Check Veg / Non-Veg (default 'all' shows both)
    // Assuming simple string matching for now if isVeg is not in DB
    // We can infer veg by name if isVeg doesn't exist yet, but for now we'll allow all.
    let matchDietary = true;
    if (activeCategory !== 'Drinks') {
      const isItemVeg = item.name.toLowerCase().includes('veg') || item.name.toLowerCase().includes('paneer') || item.name.toLowerCase().includes('margherita') || item.name.toLowerCase().includes('fries');
      if (dietaryFilter === 'veg') {
        matchDietary = isItemVeg;
      } else if (dietaryFilter === 'non-veg') {
        matchDietary = !isItemVeg;
      } else {
        matchDietary = true;
      }
    }

    return matchCategory && matchDietary;
  });

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, dietaryFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredMenu.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredMenu.slice(startIndex, startIndex + itemsPerPage);

  const scrollToMenu = () => {
    if (menuRef.current) {
      const navbarOffset = 90;
      const elementPosition = menuRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setTimeout(scrollToMenu, 30);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      setTimeout(scrollToMenu, 30);
    }
  };

  return (
    <section id="menu" className="menu-section" ref={menuRef}>
      <span id="menu-section" style={{ position: 'relative', top: '-100px' }} />
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Our Menu</h2>
          <p className="section-subtitle">Discover our delicious offerings</p>
        </div>

        <div className="filter-controls">
          <div className="category-nav" style={{ marginBottom: 0 }}>
            {categories.map((category, index) => (
              <button 
                key={index}
                className={`category-btn ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {activeCategory !== 'Drinks' && (
            <div className="dietary-filter-nav">
              <button 
                className={`dietary-btn ${dietaryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDietaryFilter('all')}
              >
                All Foods
              </button>
              <button 
                className={`dietary-btn veg-btn ${dietaryFilter === 'veg' ? 'active' : ''}`}
                onClick={() => setDietaryFilter('veg')}
              >
                🌱 Veg Only
              </button>
              <button 
                className={`dietary-btn nonveg-btn ${dietaryFilter === 'non-veg' ? 'active' : ''}`}
                onClick={() => setDietaryFilter('non-veg')}
              >
                🍗 Non-Veg Only
              </button>
            </div>
          )}
        </div>

        <div className="menu-grid">
          {currentItems.map(item => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
        
        {filteredMenu.length === 0 && (
          <div className="text-center mt-4">
            <p>No items found in this category.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="pagination-btn" 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="pagination-btn" 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default MenuSection;
