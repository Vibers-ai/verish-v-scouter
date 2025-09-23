import TagsService from './TagsService';
import InfluencerService from './InfluencerService';

class TagsServiceEnhanced {
  constructor() {
    this.useSupabase = false;
  }

  setDataSource(useSupabase) {
    this.useSupabase = useSupabase;
  }

  async getTags(influencerId) {
    if (this.useSupabase) {
      try {
        return await InfluencerService.getInfluencerTags(influencerId);
      } catch (error) {
        console.error('Error fetching tags from Supabase:', error);
        return [];
      }
    } else {
      return TagsService.getTags(influencerId);
    }
  }

  async addTag(influencerId, tag) {
    if (this.useSupabase) {
      try {
        await InfluencerService.addInfluencerTag(influencerId, tag);
        return true;
      } catch (error) {
        console.error('Error adding tag to Supabase:', error);
        return false;
      }
    } else {
      return TagsService.addTag(influencerId, tag);
    }
  }

  async removeTag(influencerId, tag) {
    if (this.useSupabase) {
      try {
        await InfluencerService.removeInfluencerTag(influencerId, tag);
        return true;
      } catch (error) {
        console.error('Error removing tag from Supabase:', error);
        return false;
      }
    } else {
      return TagsService.removeTag(influencerId, tag);
    }
  }

  async setTags(influencerId, tags) {
    if (this.useSupabase) {
      try {
        await InfluencerService.setInfluencerTags(influencerId, tags);
        return true;
      } catch (error) {
        console.error('Error setting tags in Supabase:', error);
        return false;
      }
    } else {
      TagsService.setTags(influencerId, tags);
      return true;
    }
  }

  async getAllUniqueTags() {
    if (this.useSupabase) {
      try {
        return await InfluencerService.getAllUniqueTags();
      } catch (error) {
        console.error('Error fetching unique tags from Supabase:', error);
        return [];
      }
    } else {
      return TagsService.getAllUniqueTags();
    }
  }

  async searchByTag(searchTag) {
    if (this.useSupabase) {
      try {
        const influencers = await InfluencerService.searchInfluencersByTag(searchTag);
        return influencers.map(inf => inf.id);
      } catch (error) {
        console.error('Error searching by tag in Supabase:', error);
        return [];
      }
    } else {
      return TagsService.searchByTag(searchTag);
    }
  }

  async syncLocalToDatabase() {
    if (!this.useSupabase) {
      console.log('Not in Supabase mode, skipping sync');
      return;
    }

    try {
      const localTags = TagsService.loadTags();
      const syncPromises = [];

      for (const [influencerId, tags] of Object.entries(localTags)) {
        syncPromises.push(
          InfluencerService.setInfluencerTags(influencerId, tags)
            .catch(err => console.error(`Failed to sync tags for ${influencerId}:`, err))
        );
      }

      await Promise.all(syncPromises);
      console.log('Tags synced to database successfully');
    } catch (error) {
      console.error('Error syncing tags to database:', error);
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
        includeTags: true,
        includeContactStatus: false
      });

      const localTags = {};

      influencers.data.forEach(influencer => {
        if (influencer.tags && influencer.tags.length > 0) {
          localTags[influencer.id] = influencer.tags;
        }
      });

      TagsService.saveTags(localTags);
      console.log('Tags synced from database successfully');
    } catch (error) {
      console.error('Error syncing tags from database:', error);
    }
  }

  clearLocal() {
    TagsService.clearAll();
  }

  getSuggestedTags() {
    return TagsService.SUGGESTED_TAGS;
  }
}

export default new TagsServiceEnhanced();