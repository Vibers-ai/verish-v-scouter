import * as XLSX from 'xlsx';

class ExcelExportService {
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // Convert to KST
    return kstDate.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatLikedByUsers(users) {
    if (!users || users.length === 0) return '';
    return users.map(user => user.name || user.email).join(', ');
  }

  prepareInfluencerData(influencer, likesData) {
    const likedByUsers = likesData?.users || [];

    return {
      '번호': influencer.id || '',
      '작성자 이름': influencer.author_name || '',
      '계정 ID': influencer.account_id ? `@${influencer.account_id}` : '',
      '이메일': influencer.email || '',
      '플랫폼': influencer.platform || 'tiktok',
      '팔로워 수': influencer.follower_count || 0,
      '조회수': influencer.views_count || 0,
      '좋아요': influencer.likes_count || 0,
      '댓글': influencer.comments_count || 0,
      '공유': influencer.shares_count || 0,
      '참여율(%)': influencer.engagement_rate ? (influencer.engagement_rate * 100).toFixed(3) : '',
      '예상 CPM($)': influencer.estimated_cpm ? influencer.estimated_cpm.toFixed(2) : '',
      '프로필 소개': influencer.profile_intro || '',
      '영상 설명': influencer.video_caption || '',
      '영상 URL': influencer.video_url || '',
      '좋아요한 사용자': this.formatLikedByUsers(likedByUsers),
      '좋아요 수': likedByUsers.length,
      '최근 좋아요 날짜': likedByUsers[0]?.created_at ? this.formatDate(likedByUsers[0].created_at) : ''
    };
  }

  async exportToExcel(influencers, options = {}) {
    const {
      filename = `liked_influencers_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName = '좋아요한 인플루언서',
      metadata = {}
    } = options;

    try {
      // Prepare data for export
      const exportData = influencers.map(influencer =>
        this.prepareInfluencerData(influencer, influencer.likes)
      );

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create metadata sheet if metadata provided
      if (Object.keys(metadata).length > 0) {
        const metadataSheet = [
          ['Export Information', ''],
          ['내보낸 날짜', this.formatDate(new Date())],
          ['총 인플루언서 수', influencers.length],
          ['필터 정보', ''],
        ];

        if (metadata.likedByUsers && metadata.likedByUsers.length > 0) {
          metadataSheet.push(['선택된 사용자', metadata.likedByUsers.join(', ')]);
        }
        if (metadata.searchTerm) {
          metadataSheet.push(['검색어', metadata.searchTerm]);
        }
        if (metadata.influencerType && metadata.influencerType !== 'all') {
          metadataSheet.push(['인플루언서 타입', metadata.influencerType]);
        }

        const metadataWs = XLSX.utils.aoa_to_sheet(metadataSheet);
        XLSX.utils.book_append_sheet(wb, metadataWs, '정보');
      }

      // Create main data sheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-adjust column widths
      const maxWidths = {};
      exportData.forEach(row => {
        Object.keys(row).forEach(key => {
          const value = String(row[key]);
          const currentMax = maxWidths[key] || key.length;
          maxWidths[key] = Math.max(currentMax, value.length);
        });
      });

      const cols = Object.keys(maxWidths).map(key => ({
        wch: Math.min(maxWidths[key] + 2, 50) // Cap at 50 characters width
      }));
      ws['!cols'] = cols;

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate and download file
      const wbout = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
        cellStyles: true
      });

      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: `Successfully exported ${influencers.length} influencers`,
        filename
      };
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      return {
        success: false,
        message: 'Failed to export to Excel',
        error: error.message
      };
    }
  }

  async exportLikedInfluencers(influencers, likedByUsers = [], additionalFilters = {}) {
    const metadata = {
      likedByUsers: likedByUsers.map(user => user.name || user.email),
      ...additionalFilters
    };

    const filename = `liked_influencers_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;

    return this.exportToExcel(influencers, {
      filename,
      sheetName: '좋아요한 인플루언서',
      metadata
    });
  }
}

export default new ExcelExportService();