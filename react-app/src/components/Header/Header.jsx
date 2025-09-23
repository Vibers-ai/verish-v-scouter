import React from 'react';
import SummaryCards from './SummaryCards';

function Header({ summary }) {
  return (
    <header>
      <div className="header-title">
        <img src="/verish_logo.svg" alt="Verish" className="logo" />
        <h1>인플루언서 데이터 대시보드</h1>
      </div>
      <SummaryCards summary={summary} />
    </header>
  );
}

export default Header;