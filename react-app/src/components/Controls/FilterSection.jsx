import React from 'react';
import { EMAIL_FILTERS } from '../../utils/constants';
import RangeSlider from './RangeSlider';

function FilterSection({
  followerRange,
  onFollowerRangeChange,
  viewsRange,
  onViewsRangeChange,
  emailFilter,
  onEmailFilterChange,
  scrapingRound,
  onScrapingRoundChange,
  availableRounds,
  maxFollowers,
  maxViews
}) {
  return (
    <>
      <div className="filter-section">
        <RangeSlider
          label="팔로워 수"
          min={0}
          max={maxFollowers}
          values={followerRange}
          onChange={onFollowerRangeChange}
          step={1000}
          logarithmic={true}
        />
      </div>
      <div className="filter-section">
        <RangeSlider
          label="조회수"
          min={0}
          max={maxViews}
          values={viewsRange}
          onChange={onViewsRangeChange}
          step={100}
          logarithmic={true}
        />
      </div>
      <div className="filter-section email-filter-section">
        <label htmlFor="emailFilter" className="filter-label">이메일 유무</label>
        <div className="filter-controls">
          <select
            id="emailFilter"
            className="filter-select"
            value={emailFilter}
            onChange={(e) => onEmailFilterChange(e.target.value)}
          >
            <option value={EMAIL_FILTERS.ALL}>전체</option>
            <option value={EMAIL_FILTERS.HAS_EMAIL}>이메일 있음</option>
            <option value={EMAIL_FILTERS.NO_EMAIL}>이메일 없음</option>
          </select>
        </div>
      </div>
      <div className="filter-section scraping-round-section">
        <label htmlFor="scrapingRound" className="filter-label">수집 회차</label>
        <div className="filter-controls">
          <select
            id="scrapingRound"
            className="filter-select"
            value={scrapingRound || ''}
            onChange={(e) => onScrapingRoundChange(e.target.value)}
          >
            <option value="">전체</option>
            {availableRounds && availableRounds.map(round => (
              <option key={round} value={round}>
                {round}차
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export default FilterSection;