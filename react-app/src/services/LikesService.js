import { supabase, TABLES } from './supabase';

class LikesService {
  // Get all users who liked a specific influencer
  async getLikedBy(influencerId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.LIKES)
        .select('user_email, user_name, user_id, created_at')
        .eq('influencer_id', influencerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching likes for influencer:', error);
      return [];
    }
  }

  // Get all influencers liked by a specific user
  async getUserLikes(userEmail) {
    try {
      const { data, error } = await supabase
        .from(TABLES.LIKES)
        .select('influencer_id, created_at')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user likes:', error);
      return [];
    }
  }

  // Toggle like for a specific influencer by a specific user
  async toggleUserLike(influencerId, userEmail, userName = null, userId = null) {
    try {
      // First check if the like exists
      const { data: existingLike, error: checkError } = await supabase
        .from(TABLES.LIKES)
        .select('id')
        .eq('influencer_id', influencerId)
        .eq('user_email', userEmail)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingLike) {
        // Like exists, so remove it
        const { error: deleteError } = await supabase
          .from(TABLES.LIKES)
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) throw deleteError;
        return { liked: false };
      } else {
        // Like doesn't exist, so add it
        const { error: insertError } = await supabase
          .from(TABLES.LIKES)
          .insert({
            influencer_id: influencerId,
            user_email: userEmail,
            user_name: userName,
            user_id: userId,
          });

        if (insertError) throw insertError;
        return { liked: true };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }


  // Get likes data for multiple influencers (batch operation for performance)
  async getBatchLikesData(influencerIds, currentUserEmail = null) {
    try {
      const { data, error } = await supabase
        .from(TABLES.LIKES)
        .select('influencer_id, user_email, user_name, created_at')
        .in('influencer_id', influencerIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Organize data by influencer_id
      const likesMap = {};

      influencerIds.forEach((id) => {
        likesMap[id] = {
          users: [],
          isLikedByCurrentUser: false,
        };
      });

      if (data) {
        data.forEach((like) => {
          if (!likesMap[like.influencer_id]) {
            likesMap[like.influencer_id] = {
              users: [],
              isLikedByCurrentUser: false,
            };
          }

          likesMap[like.influencer_id].users.push({
            email: like.user_email,
            name: like.user_name,
            created_at: like.created_at,
          });

          if (currentUserEmail && like.user_email === currentUserEmail) {
            likesMap[like.influencer_id].isLikedByCurrentUser = true;
          }
        });
      }

      return likesMap;
    } catch (error) {
      console.error('Error fetching batch likes data:', error);
      return {};
    }
  }

  // Get all unique users who have liked any influencer (for filter dropdown)
  async getAllUsersWhoLiked() {
    try {
      const { data, error } = await supabase
        .from(TABLES.LIKES)
        .select('user_email, user_name')
        .order('user_name');

      if (error) throw error;

      // Remove duplicates and return unique users
      const uniqueUsers = [];
      const emailSet = new Set();

      if (data) {
        data.forEach((user) => {
          if (!emailSet.has(user.user_email)) {
            emailSet.add(user.user_email);
            uniqueUsers.push({
              email: user.user_email,
              name: user.user_name || user.user_email,
            });
          }
        });
      }

      return uniqueUsers;
    } catch (error) {
      console.error('Error fetching users who liked:', error);
      return [];
    }
  }

  // Check if current user has liked an influencer
  async hasUserLiked(influencerId, userEmail) {
    try {
      const { data, error } = await supabase
        .from(TABLES.LIKES)
        .select('id')
        .eq('influencer_id', influencerId)
        .eq('user_email', userEmail)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking user like:', error);
      return false;
    }
  }

  // Subscribe to real-time like changes
  subscribeToLikeChanges(callback) {
    const subscription = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.LIKES,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  }

  // Unsubscribe from real-time updates
  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
}

export default new LikesService();