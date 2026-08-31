import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="khanahub-loading-overlay" role="status" aria-live="polite">
      <div className="khanahub-loading-box">
        <div className="khanahub-loading-brand">
          <img 
            src="/logo/newlogo.png" 
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
