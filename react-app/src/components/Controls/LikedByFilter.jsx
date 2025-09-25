import React, { useState, useEffect, useRef } from 'react';
import LikesService from '../../services/LikesService';
import useAuthStore from '../../stores/authStore';
import './LikedByFilter.css';

function LikedByFilter({ selectedUsers, onUsersChange }) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Fetch users who have liked any influencer
  useEffect(() => {
    const fetchUsers = async () => {
      const users = await LikesService.getAllUsersWhoLiked();
      setAvailableUsers(users);
    };
    fetchUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users based on search term
  const filteredUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle user selection
  const handleUserToggle = (userEmail) => {
    if (selectedUsers.includes(userEmail)) {
      onUsersChange(selectedUsers.filter((email) => email !== userEmail));
    } else {
      onUsersChange([...selectedUsers, userEmail]);
    }
  };

  // Select all / Clear all
  const handleSelectAll = () => {
    onUsersChange(filteredUsers.map((user) => user.email));
  };

  const handleClearAll = () => {
    onUsersChange([]);
  };

  // Add quick filter for "Liked by me"
  const handleLikedByMe = () => {
    if (user) {
      if (selectedUsers.includes(user.email)) {
        onUsersChange(selectedUsers.filter((email) => email !== user.email));
      } else {
        onUsersChange([...selectedUsers, user.email]);
      }
    }
  };

  return (
    <div className="liked-by-filter" ref={dropdownRef}>
      <button
        className="filter-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>좋아요한 사용자</span>
        {selectedUsers.length > 0 && (
          <span className="selected-count">{selectedUsers.length}</span>
        )}
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="filter-dropdown">
          <div className="dropdown-header">
            <input
              type="text"
              placeholder="사용자 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dropdown-search"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="dropdown-actions">
              <button onClick={handleSelectAll} className="btn-text">
                모두 선택
              </button>
              <button onClick={handleClearAll} className="btn-text">
                초기화
              </button>
            </div>
          </div>

          <div className="dropdown-content">
            {user && (
              <div className="dropdown-section">
                <label className="checkbox-item highlight">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.email)}
                    onChange={() => handleUserToggle(user.email)}
                  />
                  <span className="checkbox-label">
                    내가 좋아요한 ({user.name || user.email})
                  </span>
                </label>
              </div>
            )}

            {filteredUsers.length > 0 && (
              <div className="dropdown-section">
                <div className="section-title">다른 사용자</div>
                {filteredUsers
                  .filter((u) => u.email !== user?.email)
                  .map((likedUser) => (
                    <label key={likedUser.email} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(likedUser.email)}
                        onChange={() => handleUserToggle(likedUser.email)}
                      />
                      <span className="checkbox-label">
                        {likedUser.name}
                        <span className="user-email">{likedUser.email}</span>
                      </span>
                    </label>
                  ))}
              </div>
            )}

            {filteredUsers.length === 0 && searchTerm && (
              <div className="no-results">사용자를 찾을 수 없습니다</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LikedByFilter;