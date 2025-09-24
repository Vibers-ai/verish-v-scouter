import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header/Header';
import InfluencerTabs from './components/Tabs/InfluencerTabs';
import Sidebar from './components/Sidebar/Sidebar';
import CardView from './components/Views/CardView/CardView';
import TableView from './components/Views/TableView/TableView';
import Pagination from './components/Pagination/Pagination';
import DetailModal from './components/Modals/DetailModal';
import VideoModal from './components/Modals/VideoModal';
import LoadingIndicator from './components/common/LoadingIndicator';
import MigrationTool from './components/MigrationTool/MigrationTool';
import TagsService from './services/TagsService';
import ContactStatusService from './services/ContactStatusService';
import InfluencerService from './services/InfluencerService';
import { VIEW_MODES, INFLUENCER_TYPES, SORT_ORDERS } from './utils/constants';

function App() {
  // Always use Supabase now
  const useSupabase = true;

  // Data states
  const [allData, setAllData] = useState([]);
  const [summaryData, setSummaryData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [absoluteMaxFollowers, setAbsoluteMaxFollowers] = useState(10000000);
  const [absoluteMaxViews, setAbsoluteMaxViews] = useState(100000000);

  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTypeFilter, setCurrentTypeFilter] = useState(INFLUENCER_TYPES.ALL);
  const [followerRange, setFollowerRange] = useState([0, absoluteMaxFollowers]);
  const [viewsRange, setViewsRange] = useState([0, absoluteMaxViews]);
  const [currentEmailFilter, setCurrentEmailFilter] = useState('');
  const [scrapingRoundFilter, setScrapingRoundFilter] = useState('');
  const [availableRounds, setAvailableRounds] = useState([]);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState(SORT_ORDERS.DESC);

  // View states
  const [currentView, setCurrentView] = useState(VIEW_MODES.CARD);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'saved'
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Modal states
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Contact status and tags states (for triggering re-renders)
  const [, forceUpdate] = useState(0);

  // Load data on mount
  useEffect(() => {
    fetchMaxValues();
  }, []);

  // Fetch absolute max values once
  const fetchMaxValues = async () => {
    try {
      const maxValues = await InfluencerService.getMaxValues();
      if (maxValues) {
        setAbsoluteMaxFollowers(maxValues.maxFollowers || 10000000);
        setAbsoluteMaxViews(maxValues.maxViews || 100000000);
        // Update the ranges if they're still at default values
        setFollowerRange([0, maxValues.maxFollowers || 10000000]);
        setViewsRange([0, maxValues.maxViews || 100000000]);
      }
    } catch (error) {
      console.error('Error fetching max values:', error);
    }
  };

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load from Supabase
      const options = {
        page: currentPage,
        pageSize: itemsPerPage === 'all' ? 1000 : itemsPerPage,
        sortField: sortField || null,
        sortOrder: sortOrder,
        searchTerm: searchTerm,
        influencerType: currentTypeFilter,
        followerRange: followerRange,
        viewsRange: viewsRange,
        emailFilter: currentEmailFilter,
        scrapingRound: scrapingRoundFilter || null,
        saved: viewMode === 'saved' ? true : null,
        includeTags: true,
        includeContactStatus: true
      };

      console.log('Loading data with viewMode:', viewMode, 'saved filter:', viewMode === 'saved' ? true : null);

      const result = await InfluencerService.getInfluencers(options);
      const summaries = await InfluencerService.getAllSummaries();

      // Get all unique scraping rounds (without filters) for dropdown
      console.log('Fetching unique scraping rounds from App...');
      const allRoundsResult = await InfluencerService.getUniqueScrapingRounds();
      console.log('Received rounds in App:', allRoundsResult);

      setAllData(result.data);
      setTotalCount(result.count);
      setSummaryData(summaries);

      // Store all available rounds
      if (allRoundsResult && allRoundsResult.length > 0) {
        console.log('Setting available rounds:', allRoundsResult);
        setAvailableRounds(allRoundsResult);
      } else {
        console.log('No scraping rounds found or empty result');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoading(false);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }, [currentPage, itemsPerPage, sortField, sortOrder, searchTerm, currentTypeFilter,
      followerRange, viewsRange, currentEmailFilter, scrapingRoundFilter, viewMode]);

  // Since all filtering and sorting is done server-side,
  // we can directly use the allData
  const filteredData = useMemo(() => {
    return allData;
  }, [allData]);

  // Use absolute max values for sliders (not filtered data)
  const maxFollowers = absoluteMaxFollowers;
  const maxViews = absoluteMaxViews;


  // Get current summary based on selected type
  const currentSummary = useMemo(() => {
    if (summaryData && summaryData[currentTypeFilter]) {
      return summaryData[currentTypeFilter];
    }
    return summaryData.all || summaryData || {};
  }, [summaryData, currentTypeFilter]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    // Pagination is done server-side in Supabase
    return filteredData;
  }, [filteredData]);

  // Handlers
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setFollowerRange([0, maxFollowers]);
    setViewsRange([0, maxViews]);
    setCurrentEmailFilter('');
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((type) => {
    setCurrentTypeFilter(type);
    setCurrentPage(1);
  }, []);

  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
  }, []);

  const handleSortChange = useCallback((field) => {
    setSortField(field);
    setCurrentPage(1);
  }, []);

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder(prev => prev === SORT_ORDERS.DESC ? SORT_ORDERS.ASC : SORT_ORDERS.DESC);
    setCurrentPage(1);
  }, []);

  const handleFollowerRangeChange = useCallback((values) => {
    setFollowerRange(values);
    setCurrentPage(1);
  }, []);

  const handleViewsRangeChange = useCallback((values) => {
    setViewsRange(values);
    setCurrentPage(1);
  }, []);

  const handleEmailFilterChange = useCallback((email) => {
    setCurrentEmailFilter(email);
    setCurrentPage(1);
  }, []);

  const handleScrapingRoundChange = useCallback((round) => {
    setScrapingRoundFilter(round);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((items) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  }, []);

  const handleShowDetail = useCallback((influencer) => {
    setSelectedInfluencer(influencer);
    setIsDetailModalOpen(true);
  }, []);

  const handleShowVideo = useCallback((url) => {
    setVideoUrl(url);
    setIsVideoModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedInfluencer(null);
  }, []);

  const handleCloseVideoModal = useCallback(() => {
    setIsVideoModalOpen(false);
    setVideoUrl(null);
  }, []);

  // Force update when contact status or tags change
  const handleDataUpdate = useCallback(() => {
    forceUpdate(prev => prev + 1);
    loadData(); // Reload data to reflect changes
  }, [loadData]);

  // Handle view mode change (all/saved)
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    setCurrentPage(1);
    // Don't call loadData here, let useEffect handle it
  }, []);

  // Handle sidebar mobile toggle
  const handleSidebarMobileToggle = useCallback(() => {
    setIsSidebarMobileOpen(prev => !prev);
  }, []);

  // Handle mobile menu button
  const handleMobileMenuClick = useCallback(() => {
    setIsSidebarMobileOpen(true);
  }, []);

  // Reload data when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="app-layout">
      {isLoading && <LoadingIndicator />}

        <Sidebar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          searchTerm={searchTerm}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          followerRange={followerRange}
          onFollowerRangeChange={handleFollowerRangeChange}
          viewsRange={viewsRange}
          onViewsRangeChange={handleViewsRangeChange}
          maxFollowers={maxFollowers}
          maxViews={maxViews}
          emailFilter={currentEmailFilter}
          onEmailFilterChange={handleEmailFilterChange}
          scrapingRound={scrapingRoundFilter}
          onScrapingRoundChange={handleScrapingRoundChange}
          availableRounds={availableRounds}
          sortField={sortField}
          onSortChange={handleSortChange}
          sortOrder={sortOrder}
          onSortOrderToggle={handleSortOrderToggle}
          isMobileOpen={isSidebarMobileOpen}
          onMobileToggle={handleSidebarMobileToggle}
        />

        <div className="main-content">
          <button className="mobile-menu-btn" onClick={handleMobileMenuClick}>
            ☰
          </button>

          <Header summary={currentSummary} />

          <div className="pagination-info">
            <span id="showingInfo">
              표시 중: {totalCount > 0 ?
                `${(currentPage - 1) * (itemsPerPage === 'all' ? totalCount : itemsPerPage) + 1}-${Math.min(currentPage * (itemsPerPage === 'all' ? totalCount : itemsPerPage), totalCount)} / ${totalCount}`
                : '0 / 0'}
            </span>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="items-per-page">
                <label>페이지당:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">전체</option>
                </select>
              </div>

              <div className="view-toggle">
                <button
                  className={`view-btn ${currentView === VIEW_MODES.CARD ? 'active' : ''}`}
                  onClick={() => handleViewChange(VIEW_MODES.CARD)}
                >
                  카드 보기
                </button>
                <button
                  className={`view-btn ${currentView === VIEW_MODES.TABLE ? 'active' : ''}`}
                  onClick={() => handleViewChange(VIEW_MODES.TABLE)}
                >
                  테이블 보기
                </button>
              </div>
            </div>
          </div>

          <main>
            {currentView === VIEW_MODES.CARD ? (
              <CardView
                data={paginatedData}
                onShowDetail={handleShowDetail}
                onShowVideo={handleShowVideo}
                onDataUpdate={handleDataUpdate}
              />
            ) : (
              <TableView
                data={paginatedData}
                onShowDetail={handleShowDetail}
                onShowVideo={handleShowVideo}
                onDataUpdate={handleDataUpdate}
                sortField={sortField}
                onSort={handleSortChange}
              />
            )}
          </main>

          {itemsPerPage !== 'all' && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / itemsPerPage)}
              onPageChange={handlePageChange}
            />
          )}

          {isDetailModalOpen && (
            <DetailModal
              influencer={selectedInfluencer}
              isOpen={isDetailModalOpen}
              onClose={handleCloseDetailModal}
              onShowVideo={handleShowVideo}
            />
          )}

          {isVideoModalOpen && (
            <VideoModal
              videoUrl={videoUrl}
              isOpen={isVideoModalOpen}
              onClose={handleCloseVideoModal}
            />
          )}

          {/* Migration Tool - Hidden after migration complete */}
          {/* <MigrationTool onMigrationComplete={() => loadData()} /> */}
        </div>
    </div>
  );
}

export default App
