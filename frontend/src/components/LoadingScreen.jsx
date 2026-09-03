import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="khanahub-loading-overlay" role="status" aria-live="polite">
      <div className="khanahub-loading-box">
        <div className="khanahub-loading-brand">
          <img 
            src="https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1788190253/newlogo_sterro.png" 
            alt="KhanaHub Logo" 
            className="khanahub-loading-logo" 
          />
          <span className="navbar-title italic-brand khanahub-loading-title">KhanaHub</span>
        </div>
        <p className="khanahub-loading-text">{message}</p>
        <div className="khanahub-loading-spinner-wrapper">
          <div className="khanahub-loading-spinner" />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
