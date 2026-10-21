import React, { useState, useEffect } from 'react';
import { ChevronRight, Tag, X } from 'lucide-react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import './Hero.css';

const Hero = () => {
  const { user } = useAuth();
  const [singlePromo, setSinglePromo] = useState(null);
  const [showPromo, setShowPromo] = useState(true);

  useEffect(() => {
    // Hide for owner and delivery
    if (user && (user.role === 'owner' || user.role === 'delivery' || user.email?.startsWith('db'))) {
      return;
    }

    const fetchPromo = async () => {
      const { data: settings } = await supabase.from('store_settings').select('is_promo_active').single();
      if (settings?.is_promo_active) {
        const { data: promos } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
        if (promos && promos.length === 1) {
          setSinglePromo(promos[0]);
        }
      }
    };
    fetchPromo();
  }, [user]);

  return (
    <section id="home" className="hero" style={{ position: 'relative' }}>
      {singlePromo && showPromo && (
        <div className="floating-promo-box animate-float">
          <button className="close-promo" onClick={() => setShowPromo(false)}><X size={14} /></button>
          <div className="promo-content">
            <div className="promo-badge"><Tag size={16} /> {singlePromo.code}</div>
            <div className="promo-discount">{singlePromo.discount_percentage}% OFF</div>
            <p className="promo-desc">
              {singlePromo.description || `Grab the offer using this promo code!`}
            </p>
          </div>
        </div>
      )}

      <div className="container hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Delicious Food,<br />
            <span>Delivered To You</span>
          </h1>
          <p className="hero-subtitle">
            Experience the best flavors in town. Order your favorite meals fresh and hot, right to your doorstep.
          </p>
          <a href="#menu" className="btn-primary">
            Explore Our Food
            <ChevronRight size={20} />
          </a>
        </div>
        
        <div className="hero-image-wrapper">
          <div className="hero-video-container">
            <video 
              src="https://res.cloudinary.com/n3wagpa9/video/upload/f_auto,q_auto/v1788190361/Create_a_single_premium_cinema_vfp46l.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              disablePictureInPicture
              className="hero-video"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
