import React from 'react';
import StatusSelector from '../../common/StatusSelector';
import ContactStatusService from '../../../services/ContactStatusService';
import { formatNumber } from '../../../utils/formatters';

function TableView({ data, onShowDetail, onShowVideo, onDataUpdate, sortField, onSort }) {
  const handleShowVideo = (url, event) => {
    event.preventDefault();
    event.stopPropagation();
    onShowVideo(url);
  };

  return (
    <div id="tableView" className="view-container active">
      <div className="table-wrapper">
        <table id="dataTable">
          <thead>
            <tr>
              <th className="sortable" data-field="id" onClick={() => onSort('id')}>
                번호 {sortField === 'id' && '↓'}
              </th>
              <th>썸네일</th>
              <th className="sortable" data-field="author_name" onClick={() => onSort('author_name')}>
                작성자 이름 {sortField === 'author_name' && '↓'}
              </th>
              <th className="sortable" data-field="account_id" onClick={() => onSort('account_id')}>
                아이디 {sortField === 'account_id' && '↓'}
              </th>
              <th>연락 상태</th>
              <th className="sortable" data-field="follower_count" onClick={() => onSort('follower_count')}>
                팔로워 수 {sortField === 'follower_count' && '↓'}
              </th>
              <th className="sortable" data-field="views_count" onClick={() => onSort('views_count')}>
                조회수 {sortField === 'views_count' && '↓'}
              </th>
              <th className="sortable" data-field="likes_count" onClick={() => onSort('likes_count')}>
                좋아요 {sortField === 'likes_count' && '↓'}
              </th>
              <th className="sortable" data-field="engagement_rate" onClick={() => onSort('engagement_rate')}>
                참여율 {sortField === 'engagement_rate' && '↓'}
              </th>
              <th className="sortable" data-field="estimated_cpm" onClick={() => onSort('estimated_cpm')}>
                CPM($) {sortField === 'estimated_cpm' && '↓'}
              </th>
              <th>영상 링크</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            {data.map((item) => {
              const currentStatus = ContactStatusService.getStatus(item.id);
              return (
                <tr key={item.id}>
                  <td>{item.id || '-'}</td>
                  <td className="thumbnail-cell">
                    {(item.r2_thumbnail_url || item.local_thumbnail || item.thumbnail_url) ? (
                      <img
                        src={item.r2_thumbnail_url || item.local_thumbnail || item.thumbnail_url}
                        alt={item.author_name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZWVlIi8+PHRleHQgdGV4dC1hbmNob3I9Im1pZGRsZSIgeD1cIjI1XCIgeT1cIjI1XCIgc3R5bGU9XCJmaWxsOiNhYWE7Zm9udC1zaXplOjhweDtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO1wiPk5BPC90ZXh0Pjwvc3ZnPg==';
                        }}
                      />
                    ) : (
                      <span className="no-thumb">N/A</span>
                    )}
                  </td>
                  <td>
                    {item.author_name || '-'}
                  </td>
                  <td>@{item.account_id || '-'}</td>
                  <td className="status-cell">
                    <StatusSelector
                      influencerId={item.id}
                      currentStatus={currentStatus}
                      onStatusChange={onDataUpdate}
                    />
                  </td>
                  <td className="text-right">{formatNumber(item.follower_count) || '0'}</td>
                  <td className="text-right">{formatNumber(item.views_count) || '0'}</td>
                  <td className="text-right">{formatNumber(item.likes_count) || '0'}</td>
                  <td className="text-right">
                    {item.engagement_rate ?
                      (item.engagement_rate * 100).toFixed(2) + '%' : '-'}
                  </td>
                  <td className="text-right">
                    {item.estimated_cpm ? '$' + item.estimated_cpm.toFixed(0) : '-'}
                  </td>
                  <td>
                    {item.video_url && (
                      <>
                        <button
                          className="btn-detail-small"
                          onClick={(e) => handleShowVideo(item.video_url, e)}
                          title="동영상 보기"
                        >
                          🎬
                        </button>
                        <a
                          href={item.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-icon"
                          title="TikTok에서 열기"
                        >
                          ↗
                        </a>
                      </>
                    )}
                    <button
                      className="btn-detail-small"
                      onClick={() => onShowDetail(item)}
                      title="상세 정보"
                    >
                      📋
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableView;