#!/usr/bin/env python3
"""
Process influencer data from merged JSON file for Round 6:
1. Download thumbnail images
2. Upload to Cloudflare R2
3. Calculate metrics and format data
4. Insert into Supabase database
"""

import os
import sys
import json
import re
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client
import boto3
from botocore.config import Config
import time
import hashlib

class InfluencerDataProcessor:
    def __init__(self, config_file: str = '../../supabase_config.json',
                 r2_config_file: str = '../../r2_config_verish.json',
                 scraping_round: int = 6):
        """Initialize processor with configs"""
        # Load Supabase config
        config_path = Path(__file__).parent / config_file
        with open(config_path, 'r') as f:
            supabase_config = json.load(f)

        self.supabase = create_client(
            supabase_config['supabase_url'],
            supabase_config['supabase_key']
        )
        self.scraping_round = scraping_round

        # Load R2 config
        r2_path = Path(__file__).parent / r2_config_file
        with open(r2_path, 'r') as f:
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
        self.thumbnails_dir = Path(f'thumbnails_round_{self.scraping_round}')
        self.thumbnails_dir.mkdir(exist_ok=True)

        # Stats tracking
        self.stats = {
            'total': 0,
            'processed': 0,
            'images_downloaded': 0,
            'images_uploaded': 0,
            'db_inserted': 0,
            'db_updated': 0,
            'errors': []
        }

    def format_number(self, num) -> str:
        """Format number with K, M notation"""
        if num is None or (isinstance(num, float) and num != num):
            return '0'

        try:
            num = int(num)
        except:
            return '0'

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
        if not follower_count:
            return "Unknown"

        if follower_count < 100_000:
            return "마이크로"
        else:
            return "메가"

    def safe_int(self, value, default=0, max_val=2147483647):
        """Convert to int with bounds checking"""
        if value is None or (isinstance(value, float) and value != value):
            return default
        try:
            val = int(value)
            return min(val, max_val)
        except:
            return default

    def download_image(self, url: str, author_name: str) -> Optional[Path]:
        """Download image from URL using author_name for filename"""
        if not url:
            return None

        try:
            # Clean author_name for filename
            clean_author_name = re.sub(r'[/\\:*?"<>|]', '_', str(author_name))
            image_path = self.thumbnails_dir / f"{clean_author_name}.jpg"

            # Skip if already exists
            if image_path.exists():
                print(f"  ✓ Image already exists: {image_path.name}")
                return image_path

            # Download image
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()

            # Save image
            with open(image_path, 'wb') as f:
                f.write(response.content)

            self.stats['images_downloaded'] += 1
            print(f"  ✓ Downloaded: {image_path.name}")
            return image_path

        except Exception as e:
            print(f"  ✗ Failed to download image for {author_name}: {str(e)}")
            self.stats['errors'].append(f"Download failed for {author_name}: {str(e)}")
            return None

    def upload_to_r2(self, file_path: Path, key_prefix: str = None) -> Optional[str]:
        """Upload file to R2 and return URL"""
        try:
            if key_prefix is None:
                key_prefix = f'thumbnails_round_{self.scraping_round}/'
            key = f"{key_prefix}{file_path.name}"

            # Upload to R2
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

    def process_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single record from the JSON data"""

        # Extract nested fields safely
        author_meta = record.get('authorMeta', {})
        video_meta = record.get('videoMeta', {})
        music_meta = record.get('musicMeta', {})

        # Basic fields mapping
        data = {
            # Counts and formatted versions
            'shares_count': self.safe_int(record.get('shareCount', 0)),
            'shares_count_formatted': self.format_number(record.get('shareCount', 0)),
            'comments_count': self.safe_int(record.get('commentCount', 0)),
            'comments_count_formatted': self.format_number(record.get('commentCount', 0)),
            'views_count': self.safe_int(record.get('playCount', 0)),
            'views_count_formatted': self.format_number(record.get('playCount', 0)),
            'likes_count': self.safe_int(record.get('diggCount', 0)),
            'likes_count_formatted': self.format_number(record.get('diggCount', 0)),
            'follower_count': self.safe_int(author_meta.get('fans', 0)),
            'follower_count_formatted': self.format_number(author_meta.get('fans', 0)),

            # Account info
            'account_id': str(author_meta.get('name', '')),  # username
            'author_id': str(author_meta.get('id', '')),
            'author_name': str(author_meta.get('nickName', '')),  # display name

            # Video info
            'upload_time': record.get('createTimeISO'),
            'upload_count': self.safe_int(author_meta.get('video', 0)),
            'video_duration': self.safe_int(video_meta.get('duration', 0)),
            'video_caption': str(record.get('text', '')),
            'thumbnail_url': str(video_meta.get('coverUrl', '')),
            'video_url': str(record.get('webVideoUrl', '')),

            # Music info
            'music_artist': str(music_meta.get('musicAuthor', '')),
            'music_title': str(music_meta.get('musicName', '')),

            # Profile info
            'profile_intro': str(author_meta.get('signature', '')),
            'profile_entry': str(author_meta.get('profileUrl', '')),

            # Scraping info
            'scraping_round': self.scraping_round
        }

        # Calculate metrics
        plays = data['views_count']
        likes = data['likes_count']
        comments = data['comments_count']
        shares = data['shares_count']
        followers = data['follower_count']

        # Engagement rate
        if plays > 0:
            data['engagement_rate'] = round((likes + comments + shares) / plays * 100, 2)
            data['comment_conversion'] = round(comments / plays * 100, 2)
        else:
            data['engagement_rate'] = 0.0
            data['comment_conversion'] = 0.0

        # Follower quality
        if followers > 0:
            data['follower_quality'] = round((likes + comments) / followers * 100, 2)
        else:
            data['follower_quality'] = 0.0

        # Estimated CPM
        data['estimated_cpm'] = round(min(followers / 1000 * 1.5, 150), 2)

        # Cost efficiency
        data['cost_efficiency'] = round(100 / (data['estimated_cpm'] + 1), 2)

        # Follower tier
        data['follower_tier'] = self.determine_follower_tier(followers)

        # Extract email
        data['email'] = self.extract_email(data['profile_intro'])

        # Set default values for additional fields
        data['influencer_type'] = 'regular'
        data['status'] = 'none'
        data['saved'] = False

        return data

    def process_batch(self, records: List[Dict], start_idx: int = 0, batch_size: int = 10) -> None:
        """Process a batch of records"""
        end_idx = min(start_idx + batch_size, len(records))
        batch = records[start_idx:end_idx]

        print(f"\nProcessing batch {start_idx+1}-{end_idx} of {len(records)} records...")

        for idx, record in enumerate(batch, start=start_idx):
            try:
                author_meta = record.get('authorMeta', {})
                account_name = author_meta.get('nickName', 'Unknown')
                print(f"\n[{idx+1}/{len(records)}] Processing {account_name}...")

                # Process record data
                data = self.process_record(record)

                # Download and upload thumbnail
                thumbnail_url = record.get('videoMeta', {}).get('coverUrl')
                if thumbnail_url:
                    image_path = self.download_image(thumbnail_url, data['author_name'])
                    if image_path:
                        r2_url = self.upload_to_r2(image_path)
                        data['r2_thumbnail_url'] = r2_url or ''
                    else:
                        data['r2_thumbnail_url'] = ''
                else:
                    data['r2_thumbnail_url'] = ''

                # Insert into database
                try:
                    # Check if record exists by account_id (which is unique)
                    existing = self.supabase.table('influencers').select('id').eq(
                        'account_id', data['account_id']
                    ).execute()

                    if existing.data and len(existing.data) > 0:
                        # Update existing record
                        print(f"  Found existing record (ID: {existing.data[0]['id']})")
                        update_data = {k: v for k, v in data.items() if k != 'id'}
                        result = self.supabase.table('influencers').update(update_data).eq(
                            'id', existing.data[0]['id']
                        ).execute()
                        print(f"  ✓ Updated in database (ID: {existing.data[0]['id']})")
                        self.stats['db_updated'] += 1
                    else:
                        # Insert new record
                        print(f"  Inserting new record...")
                        insert_data = {k: v for k, v in data.items() if k != 'id'}

                        # Ensure required fields
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
                    self.stats['errors'].append(f"DB error for {data['account_id']}: {str(e)}")

                self.stats['processed'] += 1

                # No delay for faster processing
                # time.sleep(0.1)

            except Exception as e:
                print(f"  ✗ Error processing record {idx}: {str(e)}")
                self.stats['errors'].append(f"Record {idx} error: {str(e)}")

    def process_json_file(self, file_path: str, test_mode: bool = False):
        """Main processing function"""
        print("=" * 60)
        print(f"Influencer Data Processor - Round {self.scraping_round}")
        print("=" * 60)

        # Read JSON file
        print(f"\nReading JSON file: {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            records = json.load(f)

        self.stats['total'] = len(records)
        print(f"Found {len(records)} records to process")

        if test_mode:
            print("\n⚠️  TEST MODE: Processing only first 5 records")
            records = records[:5]

        # Process in batches
        batch_size = 10
        for i in range(0, len(records), batch_size):
            self.process_batch(records, i, batch_size)

        # Print summary
        print("\n" + "=" * 60)
        print("PROCESSING COMPLETE")
        print("=" * 60)
        print(f"Total records: {self.stats['total']}")
        print(f"Processed: {self.stats['processed']}")
        print(f"Images downloaded: {self.stats['images_downloaded']}")
        print(f"Images uploaded to R2: {self.stats['images_uploaded']}")
        print(f"Database records inserted: {self.stats['db_inserted']}")
        print(f"Database records updated: {self.stats['db_updated']}")

        if self.stats['errors']:
            print(f"\n⚠️  Errors encountered: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:10]:
                print(f"  - {error}")
            if len(self.stats['errors']) > 10:
                print(f"  ... and {len(self.stats['errors']) - 10} more")

        # Save stats to file
        stats_file = f"processing_stats_round_{self.scraping_round}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(stats_file, 'w') as f:
            json.dump(self.stats, f, indent=2, ensure_ascii=False)
        print(f"\n📊 Stats saved to: {stats_file}")

def main():
    """Main entry point"""
    # Check if test mode
    test_mode = '--test' in sys.argv

    # Initialize processor for round 6
    processor = InfluencerDataProcessor(scraping_round=6)

    # Process the merged JSON file
    processor.process_json_file('merged_influencers_1000.json', test_mode=test_mode)

if __name__ == "__main__":
    main()