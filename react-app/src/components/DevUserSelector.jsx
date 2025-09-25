import React from 'react';
import { MOCK_USERS } from '../config/mockUsers';
import useAuthStore from '../stores/authStore';

function DevUserSelector({ onUserChange }) {
  const { user, setDevUser } = useAuthStore();

  const handleUserChange = (e) => {
    const selectedEmail = e.target.value;
    const selectedUser = MOCK_USERS.find(u => u.email === selectedEmail);
    if (selectedUser) {
      setDevUser(selectedUser);
      // Save to localStorage for persistence
      localStorage.setItem('dev_user', JSON.stringify(selectedUser));
      // Notify parent component to refetch data
      if (onUserChange) {
        onUserChange(selectedUser);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#fef3c7',
      border: '2px solid #f59e0b',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 10000,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#92400e',
        marginBottom: '8px'
      }}>
        🚧 개발 모드 - 테스트 사용자
      </div>
      <select
        value={user?.email || ''}
        onChange={handleUserChange}
        style={{
          width: '200px',
          padding: '6px',
          fontSize: '14px',
          border: '1px solid #d97706',
          borderRadius: '4px',
          background: 'white'
        }}
      >
        <option value="">사용자 선택...</option>
        {MOCK_USERS.map(mockUser => (
          <option key={mockUser.email} value={mockUser.email}>
            {mockUser.name} ({mockUser.company})
          </option>
        ))}
      </select>
      {user && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#7c2d12'
        }}>
          현재: {user.name}
        </div>
      )}
    </div>
  );
}

export default DevUserSelector;