import React from 'react';

const IOSSpinner = ({ size = 20, color = 'currentColor', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`spinner-ios ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = i * 45;
        const opacity = Math.max(0.15, (i + 1) / 8);
        return (
          <rect
            key={i}
            x="10.75"
            y="1.5"
            width="2.5"
            height="5.5"
            rx="1.25"
            fill={color}
            opacity={opacity}
            transform={`rotate(${angle} 12 12)`}
          />
        );
      })}
    </svg>
  );
};

export default IOSSpinner;
