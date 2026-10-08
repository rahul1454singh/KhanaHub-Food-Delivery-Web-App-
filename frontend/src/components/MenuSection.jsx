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

  const optimizeCloudinaryUrl = (url) => {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    // Prevent adding it twice
    if (url.includes('f_auto') || url.includes('q_auto')) return url;
    // Inject f_auto,q_auto after /upload/
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  };

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
            src={optimizeCloudinaryUrl(item.image.startsWith('http') ? item.image : item.image)} 
            alt={item.name} 
            className="card-image"
            style={{ filter: isOutOfStock ? 'grayscale(100%) opacity(0.7)' : 'none' }}
            fetchpriority="high"
            loading="eager"
            onError={(e) => { e.target.src = 'https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1788190253/newlogo_sterro.png'; setImageError(true); }}
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const localItems = menuData.map(item => ({
    ...item,
    section: item.category,
    available: true,
  }));
  const uniqueCats = [...new Set(localItems.map(item => item.section))];
  const formattedCats = ['All', ...uniqueCats.filter(c => c !== 'Drinks'), 'Drinks'];

  const [menuItems, setMenuItems] = useState(localItems);
  const [categories, setCategories] = useState(formattedCats);
  const [loading, setLoading] = useState(false);
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
    // 0. Check Search Term
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

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
  }, [activeCategory, dietaryFilter, searchTerm]);

  // Mobile Carousel Intersection Observer for "Pop" effect
  React.useEffect(() => {
    if (window.innerWidth > 600) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('center-pop');
        } else {
          entry.target.classList.remove('center-pop');
        }
      });
    }, {
      root: null,
      rootMargin: '0px -40% 0px -40%', // Triggers when card is in the middle 20% of the viewport horizontally
      threshold: 0
    });

    // Small delay to ensure cards are rendered in DOM
    const timeoutId = setTimeout(() => {
      const cards = document.querySelectorAll('.menu-card');
      cards.forEach(card => observer.observe(card));
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [menuItems, activeCategory, dietaryFilter, currentPage]);

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

        <div className="menu-search-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder="Search for food..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 20px 12px 40px',
                borderRadius: '25px',
                border: '1px solid #e2e8f0',
                outline: 'none',
                fontSize: '1rem',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
              }}
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#94a3b8" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
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
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="menu-card skeleton" style={{ height: '350px', border: 'none' }}></div>
            ))
          ) : currentItems.map(item => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
        
        {!loading && filteredMenu.length === 0 && (
          <div className="empty-state-container">
            <ShoppingCart className="empty-state-icon" />
            <h3 className="empty-state-title">No Items Found</h3>
            <p className="empty-state-text">We couldn't find any food matching your current filters.</p>
            <button className="btn-primary" onClick={() => { setSearchTerm(''); setDietaryFilter('all'); setActiveCategory('All'); }}>Clear Filters</button>
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
