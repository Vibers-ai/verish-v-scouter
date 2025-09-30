import React from 'react';
import { useNavigate } from 'react-router-dom';
import SummaryCards from './SummaryCards';
import useAuthStore from '../../stores/authStore';

function Header({ summary }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    // Redirect to Maestro login
    window.location.href = 'https://maestro.vibers-ai.dev/login';
  };

  const getCompanyLogo = () => {
    const company = user?.company?.toLowerCase();

    const logos = {
      'verish': 'https://pub-6d1bd4ca2c16406c9117f784243ac29e.r2.dev/company-logos/2.svg',
      'seedlab': 'https://pub-6d1bd4ca2c16406c9117f784243ac29e.r2.dev/company-logos/7.png'
    };

    return logos[company] || '/verish_logo.svg';
  };

  const getCompanyName = () => {
    return user?.company || 'Verish';
  };

  return (
    <header>
      <div className="header-container">
        <div className="header-title">
          <img src={getCompanyLogo()} alt={getCompanyName()} className="logo" />
          <h1>인플루언서 데이터 대시보드</h1>
        </div>

        {user && (
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-company">{user.company} · {user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="logout-btn"
              title="로그아웃"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              로그아웃
            </button>
          </div>
        )}
      </div>
      <SummaryCards summary={summary} />
    </header>
  );
}

export default Header;