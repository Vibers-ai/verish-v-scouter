import React, { useState } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import StatusSelector from '../../common/StatusSelector';
import ContactStatusService from '../../../services/ContactStatusService';
import InfluencerService from '../../../services/InfluencerService';
import { truncateText, formatNumber } from '../../../utils/formatters';

function InfluencerCard({ influencer, onShowDetail, onShowVideo, onDataUpdate }) {
  const [isSaved, setIsSaved] = useState(influencer.saved || false);
  const [isSaving, setIsSaving] = useState(false);
  const handleCopyEmail = (email, event) => {
    event.stopPropagation();

    navigator.clipboard.writeText(email).then(() => {
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = '✅';
      button.classList.add('copied');

      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = email;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅';
        button.classList.add('copied');

        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy email:', err);
        alert('이메일 복사 실패');
      }

      document.body.removeChild(textArea);
    });
  };

  const handleShowVideo = (url, event) => {
    event.preventDefault();
    event.stopPropagation();
    onShowVideo(url);
  };

  const handleToggleSaved = async (event) => {
    event.stopPropagation();
    if (isSaving) return;

    try {
      setIsSaving(true);
      await InfluencerService.toggleSaved(influencer.id);
      setIsSaved(!isSaved);
      onDataUpdate();
    } catch (error) {
      console.error('Failed to toggle saved status:', error);
      alert('저장 상태 변경 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = ContactStatusService.getStatus(influencer.id);

  return (
    <div className="influencer-card">
      <div
        className="card-image"
        onClick={(e) => influencer.video_url && handleShowVideo(influencer.video_url, e)}
        style={{ cursor: influencer.video_url ? 'pointer' : 'default', position: 'relative' }}
      >
        {(influencer.scraping_round === '3' || influencer.scraping_round === '4' ||
          influencer.scraping_round === 3 || influencer.scraping_round === 4) && (
          <div className="new-badge">NEW</div>
        )}
        {(influencer.r2_thumbnail_url || influencer.local_thumbnail || influencer.thumbnail_url) ? (
          <img
            src={influencer.r2_thumbnail_url || influencer.local_thumbnail || influencer.thumbnail_url}
            alt={influencer.author_name}
            loading="lazy"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTAwIiBzdHlsZT0iZmlsbDojYWFhO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjEycHg7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjsiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
        ) : (
          <div className="no-image">No Image</div>
        )}
        {influencer.video_url && (
          <a
            href={influencer.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-external-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            ↗
          </a>
        )}
        <button
          className={`like-btn ${isSaved ? 'liked' : ''} ${isSaving ? 'saving' : ''}`}
          onClick={handleToggleSaved}
          title={isSaved ? '좋아요 취소' : '좋아요'}
          disabled={isSaving}
        >
          {isSaved ? (
            <FaHeart size={20} color="#ef4444" />
          ) : (
            <FaRegHeart size={20} color="#6b7280" />
          )}
        </button>
      </div>
      <div className="card-content">
        <div className="card-header">
          <div className="card-title-section">
            <h3 className="card-title">
              {influencer.author_name || 'Unknown'}
            </h3>
            <p className="card-account">@{influencer.account_id || 'unknown'}</p>
          </div>
          <div className="status-section">
            <StatusSelector
              influencerId={influencer.id}
              currentStatus={currentStatus}
              onStatusChange={onDataUpdate}
            />
          </div>
        </div>
        <div className="email-section">
          {influencer.email ? (
            <div className="email-container">
              <p className="card-email" title={influencer.email}>
                {influencer.email}
              </p>
              <button
                className="copy-email-btn"
                onClick={(e) => handleCopyEmail(influencer.email, e)}
                title="이메일 복사"
                aria-label="Copy email"
              >
                📋
              </button>
            </div>
          ) : (
            <div className="email-container no-email">
              <p className="card-email no-email">📧 이메일 없음</p>
            </div>
          )}
        </div>

        <div className="card-stats">
          <div className="stat">
            <span className="stat-label">팔로워</span>
            <span className="stat-value">
              {formatNumber(influencer.follower_count) || '0'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">조회수</span>
            <span className="stat-value">
              {formatNumber(influencer.views_count) || '0'}
            </span>
          </div>
          <button
            className="btn-detail-inline"
            onClick={() => onShowDetail(influencer)}
          >
            상세 정보
          </button>
        </div>

        <div className="card-caption">
          {truncateText(influencer.video_caption, 100)}
        </div>
      </div>
    </div>
  );
}

export default InfluencerCard;