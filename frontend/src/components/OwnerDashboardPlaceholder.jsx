import React from 'react';

const OwnerDashboardPlaceholder = () => {
  return (
    <div style={{ padding: '100px 20px', textAlign: 'center', minHeight: '60vh' }}>
      <h1 style={{ fontSize: '2.5rem', color: '#16a34a', marginBottom: '20px' }}>Owner Dashboard</h1>
      <p style={{ color: '#475569', fontSize: '1.2rem', marginBottom: '30px' }}>
        Owner authenticated successfully.
      </p>
      <div style={{ padding: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'inline-block' }}>
        <p style={{ color: '#166534', margin: 0 }}>This is a secure area for KhanaHub administrators only.</p>
      </div>
    </div>
  );
};

export default OwnerDashboardPlaceholder;
