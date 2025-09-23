import { supabase, TABLES } from './supabase';
import TagsService from './TagsService';
import ContactStatusService from './ContactStatusService';

class MigrationDiagnostics {
  async findMissingRecords() {
    try {
      console.log('Starting diagnostics...');

      // Get JSON data
      const response = await fetch('/data_combined_with_r2.json');
      const jsonData = await response.json();
      const jsonInfluencers = jsonData.data;

      // Get all database records
      const allDbRecords = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from(TABLES.INFLUENCERS)
          .select('account_id, author_name, id, original_id')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Error fetching DB records:', error);
          break;
        }

        if (!data || data.length === 0) break;
        allDbRecords.push(...data);

        if (data.length < pageSize) break;
        page++;
      }

      console.log(`Found ${allDbRecords.length} records in database`);
      console.log(`Found ${jsonInfluencers.length} records in JSON`);

      // Create maps for comparison
      const dbAccountIds = new Set(allDbRecords.map(r => r.account_id));
      const jsonAccountIds = new Map();
      const duplicateAccountIds = [];

      // Check for duplicates in JSON
      jsonInfluencers.forEach(inf => {
        if (jsonAccountIds.has(inf.account_id)) {
          duplicateAccountIds.push({
            account_id: inf.account_id,
            ids: [jsonAccountIds.get(inf.account_id), inf.id]
          });
        }
        jsonAccountIds.set(inf.account_id, inf.id);
      });

      // Find missing records
      const missingRecords = [];
      jsonInfluencers.forEach(inf => {
        if (!dbAccountIds.has(inf.account_id)) {
          missingRecords.push({
            id: inf.id,
            account_id: inf.account_id,
            author_name: inf.author_name,
            influencer_type: inf.influencer_type
          });
        }
      });

      // Find orphaned DB records (in DB but not in JSON)
      const orphanedRecords = [];
      allDbRecords.forEach(dbRec => {
        if (!jsonAccountIds.has(dbRec.account_id)) {
          orphanedRecords.push({
            db_id: dbRec.id,
            account_id: dbRec.account_id,
            author_name: dbRec.author_name
          });
        }
      });

      const results = {
        summary: {
          json_count: jsonInfluencers.length,
          db_count: allDbRecords.length,
          missing_count: missingRecords.length,
          orphaned_count: orphanedRecords.length,
          duplicate_count: duplicateAccountIds.length
        },
        missing_records: missingRecords,
        orphaned_records: orphanedRecords,
        duplicate_account_ids: duplicateAccountIds
      };

      console.log('Diagnostic Results:', results.summary);

      if (missingRecords.length > 0) {
        console.log('Missing Records:', missingRecords);
      }

      if (duplicateAccountIds.length > 0) {
        console.log('Duplicate account_ids in JSON:', duplicateAccountIds);
      }

      if (orphanedRecords.length > 0) {
        console.log('Orphaned records in DB:', orphanedRecords);
      }

      return results;
    } catch (error) {
      console.error('Diagnostic failed:', error);
      throw error;
    }
  }

  async fixMissingRecords() {
    try {
      const diagnostics = await this.findMissingRecords();

      if (diagnostics.missing_records.length === 0) {
        console.log('No missing records to fix');
        return { success: true, fixed: 0 };
      }

      console.log(`Attempting to fix ${diagnostics.missing_records.length} missing records...`);

      // Load JSON data
      const response = await fetch('/data_combined_with_r2.json');
      const jsonData = await response.json();
      const jsonInfluencers = jsonData.data;

      // Create map for quick lookup
      const jsonMap = new Map();
      jsonInfluencers.forEach(inf => {
        jsonMap.set(inf.account_id, inf);
      });

      // Load local tags and statuses
      const localTags = TagsService.loadTags();
      const localStatuses = ContactStatusService.loadStatuses();

      let fixedCount = 0;
      const failedRecords = [];

      // Process missing records one by one
      for (const missing of diagnostics.missing_records) {
        const influencerData = jsonMap.get(missing.account_id);

        if (!influencerData) {
          console.error(`Could not find data for ${missing.account_id}`);
          continue;
        }

        try {
          // Transform data
          const processedData = this.transformInfluencerData(influencerData);

          // Add tags if exist
          if (localTags[influencerData.id]) {
            processedData.tags = localTags[influencerData.id];
          }

          // Add contact status if exists
          if (localStatuses[influencerData.id]) {
            processedData.contact_status = localStatuses[influencerData.id];
          }

          // Insert to database
          const { data, error } = await supabase
            .from(TABLES.INFLUENCERS)
            .insert(processedData)
            .select()
            .single();

          if (error) {
            console.error(`Failed to insert ${missing.account_id}:`, error);
            failedRecords.push({ ...missing, error: error.message });
          } else {
            console.log(`Fixed: ${missing.account_id}`);
            fixedCount++;

            // Insert tags
            if (processedData.tags && processedData.tags.length > 0) {
              const tagsToInsert = processedData.tags.map(tag => ({
                influencer_id: data.id,
                tag: tag
              }));

              await supabase.from(TABLES.TAGS).insert(tagsToInsert);
            }

            // Insert contact status
            if (processedData.contact_status && processedData.contact_status !== 'none') {
              await supabase.from(TABLES.CONTACT_STATUSES).insert({
                influencer_id: data.id,
                status: processedData.contact_status
              });
            }
          }
        } catch (error) {
          console.error(`Error processing ${missing.account_id}:`, error);
          failedRecords.push({ ...missing, error: error.message });
        }
      }

      console.log(`Fixed ${fixedCount} out of ${diagnostics.missing_records.length} missing records`);

      if (failedRecords.length > 0) {
        console.log('Failed records:', failedRecords);
      }

      return {
        success: fixedCount > 0,
        fixed: fixedCount,
        failed: failedRecords
      };
    } catch (error) {
      console.error('Fix operation failed:', error);
      throw error;
    }
  }

  transformInfluencerData(data) {
    const transformed = { ...data };

    // Set required fields
    if (!transformed.scraping_round) {
      transformed.scraping_round = transformed.influencer_type === 'sales' ? '2' : '1';
    }

    transformed.status = transformed.status || 'none';
    transformed.saved = transformed.saved || false;

    // Convert timestamp
    if (transformed.upload_time) {
      transformed.upload_time = new Date(transformed.upload_time).toISOString();
    }

    // Convert numeric fields
    const numericFields = [
      'follower_count', 'upload_count', 'likes_count', 'shares_count',
      'comments_count', 'views_count', 'video_duration', 'author_id', 'original_id'
    ];

    numericFields.forEach(field => {
      if (transformed[field] !== undefined && transformed[field] !== null) {
        transformed[field] = Number(transformed[field]) || 0;
      }
    });

    // Convert decimal fields
    const decimalFields = [
      'engagement_rate', 'view_ratio', 'comment_conversion',
      'follower_quality', 'estimated_cpm', 'cost_efficiency'
    ];

    decimalFields.forEach(field => {
      if (transformed[field] !== undefined && transformed[field] !== null) {
        transformed[field] = parseFloat(transformed[field]) || 0;
      }
    });

    // Remove tags and contact_status from main data
    delete transformed.tags;
    delete transformed.contact_status;

    return transformed;
  }

  async checkTagsAndStatuses() {
    try {
      console.log('Checking tags and contact statuses migration...');

      // Check tags
      const { data: tagsData, error: tagsError } = await supabase
        .from(TABLES.TAGS)
        .select('influencer_id, tag', { count: 'exact' });

      if (tagsError) {
        console.error('Error fetching tags:', tagsError);
      } else {
        console.log(`Found ${tagsData?.length || 0} tags in database`);
      }

      // Check contact statuses
      const { data: statusData, error: statusError } = await supabase
        .from(TABLES.CONTACT_STATUSES)
        .select('influencer_id, status', { count: 'exact' });

      if (statusError) {
        console.error('Error fetching statuses:', statusError);
      } else {
        console.log(`Found ${statusData?.length || 0} contact statuses in database`);
      }

      // Check localStorage
      const localTags = TagsService.loadTags();
      const localStatuses = ContactStatusService.loadStatuses();

      const localTagCount = Object.keys(localTags).reduce((sum, key) => {
        return sum + (localTags[key]?.length || 0);
      }, 0);

      console.log(`Found ${localTagCount} tags in localStorage`);
      console.log(`Found ${Object.keys(localStatuses).length} contact statuses in localStorage`);

      return {
        database: {
          tags: tagsData?.length || 0,
          statuses: statusData?.length || 0
        },
        localStorage: {
          tags: localTagCount,
          statuses: Object.keys(localStatuses).length
        }
      };
    } catch (error) {
      console.error('Check failed:', error);
      throw error;
    }
  }

  async migrateTagsAndStatuses() {
    try {
      console.log('Migrating tags and contact statuses...');

      // Get all influencers with their original_id
      const { data: influencers, error } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('id, original_id');

      if (error) throw error;

      // Create mapping from original_id to new id
      const idMapping = {};
      influencers.forEach(inf => {
        if (inf.original_id) {
          idMapping[inf.original_id] = inf.id;
        }
      });

      // Migrate tags
      const localTags = TagsService.loadTags();
      let tagCount = 0;

      for (const [originalId, tags] of Object.entries(localTags)) {
        const dbId = idMapping[originalId];

        if (dbId && tags && tags.length > 0) {
          const tagsToInsert = tags.map(tag => ({
            influencer_id: dbId,
            tag: tag.trim().toLowerCase()
          }));

          try {
            await supabase.from(TABLES.TAGS).upsert(tagsToInsert, {
              onConflict: 'influencer_id,tag'
            });
            tagCount += tags.length;
            console.log(`Migrated ${tags.length} tags for influencer ${dbId}`);
          } catch (err) {
            console.error(`Failed to migrate tags for ${dbId}:`, err);
          }
        }
      }

      // Migrate contact statuses
      const localStatuses = ContactStatusService.loadStatuses();
      let statusCount = 0;

      for (const [originalId, status] of Object.entries(localStatuses)) {
        const dbId = idMapping[originalId];

        if (dbId && status && status !== 'none') {
          try {
            await supabase.from(TABLES.CONTACT_STATUSES).upsert({
              influencer_id: dbId,
              status: status
            }, {
              onConflict: 'influencer_id'
            });
            statusCount++;
            console.log(`Migrated status '${status}' for influencer ${dbId}`);
          } catch (err) {
            console.error(`Failed to migrate status for ${dbId}:`, err);
          }
        }
      }

      console.log(`Migration complete: ${tagCount} tags, ${statusCount} contact statuses`);

      return {
        tags_migrated: tagCount,
        statuses_migrated: statusCount
      };
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

export default new MigrationDiagnostics();

// Make it available in browser console for debugging
if (typeof window !== 'undefined') {
  window.MigrationDiagnostics = new MigrationDiagnostics();
}