import React from 'react';
import { formatNumber } from '../../utils/formatters';

function DetailModal({ influencer, isOpen, onClose, onShowVideo }) {
  if (!isOpen || !influencer) return null;

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
    onShowVideo(url, influencer.platform);
  };

  return (
    <div id="detailModal" className="modal" style={{ display: 'block' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <div id="modalBody">
          <div className="modal-header">
            <h2>{influencer.author_name || 'Unknown'}</h2>
            <p className="modal-account">@{influencer.account_id || 'unknown'}</p>
          </div>

          <div className="modal-image">
            {(influencer.r2_thumbnail_url || influencer.local_thumbnail || influencer.thumbnail_url) ? (
              <img
                src={influencer.r2_thumbnail_url || influencer.local_thumbnail || influencer.thumbnail_url}
                alt={influencer.author_name}
              />
            ) : (
              <div className="no-image-large">No Image Available</div>
            )}
          </div>

          <div className="modal-info">
            <h3>프로필 소개</h3>
            <p>{influencer.profile_intro || 'N/A'}</p>

            <h3>영상 설명</h3>
            <p>{influencer.video_caption || 'N/A'}</p>

            <h3>상세 통계</h3>
            <div className="detail-stats">
              <div className="detail-stat">
                <span>팔로워 수:</span>
                <strong>{formatNumber(influencer.follower_count) || '0'}</strong>
              </div>
              <div className="detail-stat">
                <span>조회수:</span>
                <strong>{formatNumber(influencer.views_count) || '0'}</strong>
              </div>
              <div className="detail-stat">
                <span>좋아요:</span>
                <strong>{formatNumber(influencer.likes_count) || '0'}</strong>
              </div>
              <div className="detail-stat">
                <span>댓글:</span>
                <strong>{formatNumber(influencer.comments_count) || '0'}</strong>
              </div>
              <div className="detail-stat">
                <span>공유:</span>
                <strong>{formatNumber(influencer.shares_count) || '0'}</strong>
              </div>
              <div className="detail-stat">
                <span>참여율:</span>
                <strong>
                  {influencer.engagement_rate ?
                    (influencer.engagement_rate * 100).toFixed(3) + '%' : 'N/A'}
                </strong>
              </div>
              <div className="detail-stat">
                <span>댓글 전환율:</span>
                <strong>
                  {influencer.comment_conversion ?
                    (influencer.comment_conversion * 100).toFixed(3) + '%' : 'N/A'}
                </strong>
              </div>
              <div className="detail-stat">
                <span>팔로워 품질:</span>
                <strong>
                  {influencer.follower_quality ?
                    influencer.follower_quality.toFixed(2) : 'N/A'}
                </strong>
              </div>
              <div className="detail-stat">
                <span>예상 CPM:</span>
                <strong>
                  {influencer.estimated_cpm ?
                    '$' + influencer.estimated_cpm.toFixed(2) : 'N/A'}
                </strong>
              </div>
              <div className="detail-stat">
                <span>업로드 영상 수:</span>
                <strong>{influencer.upload_count || '0'}</strong>
              </div>
              <div className="detail-stat">
                <span>영상 길이:</span>
                <strong>
                  {influencer.video_duration ?
                    influencer.video_duration + '초' : 'N/A'}
                </strong>
              </div>
              <div className="detail-stat">
                <span>음악:</span>
                <strong>
                  {influencer.music_title || 'N/A'}
                  {influencer.music_artist ? ' - ' + influencer.music_artist : ''}
                </strong>
              </div>
              <div className="detail-stat">
                <span>업로드 시간:</span>
                <strong>{influencer.upload_time || 'N/A'}</strong>
              </div>
              <div className="detail-stat">
                <span>팔로워 Tier:</span>
                <strong>{influencer.follower_tier || 'N/A'}</strong>
              </div>
              <div className="detail-stat">
                <span>이메일:</span>
                <strong>
                  {influencer.email || '이메일 없음'}
                  {influencer.email && (
                    <button
                      className="copy-email-btn-small"
                      onClick={(e) => handleCopyEmail(influencer.email, e)}
                      title="이메일 복사"
                    >
                      📋
                    </button>
                  )}
                </strong>
              </div>
            </div>

            {influencer.video_url && (
              <div className="modal-actions">
                <button
                  onClick={(e) => handleShowVideo(influencer.video_url, e)}
                  className="btn-primary"
                >
                  동영상 보기
                </button>
                <a
                  href={influencer.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary btn-secondary"
                >
                  {influencer.platform === 'instagram' ? 'Instagram에서 열기' : 'TikTok에서 열기'}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailModal;