import { supabase, TABLES } from './supabase';
import LikesService from './LikesService';
import useAuthStore from '../stores/authStore';

class InfluencerService {
  constructor() {
    this.pageSize = 20;
  }

  async getInfluencers(options = {}) {
    const {
      page = 1,
      pageSize = this.pageSize,
      searchTerm = '',
      influencerType = null,
      followerRange = null,
      viewsRange = null,
      emailFilter = '',
      status = null,
      saved = null,
      scrapingRound = null,
      sortField = null,
      sortOrder = 'desc',
      includeTags = true,
      includeContactStatus = true,
      includeLikes = true,
      likedByUsers = [],
      currentUserEmail = null,
    } = options;

    try {
      // When saved=true, we need to get all influencers with likes
      let query;
      let influencersData = [];
      let totalCount = 0;

      if (saved === true) {
        // Get all influencers that have been liked, with like counts
        const { data: likedInfluencerIds, error: likeError } = await supabase
          .from(TABLES.LIKES)
          .select('influencer_id')
          .order('influencer_id');

        if (likeError) throw likeError;

        // Get unique influencer IDs
        const uniqueInfluencerIds = [...new Set(likedInfluencerIds.map(l => l.influencer_id))];

        if (uniqueInfluencerIds.length === 0) {
          return {
            data: [],
            count: 0,
            page,
            pageSize,
            totalPages: 0,
          };
        }

        // Get influencers that have likes
        query = supabase
          .from(TABLES.INFLUENCERS)
          .select('*', { count: 'exact' })
          .in('id', uniqueInfluencerIds);
      } else {
        // Normal query for all influencers
        query = supabase
          .from(TABLES.INFLUENCERS)
          .select('*', { count: 'exact' });
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        query = query.or(
          `author_name.ilike.%${searchLower}%,account_id.ilike.%${searchLower}%,video_caption.ilike.%${searchLower}%`
        );
      }

      if (influencerType && influencerType !== 'all') {
        query = query.eq('influencer_type', influencerType);
      }

      if (status && status !== 'none') {
        query = query.eq('status', status);
      }

      if (scrapingRound) {
        query = query.eq('scraping_round', scrapingRound);
      }

      if (followerRange) {
        console.log('Applying follower range filter:', followerRange);
        query = query
          .gte('follower_count', followerRange[0])
          .lte('follower_count', followerRange[1]);
      }

      if (viewsRange) {
        console.log('Applying views range filter:', viewsRange);
        query = query
          .gte('views_count', viewsRange[0])
          .lte('views_count', viewsRange[1]);
      }

      if (emailFilter === 'has_email') {
        query = query.not('email', 'is', null).neq('email', '');
      } else if (emailFilter === 'no_email') {
        query = query.or('email.is.null,email.eq.');
      }

      // Don't apply sorting yet if saved=true, we'll sort by like count later
      if (!saved) {
        if (sortField) {
          query = query.order(sortField, { ascending: sortOrder === 'asc' });
        } else {
          query = query.order('id', { ascending: false });
        }
      }

      // For saved view, fetch all data first to sort by likes
      let data, error, count;
      let influencersWithExtras;

      if (saved === true) {
        // Fetch all liked influencers without pagination first
        const { data: allData, error: allError, count: allCount } = await query;

        if (allError) throw allError;

        // Fetch likes data for all influencers
        let likesData = {};
        if (allData && allData.length > 0) {
          const influencerIds = allData.map(i => i.id);
          likesData = await LikesService.getBatchLikesData(influencerIds, currentUserEmail);
        }

        // Apply filter for liked by specific users if needed
        let filteredData = allData;
        if (likedByUsers && likedByUsers.length > 0) {
          filteredData = allData.filter((influencer) => {
            const likes = likesData[influencer.id];
            if (!likes || !likes.users) return false;

            // Check if any of the selected users have liked this influencer
            return likes.users.some(user =>
              likedByUsers.includes(user.email)
            );
          });
        }

        // Add like count to each influencer and sort by it
        const dataWithLikeCounts = filteredData.map(influencer => ({
          ...influencer,
          like_count: likesData[influencer.id]?.users?.length || 0,
          likes: likesData[influencer.id] || { users: [], isLikedByCurrentUser: false }
        }));

        // Sort by like count (most liked first) or by specified field
        if (sortField === 'like_count' || !sortField) {
          dataWithLikeCounts.sort((a, b) => b.like_count - a.like_count);
        } else if (sortField) {
          dataWithLikeCounts.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (sortOrder === 'asc') {
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
              return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
          });
        }

        // Apply pagination after sorting
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        data = dataWithLikeCounts.slice(from, to);
        count = filteredData.length;
        error = null;

        // likesData is already attached to data
        influencersWithExtras = data;
      } else {
        // Normal pagination and data fetching
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const result = await query;
        data = result.data;
        error = result.error;
        count = result.count;

        if (error) throw error;

        influencersWithExtras = data;

        // Fetch likes data in batch if needed
        let likesData = {};
        if (includeLikes && influencersWithExtras.length > 0) {
          const influencerIds = influencersWithExtras.map(i => i.id);
          likesData = await LikesService.getBatchLikesData(influencerIds, currentUserEmail);
        }

        // Apply filter for liked by specific users
        if (likedByUsers && likedByUsers.length > 0) {
          influencersWithExtras = influencersWithExtras.filter((influencer) => {
            const likes = likesData[influencer.id];
            if (!likes || !likes.users) return false;

            // Check if any of the selected users have liked this influencer
            return likes.users.some(user =>
              likedByUsers.includes(user.email)
            );
          });
        }
      }

      console.log(
        `Query returned ${count} total results, ${data.length} on this page. Saved filter: ${saved}`
      );

      // For non-saved views, we still need to attach likes data if not already done
      if (!saved && (includeTags || includeContactStatus || includeLikes)) {
        influencersWithExtras = await Promise.all(
          influencersWithExtras.map(async (influencer) => {
            const extras = { ...influencer };

            if (includeTags) {
              const tags = await this.getInfluencerTags(influencer.id);
              extras.tags = tags;
            }

            if (includeContactStatus) {
              const contactStatus = await this.getInfluencerContactStatus(
                influencer.id
              );
              extras.contact_status = contactStatus;
            }

            if (includeLikes && !influencer.likes) {
              // Fetch likes data for this specific influencer if not already present
              const likesForInfluencer = await LikesService.getLikedBy(influencer.id);
              const isLikedByCurrentUser = currentUserEmail ?
                likesForInfluencer.some(like => like.user_email === currentUserEmail) : false;
              extras.likes = {
                users: likesForInfluencer.map(like => ({
                  email: like.user_email,
                  name: like.user_name,
                  created_at: like.created_at
                })),
                isLikedByCurrentUser
              };
            } else if (influencer.likes) {
              extras.likes = influencer.likes;
            }

            return extras;
          })
        );
      } else if (saved && (includeTags || includeContactStatus)) {
        // For saved view, likes are already attached, just add tags and contact status if needed
        influencersWithExtras = await Promise.all(
          influencersWithExtras.map(async (influencer) => {
            const extras = { ...influencer };

            if (includeTags) {
              const tags = await this.getInfluencerTags(influencer.id);
              extras.tags = tags;
            }

            if (includeContactStatus) {
              const contactStatus = await this.getInfluencerContactStatus(
                influencer.id
              );
              extras.contact_status = contactStatus;
            }

            return extras;
          })
        );
      }

      return {
        data: influencersWithExtras,
        count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      };
    } catch (error) {
      console.error('Error fetching influencers:', error);
      throw error;
    }
  }

  async getInfluencerById(id) {
    try {
      const { data: dataArray, error } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('*')
        .eq('id', id);

      if (error) throw error;
      if (!dataArray || dataArray.length === 0) {
        throw new Error('Influencer not found');
      }

      const data = dataArray[0];

      const tags = await this.getInfluencerTags(id);
      const contactStatus = await this.getInfluencerContactStatus(id);

      return {
        ...data,
        tags,
        contact_status: contactStatus,
      };
    } catch (error) {
      console.error('Error fetching influencer:', error);
      throw error;
    }
  }

  async createInfluencer(influencerData) {
    try {
      const { tags, contact_status, ...mainData } = influencerData;

      if (!mainData.scraping_round) {
        mainData.scraping_round =
          mainData.influencer_type === 'sales' ? '2' : '1';
      }

      const { data: dataArray, error } = await supabase
        .from(TABLES.INFLUENCERS)
        .insert(mainData)
        .select();

      if (error) throw error;
      if (!dataArray || dataArray.length === 0) {
        throw new Error('Failed to create influencer');
      }

      const data = dataArray[0];

      if (tags && tags.length > 0) {
        await this.setInfluencerTags(data.id, tags);
      }

      if (contact_status && contact_status !== 'none') {
        await this.setInfluencerContactStatus(data.id, contact_status);
      }

      return data;
    } catch (error) {
      console.error('Error creating influencer:', error);
      throw error;
    }
  }

  async updateInfluencer(id, updates) {
    try {
      const { tags, contact_status, ...mainUpdates } = updates;

      const { data: dataArray, error } = await supabase
        .from(TABLES.INFLUENCERS)
        .update(mainUpdates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!dataArray || dataArray.length === 0) {
        throw new Error('Failed to update influencer');
      }

      const data = dataArray[0];

      if (tags !== undefined) {
        await this.setInfluencerTags(id, tags);
      }

      if (contact_status !== undefined) {
        await this.setInfluencerContactStatus(id, contact_status);
      }

      return data;
    } catch (error) {
      console.error('Error updating influencer:', error);
      throw error;
    }
  }

  async deleteInfluencer(id) {
    try {
      const { error } = await supabase
        .from(TABLES.INFLUENCERS)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting influencer:', error);
      throw error;
    }
  }

  async bulkCreateInfluencers(influencersData) {
    try {
      const processedData = influencersData.map((item) => {
        const { tags, contact_status, ...mainData } = item;

        if (!mainData.scraping_round) {
          mainData.scraping_round =
            mainData.influencer_type === 'sales' ? '2' : '1';
        }

        return mainData;
      });

      const { data, error } = await supabase
        .from(TABLES.INFLUENCERS)
        .insert(processedData)
        .select();

      if (error) throw error;

      const tagsToInsert = [];
      const statusesToInsert = [];

      influencersData.forEach((item, index) => {
        if (data[index]) {
          if (item.tags && item.tags.length > 0) {
            item.tags.forEach((tag) => {
              tagsToInsert.push({
                influencer_id: data[index].id,
                tag: tag,
              });
            });
          }

          if (item.contact_status && item.contact_status !== 'none') {
            statusesToInsert.push({
              influencer_id: data[index].id,
              status: item.contact_status,
            });
          }
        }
      });

      if (tagsToInsert.length > 0) {
        await supabase.from(TABLES.TAGS).insert(tagsToInsert);
      }

      if (statusesToInsert.length > 0) {
        await supabase.from(TABLES.CONTACT_STATUSES).insert(statusesToInsert);
      }

      return data;
    } catch (error) {
      console.error('Error bulk creating influencers:', error);
      throw error;
    }
  }

  async getInfluencerTags(influencerId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.TAGS)
        .select('tag')
        .eq('influencer_id', influencerId);

      if (error) throw error;
      return data ? data.map((item) => item.tag) : [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  }

  async setInfluencerTags(influencerId, tags) {
    try {
      await supabase
        .from(TABLES.TAGS)
        .delete()
        .eq('influencer_id', influencerId);

      if (tags && tags.length > 0) {
        const tagsToInsert = tags.map((tag) => ({
          influencer_id: influencerId,
          tag: tag.trim().toLowerCase(),
        }));

        await supabase.from(TABLES.TAGS).insert(tagsToInsert);
      }

      return true;
    } catch (error) {
      console.error('Error setting tags:', error);
      throw error;
    }
  }

  async addInfluencerTag(influencerId, tag) {
    try {
      const normalizedTag = tag.trim().toLowerCase();

      const { error } = await supabase.from(TABLES.TAGS).insert({
        influencer_id: influencerId,
        tag: normalizedTag,
      });

      if (error && error.code !== '23505') throw error;
      return true;
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  }

  async removeInfluencerTag(influencerId, tag) {
    try {
      const { error } = await supabase
        .from(TABLES.TAGS)
        .delete()
        .eq('influencer_id', influencerId)
        .eq('tag', tag);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  }

  async getAllUniqueTags() {
    try {
      const { data, error } = await supabase
        .from(TABLES.TAGS)
        .select('tag')
        .order('tag');

      if (error) throw error;

      const uniqueTags = [...new Set(data.map((item) => item.tag))];
      return uniqueTags;
    } catch (error) {
      console.error('Error fetching unique tags:', error);
      return [];
    }
  }

  async getInfluencerContactStatus(influencerId) {
    try {
      const { data: dataArray, error } = await supabase
        .from(TABLES.CONTACT_STATUSES)
        .select('status')
        .eq('influencer_id', influencerId);

      if (error && error.code !== 'PGRST116') throw error;
      return dataArray && dataArray.length > 0 ? dataArray[0].status : 'none';
    } catch (error) {
      console.error('Error fetching contact status:', error);
      return 'none';
    }
  }

  async setInfluencerContactStatus(influencerId, status, notes = null) {
    try {
      if (status === 'none' || !status) {
        await supabase
          .from(TABLES.CONTACT_STATUSES)
          .delete()
          .eq('influencer_id', influencerId);
      } else {
        const { error } = await supabase.from(TABLES.CONTACT_STATUSES).upsert(
          {
            influencer_id: influencerId,
            status: status,
            notes: notes,
          },
          {
            onConflict: 'influencer_id',
          }
        );

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error setting contact status:', error);
      throw error;
    }
  }

  async getSummary(influencerType = 'all') {
    try {
      const { data: dataArray, error } = await supabase
        .from(TABLES.SUMMARY_VIEW)
        .select('*')
        .eq('influencer_type', influencerType);

      if (error) throw error;
      if (!dataArray || dataArray.length === 0) {
        return null;
      }
      return dataArray[0];
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw error;
    }
  }

  async getAllSummaries() {
    try {
      const { data, error } = await supabase
        .from(TABLES.SUMMARY_VIEW)
        .select('*');

      if (error) throw error;

      const summaries = {};
      data.forEach((item) => {
        summaries[item.influencer_type] = item;
      });

      return summaries;
    } catch (error) {
      console.error('Error fetching all summaries:', error);
      throw error;
    }
  }

  async getMaxValues() {
    try {
      // Get max follower count
      const { data: followerDataArray, error: followerError } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('follower_count')
        .order('follower_count', { ascending: false })
        .limit(1);

      if (followerError) throw followerError;

      // Get max views count
      const { data: viewsDataArray, error: viewsError } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('views_count')
        .order('views_count', { ascending: false })
        .limit(1);

      if (viewsError) throw viewsError;

      const followerData =
        followerDataArray && followerDataArray.length > 0
          ? followerDataArray[0]
          : null;
      const viewsData =
        viewsDataArray && viewsDataArray.length > 0 ? viewsDataArray[0] : null;

      return {
        maxFollowers: followerData?.follower_count || 10000000,
        maxViews: viewsData?.views_count || 100000000,
      };
    } catch (error) {
      console.error('Error fetching max values:', error);
      return {
        maxFollowers: 10000000,
        maxViews: 100000000,
      };
    }
  }

  async searchInfluencersByTag(tag) {
    try {
      const { data, error } = await supabase
        .from(TABLES.TAGS)
        .select('influencer_id')
        .ilike('tag', `%${tag}%`);

      if (error) throw error;

      const influencerIds = data.map((item) => item.influencer_id);

      if (influencerIds.length === 0) return [];

      const { data: influencers, error: influencerError } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('*')
        .in('id', influencerIds);

      if (influencerError) throw influencerError;

      return influencers;
    } catch (error) {
      console.error('Error searching by tag:', error);
      throw error;
    }
  }

  async toggleSaved(influencerId) {
    try {
      console.log('Toggling saved status for influencer:', influencerId);

      // First, fetch current saved status
      const { data: currentDataArray, error: fetchError } = await supabase
        .from(TABLES.INFLUENCERS)
        .select('id, saved, saved_at')
        .eq('id', influencerId);

      if (fetchError) {
        console.error('Error fetching current status:', fetchError);
        throw fetchError;
      }

      if (!currentDataArray || currentDataArray.length === 0) {
        console.error('Influencer not found with ID:', influencerId);
        throw new Error('Influencer not found');
      }

      const currentData = currentDataArray[0];
      const newSavedStatus = !(currentData.saved === true);

      console.log(
        'Current saved status:',
        currentData.saved,
        '-> New status:',
        newSavedStatus
      );

      // Update the saved status
      const { data: updateResult, error: updateError } = await supabase
        .from(TABLES.INFLUENCERS)
        .update({
          saved: newSavedStatus,
          saved_at: newSavedStatus ? new Date().toISOString() : null,
        })
        .eq('id', influencerId)
        .select();

      if (updateError) {
        console.error('Error updating saved status:', updateError);
        throw updateError;
      }

      console.log('Successfully updated saved status:', updateResult);

      return updateResult && updateResult.length > 0 ? updateResult[0] : null;
    } catch (error) {
      console.error('Error in toggleSaved:', error);
      throw error;
    }
  }

  subscribeToChanges(callback) {
    const subscription = supabase
      .channel('influencers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.INFLUENCERS,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  }

  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
  async getUniqueScrapingRounds() {
    try {
      console.log('Fetching unique scraping rounds...');

      // Use RPC to get distinct values efficiently
      const { data, error } = await supabase.rpc(
        'get_distinct_scraping_rounds'
      );

      if (error) {
        console.log('RPC failed, using fallback method:', error.message);

        // Fallback: Fetch ALL records to get all unique scraping_rounds
        // We need to paginate through all records since Supabase has default limits
        const allRounds = new Set();
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(TABLES.INFLUENCERS)
            .select('scraping_round')
            .not('scraping_round', 'is', null)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (fallbackError) {
            console.error('Fallback failed on page', page, ':', fallbackError);
            break;
          }

          if (fallbackData && fallbackData.length > 0) {
            console.log(`Page ${page}: fetched ${fallbackData.length} records`);
            fallbackData.forEach((item) => {
              if (item.scraping_round != null) {
                allRounds.add(item.scraping_round);
              }
            });

            // If we got less than pageSize records, we've reached the end
            if (fallbackData.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }

        const filtered = Array.from(allRounds);
        console.log('Unique scraping rounds found (fallback):', filtered);
        console.log('Total unique rounds:', filtered.length);

        // Sort numerically if possible
        return filtered.sort((a, b) => {
          const numA = parseInt(a);
          const numB = parseInt(b);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.localeCompare(b);
        });
      }

      // RPC succeeded
      console.log('RPC data received:', data);

      // Return sorted distinct values
      const rounds = (data || [])
        .map((item) => item.scraping_round)
        .filter((round) => round != null);

      console.log('Unique scraping rounds found (RPC):', rounds);
      console.log('Total unique rounds:', rounds.length);

      // Sort numerically if possible
      return rounds.sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b);
      });
    } catch (error) {
      console.error('Error in getUniqueScrapingRounds:', error);
      return [];
    }
  }
}

export default new InfluencerService();
