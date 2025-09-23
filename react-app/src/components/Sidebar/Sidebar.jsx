import React from 'react';
import NavigationButtons from './NavigationButtons';
import SearchSection from '../Controls/SearchSection';
import FilterSection from '../Controls/FilterSection';
import SortSection from '../Controls/SortSection';
import './Sidebar.css';

function Sidebar({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearch,
  onClearSearch,
  followerRange,
  onFollowerRangeChange,
  viewsRange,
  onViewsRangeChange,
  maxFollowers,
  maxViews,
  emailFilter,
  onEmailFilterChange,
  scrapingRound,
  onScrapingRoundChange,
  availableRounds,
  sortField,
  onSortChange,
  sortOrder,
  onSortOrderToggle,
  isMobileOpen,
  onMobileToggle
}) {
  return (
    <>
      <div className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`} onClick={onMobileToggle} />
      <div className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-wrapper">
            <img src="/v-scouter_logo.png" alt="V-Scouter" className="sidebar-logo" />
            <h2>V-Scouter</h2>
          </div>
          <button className="sidebar-close-btn" onClick={onMobileToggle}>
            ×
          </button>
        </div>

        <NavigationButtons
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />

        <div className="sidebar-filters">
          <div className="filter-group search-group">
            <h3>검색</h3>
            <div className="search-wrapper">
              <SearchSection
                searchTerm={searchTerm}
                onSearch={onSearch}
                onClearSearch={onClearSearch}
              />
            </div>
          </div>

          <div className="filter-group">
            <h3>필터</h3>
            <FilterSection
              followerRange={followerRange}
              onFollowerRangeChange={onFollowerRangeChange}
              viewsRange={viewsRange}
              onViewsRangeChange={onViewsRangeChange}
              maxFollowers={maxFollowers}
              maxViews={maxViews}
              emailFilter={emailFilter}
              onEmailFilterChange={onEmailFilterChange}
              scrapingRound={scrapingRound}
              onScrapingRoundChange={onScrapingRoundChange}
              availableRounds={availableRounds}
            />
          </div>

          <div className="filter-group">
            <h3>정렬</h3>
            <SortSection
              sortField={sortField}
              onSortChange={onSortChange}
              sortOrder={sortOrder}
              onSortOrderToggle={onSortOrderToggle}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;