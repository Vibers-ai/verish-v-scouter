import React from 'react';

function NavigationButtons({ viewMode, onViewModeChange }) {
  return (
    <div className="navigation-buttons">
      <button
        className={`nav-button ${viewMode === 'all' ? 'active' : ''}`}
        onClick={() => onViewModeChange('all')}
      >
        <svg
          className="nav-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span>모든 인플루언서</span>
      </button>

      <button
        className={`nav-button ${viewMode === 'saved' ? 'active' : ''}`}
        onClick={() => onViewModeChange('saved')}
      >
        <svg
          className="nav-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span>좋아요된 인플루언서</span>
      </button>
    </div>
  );
}

export default NavigationButtons;