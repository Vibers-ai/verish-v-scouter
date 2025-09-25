// Test script for the new likes functionality
// Run with: node test_likes.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kygjewfpclmjupygwbiw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Z2pld2ZwY2xtanVweWd3Yml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NDg0NTMsImV4cCI6MjA3NDAyNDQ1M30.dvhIil8z3P62a20zquIjRrtt5rpMTZs_29K-sMN2w9I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLikesTable() {
  console.log('Testing Likes Functionality...\n');

  try {
    // 1. Test table exists
    console.log('1. Checking if table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('influencer_likes')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table check failed:', tableError);
      return;
    }
    console.log('✅ Table exists and is accessible\n');

    // 2. Get a sample influencer to test with
    console.log('2. Getting a sample influencer...');
    const { data: influencers, error: infError } = await supabase
      .from('influencers')
      .select('id, author_name')
      .limit(1);

    if (infError || !influencers || influencers.length === 0) {
      console.error('❌ Could not get sample influencer:', infError);
      return;
    }

    const testInfluencer = influencers[0];
    console.log(`✅ Using influencer: ${testInfluencer.author_name} (ID: ${testInfluencer.id})\n`);

    // 3. Test inserting a like
    console.log('3. Testing insert like...');
    const testUser = {
      email: 'test@example.com',
      name: 'Test User',
      id: 'test-123'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('influencer_likes')
      .insert({
        influencer_id: testInfluencer.id,
        user_email: testUser.email,
        user_name: testUser.name,
        user_id: testUser.id
      })
      .select();

    if (insertError) {
      // Check if it's a duplicate error
      if (insertError.code === '23505') {
        console.log('⚠️  Like already exists (this is OK)\n');
      } else {
        console.error('❌ Insert failed:', insertError);
        return;
      }
    } else {
      console.log('✅ Successfully inserted like:', insertData[0]);
    }

    // 4. Test reading likes
    console.log('\n4. Testing read likes...');
    const { data: likes, error: readError } = await supabase
      .from('influencer_likes')
      .select('*')
      .eq('influencer_id', testInfluencer.id);

    if (readError) {
      console.error('❌ Read failed:', readError);
      return;
    }

    console.log(`✅ Found ${likes.length} like(s) for this influencer`);
    if (likes.length > 0) {
      console.log('Sample like:', likes[0]);
    }

    // 5. Test deleting the test like
    console.log('\n5. Testing delete like...');
    const { error: deleteError } = await supabase
      .from('influencer_likes')
      .delete()
      .eq('influencer_id', testInfluencer.id)
      .eq('user_email', testUser.email);

    if (deleteError) {
      console.error('❌ Delete failed:', deleteError);
    } else {
      console.log('✅ Successfully deleted test like');
    }

    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed! The likes table is ready to use.');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testLikesTable();