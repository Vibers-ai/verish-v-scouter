import React from 'react';
import { formatNumber } from '../../utils/formatters';

function SummaryCards({ summary = {} }) {
  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div className="card-label">총 인플루언서</div>
        <div className="card-value" id="totalInfluencers">
          {summary.total_influencers ? summary.total_influencers.toLocaleString() : '-'}
        </div>
      </div>
      <div className="summary-card">
        <div className="card-label">총 조회수</div>
        <div className="card-value" id="totalViews">
          {summary.total_views ? formatNumber(summary.total_views) : '-'}
        </div>
      </div>
      <div className="summary-card">
        <div className="card-label">총 팔로워</div>
        <div className="card-value" id="totalFollowers">
          {summary.total_followers ? formatNumber(summary.total_followers) : '-'}
        </div>
      </div>
      <div className="summary-card">
        <div className="card-label">평균 참여율</div>
        <div className="card-value" id="avgEngagement">
          {summary.avg_engagement_rate ?
            (summary.avg_engagement_rate * 100).toFixed(2) + '%' : '-'}
        </div>
      </div>
      <div className="summary-card">
        <div className="card-label">평균 CPM</div>
        <div className="card-value" id="avgCPM">
          {summary.avg_cpm ? '$' + summary.avg_cpm.toFixed(2) : '-'}
        </div>
      </div>
    </div>
  );
}

export default SummaryCards;