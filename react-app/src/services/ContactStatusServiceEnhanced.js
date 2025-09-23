import ContactStatusService from './ContactStatusService';
import InfluencerService from './InfluencerService';
import { CONTACT_STATUS_OPTIONS } from './supabase';

class ContactStatusServiceEnhanced {
  constructor() {
    this.useSupabase = false;
    this.STATUSES = CONTACT_STATUS_OPTIONS;
  }

  setDataSource(useSupabase) {
    this.useSupabase = useSupabase;
  }

  async getStatus(influencerId) {
    if (this.useSupabase) {
      try {
        return await InfluencerService.getInfluencerContactStatus(influencerId);
      } catch (error) {
        console.error('Error fetching contact status from Supabase:', error);
        return 'none';
      }
    } else {
      return ContactStatusService.getStatus(influencerId);
    }
  }

  async setStatus(influencerId, status, notes = null) {
    if (this.useSupabase) {
      try {
        await InfluencerService.setInfluencerContactStatus(influencerId, status, notes);
        return true;
      } catch (error) {
        console.error('Error setting contact status in Supabase:', error);
        return false;
      }
    } else {
      ContactStatusService.setStatus(influencerId, status);
      return true;
    }
  }

  async getAllStatuses() {
    if (this.useSupabase) {
      try {
        const influencers = await InfluencerService.getInfluencers({
          pageSize: 1000,
          includeTags: false,
          includeContactStatus: true
        });

        const statuses = {};
        influencers.data.forEach(inf => {
          if (inf.contact_status && inf.contact_status !== 'none') {
            statuses[inf.id] = inf.contact_status;
          }
        });

        return statuses;
      } catch (error) {
        console.error('Error fetching all contact statuses from Supabase:', error);
        return {};
      }
    } else {
      return ContactStatusService.getAllStatuses();
    }
  }

  async getStatistics() {
    if (this.useSupabase) {
      try {
        const statuses = await this.getAllStatuses();
        const stats = {
          total: 0,
          byStatus: {}
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
      } catch (error) {
        console.error('Error getting statistics from Supabase:', error);
        return { total: 0, byStatus: {} };
      }
    } else {
      return ContactStatusService.getStatistics();
    }
  }

  async syncLocalToDatabase() {
    if (!this.useSupabase) {
      console.log('Not in Supabase mode, skipping sync');
      return;
    }

    try {
      const localStatuses = ContactStatusService.loadStatuses();
      const syncPromises = [];

      for (const [influencerId, status] of Object.entries(localStatuses)) {
        syncPromises.push(
          InfluencerService.setInfluencerContactStatus(influencerId, status)
            .catch(err => console.error(`Failed to sync status for ${influencerId}:`, err))
        );
      }

      await Promise.all(syncPromises);
      console.log('Contact statuses synced to database successfully');
    } catch (error) {
      console.error('Error syncing contact statuses to database:', error);
    }
  }

  async syncDatabaseToLocal() {
    if (!this.useSupabase) {
      console.log('Not in Supabase mode, skipping sync');
      return;
    }

    try {
      const influencers = await InfluencerService.getInfluencers({
        pageSize: 1000,
        includeTags: false,
        includeContactStatus: true
      });

      const localStatuses = {};

      influencers.data.forEach(influencer => {
        if (influencer.contact_status && influencer.contact_status !== 'none') {
          localStatuses[influencer.id] = influencer.contact_status;
        }
      });

      ContactStatusService.saveStatuses(localStatuses);
      console.log('Contact statuses synced from database successfully');
    } catch (error) {
      console.error('Error syncing contact statuses from database:', error);
    }
  }

  clearLocal() {
    ContactStatusService.clearAll();
  }

  getStatusOptions() {
    return this.STATUSES;
  }

  getStatusInfo(status) {
    return this.STATUSES[status] || this.STATUSES.none;
  }
}

export default new ContactStatusServiceEnhanced();