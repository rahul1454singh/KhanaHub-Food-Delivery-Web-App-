import React, { useState, useEffect } from 'react';
import { Clock, Truck, Award, ArrowRight } from 'lucide-react';
import { menuData } from '../data/menuData';
import './InfoSection.css';

export const RestaurantInfo = () => {
  const sliderImages = menuData
    .filter(item => item.category !== 'Drinks')
    .slice(0, 6)
    .map(item => item.image);

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (sliderImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 3500);
    
    return () => clearInterval(interval);
  }, [sliderImages.length]);

  return (
    <section id="about" className="info-section">
      <div className="container info-container">
        <div className="info-image">
          <div className="info-image-slider">
            {sliderImages.length > 0 ? (
              sliderImages.map((img, index) => (
                <div 
                  key={index} 
                  className={`info-slide ${index === currentSlide ? 'active' : ''}`}
                >
                  <img src={img} alt={`Featured Food ${index + 1}`} />
                </div>
              ))
            ) : (
              <div className="info-slide active">
                <div style={{ width: '100%', height: '100%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Delicious Food
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="info-content">
          <h2>Why Choose KhanaHub?</h2>
          <p>
            We prepare every meal with fresh ingredients and authentic spices to bring you the best culinary experience. Whether you're craving a quick snack or a full feast, we've got you covered.
          </p>
          <ul className="features-list">
            <li>
              <div className="feature-icon"><Award size={22} /></div>
              <span className="feature-text">Premium Quality Ingredients</span>
            </li>
            <li>
              <div className="feature-icon"><Clock size={22} /></div>
              <span className="feature-text">Fast & Fresh Preparation</span>
            </li>
            <li>
              <div className="feature-icon"><Truck size={22} /></div>
              <span className="feature-text">Reliable Delivery to Your Door</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export const CallToAction = () => {
  return (
    <section className="cta-section">
      <div className="container">
        <h2 className="cta-title">Hungry Yet?</h2>
        <p className="cta-subtitle">
          Don't wait! Order now and get your favorite meals delivered hot and fresh right to your doorstep.
        </p>
        <a href="#menu" className="cta-btn">
          Order Your Food <ArrowRight size={20} />
        </a>
      </div>
    </section>
  );
};
