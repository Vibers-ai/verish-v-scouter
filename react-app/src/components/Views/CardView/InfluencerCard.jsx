import React, { useState, useEffect } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import StatusSelector from '../../common/StatusSelector';
import ContactStatusService from '../../../services/ContactStatusService';
import LikesService from '../../../services/LikesService';
import useAuthStore from '../../../stores/authStore';
import { truncateText, formatNumber } from '../../../utils/formatters';
import { getUserColor } from '../../../utils/userColors';

function InfluencerCard({ influencer, onShowDetail, onShowVideo, onDataUpdate }) {
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(
    influencer.likes?.isLikedByCurrentUser || false
  );
  const [likedByUsers, setLikedByUsers] = useState(
    influencer.likes?.users || []
  );
  const [isSaving, setIsSaving] = useState(false);

  // Update like state when influencer data changes (e.g., when user changes)
  useEffect(() => {
    setIsLiked(influencer.likes?.isLikedByCurrentUser || false);
    setLikedByUsers(influencer.likes?.users || []);
  }, [influencer.likes]);
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

  const handleToggleLike = async (event) => {
    event.stopPropagation();
    if (isSaving || !user) return;

    try {
      setIsSaving(true);
      const result = await LikesService.toggleUserLike(
        influencer.id,
        user.email,
        user.name,
        user.id
      );

      if (result.liked) {
        // Add current user to the liked list
        setLikedByUsers((prev) => [
          { email: user.email, name: user.name },
          ...prev,
        ]);
        setIsLiked(true);
      } else {
        // Remove current user from the liked list
        setLikedByUsers((prev) =>
          prev.filter((u) => u.email !== user.email)
        );
        setIsLiked(false);
      }

      onDataUpdate();
    } catch (error) {
      console.error('Failed to toggle like status:', error);
      alert('좋아요 상태 변경 실패');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to get last 2 characters from name
  const getInitials = (name) => {
    if (!name) return '??';
    // Remove spaces and get last 2 characters
    const cleanName = name.replace(/\s/g, '');
    if (cleanName.length >= 2) {
      return cleanName.substring(cleanName.length - 2).toUpperCase();
    }
    return cleanName.toUpperCase().padStart(2, '?');
  };


  // Show max 3 users who liked
  const displayUsers = likedByUsers.slice(0, 3);
  const remainingCount = likedByUsers.length - 3;

  const currentStatus = ContactStatusService.getStatus(influencer.id);

  return (
    <div className="influencer-card">
      <div
        className="card-image"
        onClick={(e) => influencer.video_url && handleShowVideo(influencer.video_url, e)}
        style={{ cursor: influencer.video_url ? 'pointer' : 'default', position: 'relative' }}
      >
        {(influencer.scraping_round === '5' || influencer.scraping_round === 5)
           && (
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
          className={`like-btn ${isLiked ? 'liked' : ''} ${isSaving ? 'saving' : ''}`}
          onClick={handleToggleLike}
          title={isLiked ? '좋아요 취소' : '좋아요'}
          disabled={isSaving || !user}
        >
          {isLiked ? (
            <FaHeart size={30} color="#ef4444" />
          ) : (
            <FaRegHeart size={30} color="#6b7280" />
          )}
        </button>

        {/* Display users who liked */}
        {likedByUsers.length > 0 && (
          <div className="liked-by-users">
            {displayUsers.map((likedUser, index) => {
              const color = getUserColor(likedUser.email);
              return (
                <div
                  key={likedUser.email}
                  className="user-avatar"
                  title={`${likedUser.name || likedUser.email}`}
                  style={{
                    zIndex: displayUsers.length - index, // Higher z-index for items closer to heart (right side)
                    right: `${index * 28}px`, // Use right positioning instead of left
                    backgroundColor: color.fill,
                    borderColor: color.stroke,
                  }}
                >
                  {getInitials(likedUser.name)}
                </div>
              );
            })}
            {remainingCount > 0 && (
              <div
                className="user-avatar more-users"
                title={`${remainingCount}명 더`}
                style={{
                  zIndex: 0, // Lowest z-index for the "+N" indicator (leftmost)
                  right: `${displayUsers.length * 28}px`
                }}
              >
                +{remainingCount}
              </div>
            )}
          </div>
        )}
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