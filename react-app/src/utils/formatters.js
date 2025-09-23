export function formatNumber(num) {
  if (!num) return '0';
  if (num >= 100000000) { // 1억 이상
    return (num / 100000000).toFixed(1) + '억';
  }
  if (num >= 10000) { // 1만 이상
    return (num / 10000).toFixed(1) + '만';
  }
  return num.toLocaleString('ko-KR');
}

export function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}