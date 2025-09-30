#!/usr/bin/env python3
"""
Preview script to extract database fields from merged_influencers_1000.json
for scraping round 6 before processing.
"""

import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

class Round6DataPreview:
    def __init__(self, scraping_round: int = 6):
        """Initialize preview processor"""
        self.scraping_round = scraping_round
        self.stats = {
            'total': 0,
            'processed': 0,
            'with_email': 0,
            'mega_tier': 0,
            'micro_tier': 0,
            'errors': []
        }

    def format_number(self, num) -> str:
        """Format number with K, M notation"""
        if num is None or (isinstance(num, float) and num != num):  # Check for None or NaN
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

        # Common email patterns
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
        """Convert to int with bounds checking (PostgreSQL integer max is 2147483647)"""
        if value is None or (isinstance(value, float) and value != value):  # None or NaN
            return default
        try:
            val = int(value)
            # Cap at PostgreSQL integer maximum
            return min(val, max_val)
        except:
            return default

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
        data['r2_thumbnail_url'] = ''  # Will be filled during actual processing

        # Update stats
        if data['email']:
            self.stats['with_email'] += 1
        if data['follower_tier'] == '메가':
            self.stats['mega_tier'] += 1
        elif data['follower_tier'] == '마이크로':
            self.stats['micro_tier'] += 1

        return data

    def process_file(self, input_file: str, output_file: str):
        """Process the entire JSON file and create preview"""
        print("=" * 60)
        print("Round 6 Data Preview Generator")
        print("=" * 60)

        # Load input JSON
        print(f"\nLoading: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            records = json.load(f)

        self.stats['total'] = len(records)
        print(f"Found {len(records)} records to process")

        # Process all records
        processed_records = []
        for i, record in enumerate(records, 1):
            try:
                if i % 100 == 0:
                    print(f"  Processing: {i}/{len(records)}")

                processed_data = self.process_record(record)
                processed_records.append(processed_data)
                self.stats['processed'] += 1

            except Exception as e:
                print(f"  Error processing record {i}: {str(e)}")
                self.stats['errors'].append(f"Record {i}: {str(e)}")

        # Save processed data
        print(f"\nSaving preview to: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(processed_records, f, indent=2, ensure_ascii=False)

        # Print summary
        print("\n" + "=" * 60)
        print("PREVIEW GENERATION COMPLETE")
        print("=" * 60)
        print(f"Total records: {self.stats['total']}")
        print(f"Successfully processed: {self.stats['processed']}")
        print(f"Records with email: {self.stats['with_email']}")
        print(f"Mega tier (>100K): {self.stats['mega_tier']}")
        print(f"Micro tier (<100K): {self.stats['micro_tier']}")

        if self.stats['errors']:
            print(f"\n⚠️  Errors encountered: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:5]:
                print(f"  - {error}")
            if len(self.stats['errors']) > 5:
                print(f"  ... and {len(self.stats['errors']) - 5} more")

        # Calculate and display metrics summary
        if processed_records:
            avg_engagement = sum(r['engagement_rate'] for r in processed_records) / len(processed_records)
            avg_followers = sum(r['follower_count'] for r in processed_records) / len(processed_records)
            print(f"\n📊 Metrics Summary:")
            print(f"  Average engagement rate: {avg_engagement:.2f}%")
            print(f"  Average follower count: {self.format_number(avg_followers)}")

        # Save stats
        stats_file = f"preview_stats_round_6_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(stats_file, 'w') as f:
            json.dump(self.stats, f, indent=2)
        print(f"\n📊 Stats saved to: {stats_file}")

def main():
    """Main entry point"""
    preview = Round6DataPreview(scraping_round=6)

    input_file = 'merged_influencers_1000.json'
    output_file = 'round_6_db_preview.json'

    preview.process_file(input_file, output_file)

if __name__ == "__main__":
    main()