#!/usr/bin/env python3
"""
Process influencer data from Excel file:
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
import pandas as pd
import numpy as np
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
    def __init__(self, config_file: str = 'supabase_config.json', r2_config_file: str = 'r2_config.json'):
        """Initialize processor with configs"""
        # Load Supabase config
        with open(config_file, 'r') as f:
            supabase_config = json.load(f)

        self.supabase = create_client(
            supabase_config['supabase_url'],
            supabase_config['supabase_key']
        )
        self.scraping_round = supabase_config.get('scraping_round', 4)

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
        self.thumbnails_dir = Path(f'thumbnails_round_{self.scraping_round}')
        self.thumbnails_dir.mkdir(exist_ok=True)

        # Stats tracking
        self.stats = {
            'total': 0,
            'processed': 0,
            'images_downloaded': 0,
            'images_uploaded': 0,
            'db_inserted': 0,
            'errors': []
        }

    def format_number(self, num: int) -> str:
        """Format number with K, M notation"""
        if pd.isna(num) or num is None:
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
        if pd.isna(text) or not text:
            return None

        # Common email patterns
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        match = re.search(email_pattern, str(text))

        if match:
            return match.group(0).lower()
        return None

    def determine_follower_tier(self, follower_count: int) -> str:
        """Determine follower tier (마이크로/메가)"""
        if pd.isna(follower_count):
            return "Unknown"

        if follower_count < 100_000:
            return "마이크로"
        else:
            return "메가"

    def download_image(self, url: str, account_id: str) -> Optional[Path]:
        """Download image from URL"""
        if pd.isna(url) or not url:
            return None

        try:
            # Clean account_id for filename
            clean_account_id = re.sub(r'[/\\:*?"<>|]', '_', str(account_id))
            image_path = self.thumbnails_dir / f"{clean_account_id}.jpg"

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
            print(f"  ✗ Failed to download image for {account_id}: {str(e)}")
            self.stats['errors'].append(f"Download failed for {account_id}: {str(e)}")
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

    def process_row(self, row: pd.Series) -> Dict[str, Any]:
        """Process a single row of data"""
        # Helper function to safely convert to int with max limit
        def safe_int(value, default=0, max_val=2147483647):
            """Convert to int with bounds checking (PostgreSQL integer max is 2147483647)"""
            if pd.isna(value):
                return default
            try:
                val = int(value)
                # Cap at PostgreSQL integer maximum
                return min(val, max_val)
            except:
                return default

        # Basic fields mapping
        data = {
            # Counts and formatted versions
            'shares_count': safe_int(row.get('shareCount', 0)),
            'shares_count_formatted': self.format_number(row.get('shareCount', 0)),
            'comments_count': safe_int(row.get('commentCount', 0)),
            'comments_count_formatted': self.format_number(row.get('commentCount', 0)),
            'views_count': safe_int(row.get('playCount', 0)),
            'views_count_formatted': self.format_number(row.get('playCount', 0)),
            'likes_count': safe_int(row.get('diggCount', 0)),
            'likes_count_formatted': self.format_number(row.get('diggCount', 0)),
            'follower_count': safe_int(row.get('authorMeta/fans', 0)),
            'follower_count_formatted': self.format_number(row.get('authorMeta/fans', 0)),

            # Account info
            'account_id': str(row.get('authorMeta/nickName', '')),
            'author_id': str(row.get('authorMeta/id', '')),
            'author_name': str(row.get('authorMeta/name', '')),

            # Video info
            'upload_time': str(row.get('createTimeISO', '')) if not pd.isna(row.get('createTimeISO')) else None,
            'upload_count': safe_int(row.get('authorMeta/video', 0)),
            'video_duration': safe_int(row.get('videoMeta/duration', 0)),
            'video_caption': str(row.get('text', '')) if not pd.isna(row.get('text')) else '',
            'thumbnail_url': str(row.get('videoMeta/coverUrl', '')) if not pd.isna(row.get('videoMeta/coverUrl')) else '',
            'video_url': str(row.get('webVideoUrl', '')) if not pd.isna(row.get('webVideoUrl')) else '',

            # Music info
            'music_artist': str(row.get('musicMeta/musicAuthor', '')) if not pd.isna(row.get('musicMeta/musicAuthor')) else '',
            'music_title': str(row.get('musicMeta/musicName', '')) if not pd.isna(row.get('musicMeta/musicName')) else '',

            # Profile info
            'profile_intro': str(row.get('authorMeta/signature', '')) if not pd.isna(row.get('authorMeta/signature')) else '',
            'profile_entry': str(row.get('authorMeta/profileUrl', '')) if not pd.isna(row.get('authorMeta/profileUrl')) else '',

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

        # Estimated CPM - ensure it's a proper float with 2 decimal places
        data['estimated_cpm'] = round(min(followers / 1000 * 1.5, 150), 2)

        # Cost efficiency
        data['cost_efficiency'] = round(100 / (data['estimated_cpm'] + 1), 2)

        # Follower tier
        data['follower_tier'] = self.determine_follower_tier(followers)

        # Extract email
        data['email'] = self.extract_email(data['profile_intro'])

        # Set default values for additional fields
        data['influencer_type'] = 'regular'  # Can be changed based on criteria
        data['status'] = 'none'
        data['saved'] = False

        return data

    def process_batch(self, df: pd.DataFrame, start_idx: int = 0, batch_size: int = 10) -> None:
        """Process a batch of records"""
        end_idx = min(start_idx + batch_size, len(df))
        batch_df = df.iloc[start_idx:end_idx]

        print(f"\nProcessing batch {start_idx+1}-{end_idx} of {len(df)} records...")

        for idx, row in batch_df.iterrows():
            try:
                print(f"\n[{idx+1}/{len(df)}] Processing {row.get('authorMeta/nickName', 'Unknown')}...")

                # Process row data
                data = self.process_row(row)

                # Download and upload thumbnail
                thumbnail_url = row.get('videoMeta/coverUrl')
                if thumbnail_url and not pd.isna(thumbnail_url):
                    image_path = self.download_image(thumbnail_url, data['account_id'])
                    if image_path:
                        r2_url = self.upload_to_r2(image_path)
                        data['r2_thumbnail_url'] = r2_url or ''
                    else:
                        data['r2_thumbnail_url'] = ''
                else:
                    data['r2_thumbnail_url'] = ''

                # Insert into database
                try:
                    # Check if record exists (by author_id AND account_id combination)
                    # This is more accurate as it checks for the exact same influencer
                    existing = self.supabase.table('influencers').select('id').eq('author_id', data['author_id']).eq('account_id', data['account_id']).execute()

                    if existing.data and len(existing.data) > 0:
                        # Update existing record
                        print(f"  Found existing record (ID: {existing.data[0]['id']})")
                        update_data = {k: v for k, v in data.items() if k != 'id'}
                        result = self.supabase.table('influencers').update(update_data).eq('id', existing.data[0]['id']).execute()
                        print(f"  ✓ Updated in database (ID: {existing.data[0]['id']})")
                        self.stats['db_inserted'] += 1
                    else:
                        # Insert new record - database will auto-generate the ID
                        print(f"  Inserting new record...")
                        # Remove any id field to let database auto-generate it
                        insert_data = {k: v for k, v in data.items() if k != 'id'}

                        # Ensure required fields are not null
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

                # Small delay to avoid rate limiting
                time.sleep(0.5)

            except Exception as e:
                print(f"  ✗ Error processing row {idx}: {str(e)}")
                self.stats['errors'].append(f"Row {idx} error: {str(e)}")

    def process_excel_file(self, file_path: str, test_mode: bool = False):
        """Main processing function"""
        print("=" * 60)
        print("Influencer Data Processor")
        print("=" * 60)

        # Read Excel file
        print(f"\nReading Excel file: {file_path}")
        df = pd.read_excel(file_path)
        self.stats['total'] = len(df)

        print(f"Found {len(df)} records to process")

        if test_mode:
            print("\n⚠️  TEST MODE: Processing only first 5 records")
            df = df.head(5)

        # Process in batches
        batch_size = 10
        for i in range(0, len(df), batch_size):
            self.process_batch(df, i, batch_size)

        # Print summary
        print("\n" + "=" * 60)
        print("PROCESSING COMPLETE")
        print("=" * 60)
        print(f"Total records: {self.stats['total']}")
        print(f"Processed: {self.stats['processed']}")
        print(f"Images downloaded: {self.stats['images_downloaded']}")
        print(f"Images uploaded to R2: {self.stats['images_uploaded']}")
        print(f"Database records inserted/updated: {self.stats['db_inserted']}")

        if self.stats['errors']:
            print(f"\n⚠️  Errors encountered: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:10]:
                print(f"  - {error}")
            if len(self.stats['errors']) > 10:
                print(f"  ... and {len(self.stats['errors']) - 10} more")

        # Save stats to file
        stats_file = f"processing_stats_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(stats_file, 'w') as f:
            json.dump(self.stats, f, indent=2, ensure_ascii=False)
        print(f"\n📊 Stats saved to: {stats_file}")

def main():
    """Main entry point"""
    processor = InfluencerDataProcessor()

    # Check if test mode
    test_mode = '--test' in sys.argv

    # Process the Excel file
    processor.process_excel_file('verish_round_3.xlsx', test_mode=test_mode)

if __name__ == "__main__":
    main()