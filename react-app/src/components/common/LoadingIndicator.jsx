import React from 'react';

function LoadingIndicator() {
  return (
    <div id="loadingIndicator" className="loading-indicator" style={{ display: 'flex' }}>
      <div className="spinner"></div>
      <span>데이터 로딩 중...</span>
    </div>
  );
}

export default LoadingIndicator;