import React from 'react';
import { ChevronRight } from 'lucide-react';
import './Hero.css';

const Hero = () => {
  return (
    <section id="home" className="hero">
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
              src="https://res.cloudinary.com/n3wagpa9/video/upload/f_auto,q_auto/v1/khanahub/video/Create_a_single_premium_cinema.mp4" 
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
