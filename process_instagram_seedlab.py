#!/usr/bin/env python3
"""
Process Instagram influencer data for Seedlab:
1. Load reels JSON and profile JSON
2. Join data by username
3. Download thumbnail images
4. Upload to Cloudflare R2
5. Calculate metrics and format data
6. Insert into Supabase database
"""

import os
import sys
import json
import re
import requests
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from supabase import create_client
import boto3
from botocore.config import Config
import time

class InstagramDataProcessor:
    def __init__(self, config_file: str = 'supabase_config.json', r2_config_file: str = 'r2_config_seedlab.json'):
        """Initialize processor with configs"""
        # Load Supabase config
        with open(config_file, 'r') as f:
            supabase_config = json.load(f)

        self.supabase = create_client(
            supabase_config['supabase_url'],
            supabase_config['supabase_key']
        )

        # Load R2 config
        with open(r2_config_file, 'r') as f:
            r2_config = json.load(f)

        self.r2_config = r2_config
        self.bucket_name = r2_config['bucket_name']
        self.thumbnails_base_url = r2_config['thumbnails_base_url']

        # Initialize S3 client for R2
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f"https://{r2_config['account_id']}.r2.cloudflarestorage.com",
            aws_access_key_id=r2_config['access_key_id'],
            aws_secret_access_key=r2_config['secret_access_key'],
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                retries={'max_attempts': 3}
            )
        )

        # Create directories for thumbnails
        self.thumbnails_dir = Path('thumbnails_instagram_round_1')
        self.thumbnails_dir.mkdir(exist_ok=True)

        # Company and platform
        self.company = 'seedlab'
        self.platform = 'instagram'
        self.scraping_round = '1'

        # Stats tracking
        self.stats = {
            'total_reels': 0,
            'total_profiles': 0,
            'matched_profiles': 0,
            'processed': 0,
            'images_downloaded': 0,
            'images_uploaded': 0,
            'db_inserted': 0,
            'errors': [],
            'missing_profiles': []
        }

    def format_number(self, num) -> str:
        """Format number with K, M notation"""
        if num is None or (isinstance(num, float) and np.isnan(num)):
            return '0'

        num = int(num)
        if num >= 1_000_000:
            return f"{num/1_000_000:.1f}M"
        elif num >= 1_000:
            return f"{num/1_000:.1f}K"
        else:
            return str(num)

    def extract_email(self, text: str) -> Optional[str]:
        """Extract email from text using regex"""
        if not text:
            return None

        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        match = re.search(email_pattern, str(text))

        if match:
            return match.group(0).lower()
        return None

    def determine_follower_tier(self, follower_count: int) -> str:
        """Determine follower tier (마이크로/메가)"""
        if follower_count is None:
            return "Unknown"

        if follower_count < 100_000:
            return "마이크로"
        else:
            return "메가"

    def download_image(self, url: str, username: str) -> Optional[Path]:
        """Download image from URL"""
        if not url:
            return None

        try:
            clean_username = re.sub(r'[/\\:*?"<>|]', '_', str(username))
            image_path = self.thumbnails_dir / f"{clean_username}.jpg"

            if image_path.exists():
                print(f"  ✓ Image already exists: {image_path.name}")
                return image_path

            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()

            with open(image_path, 'wb') as f:
                f.write(response.content)

            self.stats['images_downloaded'] += 1
            print(f"  ✓ Downloaded: {image_path.name}")
            return image_path

        except Exception as e:
            print(f"  ✗ Failed to download image for {username}: {str(e)}")
            self.stats['errors'].append(f"Download failed for {username}: {str(e)}")
            return None

    def upload_to_r2(self, file_path: Path) -> Optional[str]:
        """Upload file to R2 and return URL"""
        try:
            key = f"thumbnails_instagram_round_1/{file_path.name}"

            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                key,
                ExtraArgs={
                    'ContentType': 'image/jpeg',
                    'CacheControl': 'public, max-age=31536000'
                }
            )

            self.stats['images_uploaded'] += 1
            r2_url = f"{self.thumbnails_base_url}{key}"
            print(f"  ✓ Uploaded to R2: {key}")
            return r2_url

        except Exception as e:
            print(f"  ✗ Failed to upload {file_path.name}: {str(e)}")
            self.stats['errors'].append(f"Upload failed for {file_path.name}: {str(e)}")
            return None

    def safe_int(self, value, default=0, max_val=2147483647):
        """Convert to int with bounds checking"""
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return default
        try:
            val = int(value)
            return min(val, max_val)
        except:
            return default

    def process_reel(self, reel: Dict, profile: Optional[Dict]) -> Dict[str, Any]:
        """Process a single reel with optional profile data"""

        username = reel.get('ownerUsername', '')
        author_name = reel.get('ownerFullName', '') or username
        author_id = str(reel.get('ownerId', ''))

        data = {
            'shares_count': 0,
            'shares_count_formatted': '0',
            'comments_count': self.safe_int(reel.get('commentsCount', 0)),
            'comments_count_formatted': self.format_number(reel.get('commentsCount', 0)),
            'views_count': self.safe_int(reel.get('videoPlayCount', 0)),
            'views_count_formatted': self.format_number(reel.get('videoPlayCount', 0)),
            'likes_count': self.safe_int(reel.get('likesCount', 0)),
            'likes_count_formatted': self.format_number(reel.get('likesCount', 0)),

            'account_id': username,
            'author_id': author_id,
            'author_name': author_name,

            'upload_time': reel.get('timestamp', ''),
            'video_duration': self.safe_int(reel.get('videoDuration', 0)),
            'video_caption': reel.get('caption', ''),
            'video_url': reel.get('url', ''),

            'music_artist': '',
            'music_title': '',

            'profile_entry': reel.get('inputUrl', ''),

            'company': self.company,
            'platform': self.platform,
            'scraping_round': self.scraping_round,
        }

        # Add profile data if available
        if profile:
            data['follower_count'] = self.safe_int(profile.get('followersCount', 0))
            data['follower_count_formatted'] = self.format_number(profile.get('followersCount', 0))
            data['profile_intro'] = profile.get('biography', '')
            data['upload_count'] = self.safe_int(profile.get('postsCount', 0))
            data['email'] = self.extract_email(profile.get('biography', ''))
            self.stats['matched_profiles'] += 1
        else:
            data['follower_count'] = 0
            data['follower_count_formatted'] = '0'
            data['profile_intro'] = ''
            data['upload_count'] = 0
            data['email'] = None
            self.stats['missing_profiles'].append(username)
            print(f"  ⚠️  No profile data found for {username}")

        # Calculate metrics
        plays = data['views_count']
        likes = data['likes_count']
        comments = data['comments_count']
        shares = data['shares_count']
        followers = data['follower_count']

        if plays > 0:
            data['engagement_rate'] = round((likes + comments + shares) / plays * 100, 2)
            data['comment_conversion'] = round(comments / plays * 100, 2)
        else:
            data['engagement_rate'] = 0.0
            data['comment_conversion'] = 0.0

        if followers > 0:
            data['follower_quality'] = round((likes + comments) / followers * 100, 2)
        else:
            data['follower_quality'] = 0.0

        data['estimated_cpm'] = round(min(followers / 1000 * 1.5, 150), 2)
        data['cost_efficiency'] = round(100 / (data['estimated_cpm'] + 1), 2)
        data['follower_tier'] = self.determine_follower_tier(followers)

        data['influencer_type'] = 'regular'
        data['status'] = 'none'
        data['saved'] = False

        return data

    def process_data(self, reels_file: str, profiles_file: str, test_mode: bool = False):
        """Main processing function"""
        print("=" * 60)
        print("Instagram Data Processor - Seedlab")
        print("=" * 60)

        # Load reels data
        print(f"\nReading reels JSON: {reels_file}")
        with open(reels_file, 'r') as f:
            reels = json.load(f)
        self.stats['total_reels'] = len(reels)
        print(f"Found {len(reels)} reels to process")

        # Load profiles data
        print(f"\nReading profiles JSON: {profiles_file}")
        with open(profiles_file, 'r') as f:
            profiles = json.load(f)
        self.stats['total_profiles'] = len(profiles)
        print(f"Found {len(profiles)} profiles")

        # Create profile lookup by username
        profile_lookup = {p['username']: p for p in profiles}

        if test_mode:
            print("\n⚠️  TEST MODE: Processing only first 3 records")
            reels = reels[:3]

        # Process each reel
        for idx, reel in enumerate(reels):
            try:
                username = reel.get('ownerUsername', 'Unknown')
                print(f"\n[{idx+1}/{len(reels)}] Processing @{username}...")

                # Get matching profile
                profile = profile_lookup.get(username)

                # Process reel data
                data = self.process_reel(reel, profile)

                # Download and upload thumbnail
                instagram_thumbnail_url = reel.get('images', [''])[0] if reel.get('images') else ''
                if instagram_thumbnail_url:
                    image_path = self.download_image(instagram_thumbnail_url, username)
                    if image_path:
                        r2_url = self.upload_to_r2(image_path)
                        data['r2_thumbnail_url'] = r2_url or ''
                        data['thumbnail_url'] = r2_url or ''
                    else:
                        data['r2_thumbnail_url'] = ''
                        data['thumbnail_url'] = ''
                else:
                    data['r2_thumbnail_url'] = ''
                    data['thumbnail_url'] = ''

                # Insert into database
                try:
                    existing = self.supabase.table('influencers').select('id').eq('author_id', data['author_id']).eq('account_id', data['account_id']).execute()

                    if existing.data and len(existing.data) > 0:
                        print(f"  Found existing record (ID: {existing.data[0]['id']})")
                        update_data = {k: v for k, v in data.items() if k != 'id'}
                        result = self.supabase.table('influencers').update(update_data).eq('id', existing.data[0]['id']).execute()
                        print(f"  ✓ Updated in database (ID: {existing.data[0]['id']})")
                        self.stats['db_inserted'] += 1
                    else:
                        print(f"  Inserting new record...")
                        insert_data = {k: v for k, v in data.items() if k != 'id'}

                        if not insert_data.get('author_id'):
                            insert_data['author_id'] = f"unknown_{data.get('account_id', 'unknown')}"

                        result = self.supabase.table('influencers').insert(insert_data).execute()
                        if result.data and len(result.data) > 0:
                            new_id = result.data[0].get('id', 'unknown')
                            print(f"  ✓ Inserted into database (New ID: {new_id})")
                            self.stats['db_inserted'] += 1
                        else:
                            print(f"  ⚠ Insert returned no data")

                except Exception as e:
                    print(f"  ✗ Database error: {str(e)}")
                    self.stats['errors'].append(f"DB error for {username}: {str(e)}")

                self.stats['processed'] += 1
                time.sleep(0.5)

            except Exception as e:
                print(f"  ✗ Error processing reel {idx}: {str(e)}")
                self.stats['errors'].append(f"Reel {idx} error: {str(e)}")

        # Print summary
        print("\n" + "=" * 60)
        print("PROCESSING COMPLETE")
        print("=" * 60)
        print(f"Total reels: {self.stats['total_reels']}")
        print(f"Total profiles: {self.stats['total_profiles']}")
        print(f"Matched profiles: {self.stats['matched_profiles']}")
        print(f"Missing profiles: {len(self.stats['missing_profiles'])}")
        print(f"Processed: {self.stats['processed']}")
        print(f"Images downloaded: {self.stats['images_downloaded']}")
        print(f"Images uploaded to R2: {self.stats['images_uploaded']}")
        print(f"Database records inserted/updated: {self.stats['db_inserted']}")

        if self.stats['missing_profiles']:
            print(f"\n⚠️  Users without profile data ({len(self.stats['missing_profiles'])}):")
            for username in self.stats['missing_profiles']:
                print(f"  - @{username}")

        if self.stats['errors']:
            print(f"\n⚠️  Errors encountered: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:10]:
                print(f"  - {error}")
            if len(self.stats['errors']) > 10:
                print(f"  ... and {len(self.stats['errors']) - 10} more")

        # Save stats to file
        stats_file = f"processing_stats_instagram_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(stats_file, 'w') as f:
            json.dump(self.stats, f, indent=2, ensure_ascii=False)
        print(f"\n📊 Stats saved to: {stats_file}")

def main():
    """Main entry point"""
    processor = InstagramDataProcessor()

    test_mode = '--test' in sys.argv

    reels_file = 'seedlab_data/1st_31.json'
    profiles_file = 'seedlab_data/1st_27_profile.json'

    processor.process_data(reels_file, profiles_file, test_mode=test_mode)

if __name__ == "__main__":
    main()