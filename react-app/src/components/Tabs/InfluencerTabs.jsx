import React from 'react';
import { INFLUENCER_TYPES } from '../../utils/constants';

function InfluencerTabs({ currentType, onTypeChange }) {
  return (
    <div className="influencer-tabs">
      <button
        className={`tab-btn ${currentType === INFLUENCER_TYPES.ALL ? 'active' : ''}`}
        data-type={INFLUENCER_TYPES.ALL}
        onClick={() => onTypeChange(INFLUENCER_TYPES.ALL)}
      >
        전체 인플루언서
      </button>
      <button
        className={`tab-btn ${currentType === INFLUENCER_TYPES.REGULAR ? 'active' : ''}`}
        data-type={INFLUENCER_TYPES.REGULAR}
        onClick={() => onTypeChange(INFLUENCER_TYPES.REGULAR)}
      >
        일반 인플루언서
      </button>
      <button
        className={`tab-btn ${currentType === INFLUENCER_TYPES.SALES ? 'active' : ''}`}
        data-type={INFLUENCER_TYPES.SALES}
        onClick={() => onTypeChange(INFLUENCER_TYPES.SALES)}
      >
        세일즈 인플루언서
      </button>
    </div>
  );
}

export default InfluencerTabs;