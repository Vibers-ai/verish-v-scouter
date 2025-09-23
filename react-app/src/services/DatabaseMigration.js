import { supabase, TABLES } from './supabase';
import TagsService from './TagsService';
import ContactStatusService from './ContactStatusService';
import InfluencerService from './InfluencerService';

class DatabaseMigration {
  constructor() {
    this.batchSize = 50;
    this.progress = {
      total: 0,
      processed: 0,
      failed: 0,
      status: 'idle'
    };
  }

  async migrateFromJSON(jsonDataPath = '/data_combined_with_r2.json') {
    try {
      this.progress.status = 'starting';
      console.log('Starting database migration...');

      const response = await fetch(jsonDataPath);
      const jsonData = await response.json();

      if (!jsonData || !jsonData.data) {
        throw new Error('Invalid JSON data structure');
      }

      const influencers = jsonData.data;
      this.progress.total = influencers.length;

      console.log(`Found ${influencers.length} influencers to migrate`);

      const localTags = TagsService.loadTags();
      const localStatuses = ContactStatusService.loadStatuses();

      const existingInfluencers = await this.getExistingInfluencerIds();
      console.log(`Found ${existingInfluencers.size} existing influencers in database`);

      const batches = this.createBatches(influencers, this.batchSize);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1} of ${batches.length}...`);

        const processedBatch = [];

        for (const influencer of batch) {
          if (existingInfluencers.has(influencer.account_id)) {
            console.log(`Skipping existing influencer: ${influencer.account_id}`);
            this.progress.processed++;
            continue;
          }

          const processedInfluencer = this.transformInfluencerData(influencer);

          if (localTags[influencer.id]) {
            processedInfluencer.tags = localTags[influencer.id];
          }

          if (localStatuses[influencer.id]) {
            processedInfluencer.contact_status = localStatuses[influencer.id];
          }

          processedBatch.push(processedInfluencer);
        }

        if (processedBatch.length > 0) {
          try {
            await InfluencerService.bulkCreateInfluencers(processedBatch);
            this.progress.processed += processedBatch.length;
            console.log(`Successfully migrated batch ${batchIndex + 1}`);
          } catch (error) {
            console.error(`Error migrating batch ${batchIndex + 1}:`, error);
            this.progress.failed += processedBatch.length;

            for (const item of processedBatch) {
              try {
                await InfluencerService.createInfluencer(item);
                this.progress.processed++;
                this.progress.failed--;
              } catch (individualError) {
                console.error(`Failed to migrate influencer ${item.account_id}:`, individualError);
              }
            }
          }
        }

        this.reportProgress();
      }

      this.progress.status = 'completed';
      console.log('Migration completed!');
      this.reportProgress();

      return this.progress;
    } catch (error) {
      this.progress.status = 'error';
      console.error('Migration failed:', error);
      throw error;
    }
  }

  transformInfluencerData(data) {
    const transformed = { ...data };

    if (!transformed.scraping_round) {
      transformed.scraping_round = transformed.influencer_type === 'sales' ? '2' : '1';
    }

    transformed.status = transformed.status || 'none';
    transformed.saved = transformed.saved || false;

    if (transformed.upload_time) {
      transformed.upload_time = new Date(transformed.upload_time).toISOString();
    }

    const numericFields = [
      'follower_count', 'upload_count', 'likes_count', 'shares_count',
      'comments_count', 'views_count', 'video_duration', 'author_id', 'original_id'
    ];

    numericFields.forEach(field => {
      if (transformed[field] !== undefined && transformed[field] !== null) {
        transformed[field] = Number(transformed[field]) || 0;
      }
    });

    const decimalFields = [
      'engagement_rate', 'view_ratio', 'comment_conversion',
      'follower_quality', 'estimated_cpm', 'cost_efficiency'
    ];

    decimalFields.forEach(field => {
      if (transformed[field] !== undefined && transformed[field] !== null) {
        transformed[field] = parseFloat(transformed[field]) || 0;
      }
    });

    return transformed;
  }

  async getExistingInfluencerIds() {
    const existingIds = new Set();
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('account_id')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching existing influencers:', error);
        break;
      }

      if (!data || data.length === 0) break;

      data.forEach(item => existingIds.add(item.account_id));

      if (data.length < pageSize) break;
      page++;
    }

    return existingIds;
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  reportProgress() {
    const percentage = this.progress.total > 0
      ? Math.round((this.progress.processed / this.progress.total) * 100)
      : 0;

    console.log(`Progress: ${this.progress.processed}/${this.progress.total} (${percentage}%) - Failed: ${this.progress.failed}`);
  }

  async syncLocalStorageToDatabase() {
    try {
      console.log('Syncing localStorage data to database...');

      const localTags = TagsService.loadTags();
      const localStatuses = ContactStatusService.loadStatuses();

      const { data: influencers } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('id, original_id');

      if (!influencers) {
        console.log('No influencers found in database');
        return;
      }

      const idMapping = {};
      influencers.forEach(inf => {
        if (inf.original_id) {
          idMapping[inf.original_id] = inf.id;
        }
      });

      for (const [originalId, tags] of Object.entries(localTags)) {
        const dbId = idMapping[originalId];
        if (dbId) {
          try {
            await InfluencerService.setInfluencerTags(dbId, tags);
            console.log(`Synced tags for influencer ${dbId}`);
          } catch (error) {
            console.error(`Failed to sync tags for influencer ${dbId}:`, error);
          }
        }
      }

      for (const [originalId, status] of Object.entries(localStatuses)) {
        const dbId = idMapping[originalId];
        if (dbId) {
          try {
            await InfluencerService.setInfluencerContactStatus(dbId, status);
            console.log(`Synced contact status for influencer ${dbId}`);
          } catch (error) {
            console.error(`Failed to sync contact status for influencer ${dbId}:`, error);
          }
        }
      }

      console.log('localStorage sync completed!');
    } catch (error) {
      console.error('localStorage sync failed:', error);
      throw error;
    }
  }

  async clearDatabase() {
    const confirmClear = window.confirm(
      'WARNING: This will delete ALL data from the database. Are you sure?'
    );

    if (!confirmClear) return false;

    try {
      await supabase.from(TABLES.CONTACT_STATUSES).delete().neq('id', 0);

      await supabase.from(TABLES.TAGS).delete().neq('id', 0);

      const { error } = await supabase
        .from(TABLES.INFLUENCERS)
        .delete()
        .neq('id', 0);

      if (error) throw error;

      console.log('Database cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }

  async validateMigration() {
    try {
      const { count: dbCount } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('*', { count: 'exact', head: true });

      const response = await fetch('/data_combined_with_r2.json');
      const jsonData = await response.json();
      const jsonCount = jsonData.data.length;

      console.log(`Database records: ${dbCount}`);
      console.log(`JSON records: ${jsonCount}`);

      const sample = await InfluencerService.getInfluencers({ pageSize: 5 });
      console.log('Sample migrated data:', sample.data);

      const { data: tagCount } = await supabase
        .from(TABLES.TAGS)
        .select('influencer_id', { count: 'exact' });

      const { data: statusCount } = await supabase
        .from(TABLES.CONTACT_STATUSES)
        .select('influencer_id', { count: 'exact' });

      console.log(`Tags migrated: ${tagCount?.length || 0}`);
      console.log(`Contact statuses migrated: ${statusCount?.length || 0}`);

      return {
        databaseCount: dbCount,
        jsonCount: jsonCount,
        tagsCount: tagCount?.length || 0,
        statusesCount: statusCount?.length || 0,
        isValid: dbCount === jsonCount
      };
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }
  }

  getProgress() {
    return this.progress;
  }
}

export default new DatabaseMigration();