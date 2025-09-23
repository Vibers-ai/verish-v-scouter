import React from 'react';
import ContactStatusService from '../../services/ContactStatusService';

function StatusSelector({ influencerId, currentStatus, onStatusChange }) {
  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    ContactStatusService.setStatus(influencerId, newStatus);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const statusInfo = ContactStatusService.STATUSES[currentStatus] || ContactStatusService.STATUSES.none;

  return (
    <select
      className={`status-selector status-${currentStatus}`}
      data-influencer-id={influencerId}
      data-current-status={currentStatus}
      style={{
        background: statusInfo.bgColor,
        color: statusInfo.color,
        borderColor: statusInfo.color
      }}
      value={currentStatus}
      onChange={handleStatusChange}
    >
      {Object.entries(ContactStatusService.STATUSES).map(([key, value]) => (
        <option key={key} value={key}>
          {value.label}
        </option>
      ))}
    </select>
  );
}

export default StatusSelector;