const ContactStatusService = {
  STATUSES: {
    contact_request: { label: '연락 요청', color: '#eab308', bgColor: '#fef3c7' },
    none: { label: '미연락', color: '#6b7280', bgColor: '#f3f4f6' },
    contacted: { label: '연락했음', color: '#3b82f6', bgColor: '#dbeafe' },
    no_response: { label: '회신 안옴', color: '#f97316', bgColor: '#fed7aa' },
    responded: { label: '회신 옴', color: '#059669', bgColor: '#a7f3d0' },
    rejected: { label: '거절', color: '#ef4444', bgColor: '#fee2e2' },
  },

  STORAGE_KEY: 'influencer_contact_statuses',

  loadStatuses() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  },

  saveStatuses(statuses) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(statuses));
  },

  getStatus(influencerId) {
    const statuses = this.loadStatuses();
    return statuses[influencerId] || 'none';
  },

  setStatus(influencerId, status) {
    const statuses = this.loadStatuses();
    if (status === 'none' || !status) {
      delete statuses[influencerId];
    } else {
      statuses[influencerId] = status;
    }
    this.saveStatuses(statuses);
  },

  getAllStatuses() {
    return this.loadStatuses();
  },

  clearAll() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  getStatistics() {
    const statuses = this.loadStatuses();
    const stats = {
      total: 0,
      byStatus: {},
    };

    for (const key of Object.keys(this.STATUSES)) {
      stats.byStatus[key] = 0;
    }

    for (const status of Object.values(statuses)) {
      stats.total++;
      if (stats.byStatus.hasOwnProperty(status)) {
        stats.byStatus[status]++;
      }
    }

    return stats;
  },
};

export default ContactStatusService;
