import React from 'react';
import { VIEW_MODES } from '../../utils/constants';

function ViewToggle({ currentView, onViewChange }) {
  return (
    <div className="view-toggle">
      <button
        className={`view-btn ${currentView === VIEW_MODES.CARD ? 'active' : ''}`}
        data-view={VIEW_MODES.CARD}
        onClick={() => onViewChange(VIEW_MODES.CARD)}
      >
        카드 보기
      </button>
      <button
        className={`view-btn ${currentView === VIEW_MODES.TABLE ? 'active' : ''}`}
        data-view={VIEW_MODES.TABLE}
        onClick={() => onViewChange(VIEW_MODES.TABLE)}
      >
        테이블 보기
      </button>
    </div>
  );
}

export default ViewToggle;