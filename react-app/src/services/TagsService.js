const TagsService = {
  STORAGE_KEY: 'influencer_tags',

  SUGGESTED_TAGS: [
    '뷰티', '패션', '음식', '여행', '운동', '건강',
    '테크', '게임', '음악', '댄스', '코미디', '교육',
    '라이프스타일', '펫', '요리', '브이로그', '리뷰', '개그'
  ],

  loadTags() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  },

  saveTags(tags) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tags));
  },

  getTags(influencerId) {
    const allTags = this.loadTags();
    return allTags[influencerId] || [];
  },

  addTag(influencerId, tag) {
    const allTags = this.loadTags();
    if (!allTags[influencerId]) {
      allTags[influencerId] = [];
    }

    const normalizedTag = tag.trim().toLowerCase();
    if (!allTags[influencerId].includes(normalizedTag)) {
      allTags[influencerId].push(normalizedTag);
      this.saveTags(allTags);
      return true;
    }
    return false;
  },

  removeTag(influencerId, tag) {
    const allTags = this.loadTags();
    if (allTags[influencerId]) {
      const index = allTags[influencerId].indexOf(tag);
      if (index > -1) {
        allTags[influencerId].splice(index, 1);
        if (allTags[influencerId].length === 0) {
          delete allTags[influencerId];
        }
        this.saveTags(allTags);
        return true;
      }
    }
    return false;
  },

  setTags(influencerId, tags) {
    const allTags = this.loadTags();
    if (tags && tags.length > 0) {
      allTags[influencerId] = tags.map(tag => tag.trim().toLowerCase());
    } else {
      delete allTags[influencerId];
    }
    this.saveTags(allTags);
  },

  getAllUniqueTags() {
    const allTags = this.loadTags();
    const uniqueTags = new Set();

    for (const tags of Object.values(allTags)) {
      tags.forEach(tag => uniqueTags.add(tag));
    }

    return Array.from(uniqueTags).sort();
  },

  searchByTag(searchTag) {
    const allTags = this.loadTags();
    const normalizedSearch = searchTag.trim().toLowerCase();
    const results = [];

    for (const [influencerId, tags] of Object.entries(allTags)) {
      if (tags.some(tag => tag.includes(normalizedSearch))) {
        results.push(influencerId);
      }
    }

    return results;
  },

  clearAll() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  getStatistics() {
    const allTags = this.loadTags();
    const tagCounts = {};
    let totalInfluencersWithTags = 0;
    let totalTags = 0;

    for (const tags of Object.values(allTags)) {
      if (tags.length > 0) {
        totalInfluencersWithTags++;
        totalTags += tags.length;

        tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    }

    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalInfluencersWithTags,
      totalTags,
      uniqueTagsCount: Object.keys(tagCounts).length,
      topTags: sortedTags.slice(0, 10),
      allTagCounts: tagCounts
    };
  }
};

export default TagsService;