import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';

function VideoModal({ videoUrl, isOpen, onClose }) {
  const modalBodyRef = useRef(null);

  useEffect(() => {
    if (isOpen && videoUrl) {
      // Extract video ID and username from URL
      const videoIdMatch = videoUrl.match(/video\/(\d+)/);
      const usernameMatch = videoUrl.match(/@([^\/]+)/);

      if (videoIdMatch && modalBodyRef.current) {
        const videoId = videoIdMatch[1];
        const username = usernameMatch ? usernameMatch[1] : 'user';

        // Create TikTok embed HTML
        modalBodyRef.current.innerHTML = `
          <blockquote class="tiktok-embed"
            cite="${videoUrl}"
            data-video-id="${videoId}"
            style="max-width: 605px; min-width: 325px; margin: 0 auto;">
            <section>
              <a target="_blank" title="@${username}" href="https://www.tiktok.com/@${username}">@${username}</a>
            </section>
          </blockquote>
        `;

        // Reload TikTok embed script
        if (window.tiktok && window.tiktok.embed) {
          window.tiktok.embed.reload();
        } else {
          // Dynamically load TikTok embed script
          const script = document.createElement('script');
          script.src = 'https://www.tiktok.com/embed.js';
          script.async = true;
          document.body.appendChild(script);
        }
      }
    }

    return () => {
      // Clean up on unmount
      if (modalBodyRef.current) {
        modalBodyRef.current.innerHTML = '';
      }
    };
  }, [isOpen, videoUrl]);

  if (!isOpen) return null;

  return (
    <>
      <Helmet>
        <script async src="https://www.tiktok.com/embed.js"></script>
      </Helmet>
      <div
        id="videoModal"
        className="modal video-modal"
        style={{ display: 'block' }}
        onClick={onClose}
      >
        <div
          className="modal-content video-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="close video-close" onClick={onClose}>
            &times;
          </span>
          <div
            id="videoModalBody"
            className="video-container"
            ref={modalBodyRef}
          ></div>
        </div>
      </div>
    </>
  );
}

export default VideoModal;