import React from 'react';
import { SORT_ORDERS } from '../../utils/constants';

function SortSection({ sortField, onSortChange, sortOrder, onSortOrderToggle }) {
  return (
    <div className="sort-section">
      <div className="sort-controls">
        <select
          id="sortSelect"
          className="sort-select"
          value={sortField}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="">선택하세요</option>
          <option value="follower_count">팔로워 수</option>
          <option value="views_count">조회수</option>
          <option value="engagement_rate">참여율</option>
          <option value="likes_count">좋아요 수</option>
          <option value="estimated_cpm">예상 CPM</option>
          <option value="author_name">이름순</option>
        </select>
        <button
          id="sortOrderBtn"
          title="정렬 순서"
          onClick={onSortOrderToggle}
        >
          {sortOrder === SORT_ORDERS.DESC ? '↓' : '↑'}
        </button>
      </div>
    </div>
  );
}

export default SortSection;