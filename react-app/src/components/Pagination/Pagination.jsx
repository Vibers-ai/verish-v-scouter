import React from 'react';

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const maxButtons = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  const pageButtons = [];

  // Previous button
  pageButtons.push(
    <button
      key="prev"
      disabled={currentPage === 1}
      onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
    >
      이전
    </button>
  );

  // First page and dots
  if (startPage > 1) {
    pageButtons.push(
      <button key={1} onClick={() => onPageChange(1)}>
        1
      </button>
    );
    if (startPage > 2) {
      pageButtons.push(
        <span key="dots-start" className="page-dots">
          ...
        </span>
      );
    }
  }

  // Page number buttons
  for (let i = startPage; i <= endPage; i++) {
    pageButtons.push(
      <button
        key={i}
        className={i === currentPage ? 'active' : ''}
        onClick={() => onPageChange(i)}
      >
        {i}
      </button>
    );
  }

  // Last page and dots
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageButtons.push(
        <span key="dots-end" className="page-dots">
          ...
        </span>
      );
    }
    pageButtons.push(
      <button key={totalPages} onClick={() => onPageChange(totalPages)}>
        {totalPages}
      </button>
    );
  }

  // Next button
  pageButtons.push(
    <button
      key="next"
      disabled={currentPage === totalPages}
      onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
    >
      다음
    </button>
  );

  return <div className="pagination" id="pagination">{pageButtons}</div>;
}

export default Pagination;