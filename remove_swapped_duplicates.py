#!/usr/bin/env python3
"""
Remove duplicate influencers with swapped author_name and account_id fields.

This script identifies and removes duplicate records where the author_name
and account_id fields are swapped between records.

Example of duplicates to remove:
- Record A: author_name="Jacob Chong", account_id="jacho"
- Record B: author_name="jacho", account_id="Jacob Chong"

Usage:
    python remove_swapped_duplicates.py --dry-run  # Preview changes
    python remove_swapped_duplicates.py            # Execute removal
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import Dict, List, Tuple, Set
from collections import defaultdict
from supabase import create_client
import logging

class DuplicateRemover:
    def __init__(self, config_file: str = 'supabase_config.json', dry_run: bool = True):
        """Initialize the duplicate remover."""
        # Setup logging
        self.setup_logging()

        # Load config
        with open(config_file, 'r') as f:
            config = json.load(f)

        # Initialize Supabase client
        self.supabase = create_client(
            config['supabase_url'],
            config['supabase_key']
        )

        self.dry_run = dry_run
        self.stats = {
            'total_records': 0,
            'duplicate_groups': 0,
            'duplicates_found': 0,
            'duplicates_removed': 0,
            'errors': []
        }

    def setup_logging(self):
        """Setup logging configuration."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_filename = f'duplicate_removal_{timestamp}.log'

        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_filename),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def create_normalized_key(self, author_name: str, account_id: str) -> str:
        """Create a normalized key for duplicate detection."""
        # Handle None values
        author_name = str(author_name).lower().strip() if author_name else ''
        account_id = str(account_id).lower().strip() if account_id else ''

        # Create sorted tuple to catch swapped fields
        values = sorted([author_name, account_id])
        return '|'.join(values)

    def score_record(self, record: Dict) -> int:
        """
        Score a record based on data quality.
        Higher score = better quality = should be kept.
        """
        score = 0

        # Prefer records with more populated fields
        important_fields = ['email', 'video_caption', 'follower_count',
                          'views_count', 'likes_count', 'thumbnail_url']
        for field in important_fields:
            if record.get(field) and str(record[field]).strip():
                score += 1

        # Prefer records with status set
        if record.get('status') and record['status'] != 'none':
            score += 2

        # Prefer saved records
        if record.get('saved'):
            score += 3

        # Prefer records with tags or contact status
        # (We'll need to fetch these separately)

        # Prefer older records (they might have more history)
        created_at = record.get('created_at')
        if created_at:
            try:
                # Earlier dates get higher score
                date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                days_old = (datetime.now(date.tzinfo) - date).days
                score += min(days_old // 30, 5)  # Max 5 points for age
            except:
                pass

        # Prefer records with higher engagement
        engagement_fields = ['follower_count', 'views_count', 'likes_count']
        for field in engagement_fields:
            try:
                value = int(record.get(field, 0) or 0)
                if value > 0:
                    score += min(value // 100000, 3)  # Max 3 points per metric
            except:
                pass

        return score

    def fetch_all_influencers(self) -> List[Dict]:
        """Fetch all influencers from the database."""
        self.logger.info("Fetching all influencers from database...")

        all_records = []
        page = 0
        page_size = 1000

        while True:
            try:
                response = self.supabase.table('influencers') \
                    .select('*') \
                    .range(page * page_size, (page + 1) * page_size - 1) \
                    .execute()

                records = response.data
                if not records:
                    break

                all_records.extend(records)
                self.logger.info(f"Fetched page {page + 1}: {len(records)} records")

                if len(records) < page_size:
                    break

                page += 1

            except Exception as e:
                self.logger.error(f"Error fetching page {page}: {e}")
                self.stats['errors'].append(f"Fetch error page {page}: {e}")
                break

        self.stats['total_records'] = len(all_records)
        self.logger.info(f"Total records fetched: {len(all_records)}")
        return all_records

    def find_duplicates(self, records: List[Dict]) -> Dict[str, List[Dict]]:
        """Find duplicate records with swapped fields."""
        self.logger.info("Identifying duplicates...")

        duplicates = defaultdict(list)

        for record in records:
            author_name = record.get('author_name')
            account_id = record.get('account_id')

            # Skip records without both fields
            if not author_name and not account_id:
                continue

            key = self.create_normalized_key(author_name, account_id)
            duplicates[key].append(record)

        # Filter to only groups with duplicates
        duplicate_groups = {k: v for k, v in duplicates.items() if len(v) > 1}

        self.stats['duplicate_groups'] = len(duplicate_groups)
        self.stats['duplicates_found'] = sum(len(v) - 1 for v in duplicate_groups.values())

        self.logger.info(f"Found {self.stats['duplicate_groups']} duplicate groups")
        self.logger.info(f"Total duplicates to remove: {self.stats['duplicates_found']}")

        return duplicate_groups

    def select_record_to_keep(self, records: List[Dict]) -> Tuple[Dict, List[Dict]]:
        """
        Select which record to keep from a group of duplicates.
        Returns (record_to_keep, records_to_delete)
        """
        # Score each record
        scored_records = [(record, self.score_record(record)) for record in records]

        # Sort by score (highest first)
        scored_records.sort(key=lambda x: x[1], reverse=True)

        # The first record has the highest score
        keep = scored_records[0][0]
        delete = [r[0] for r in scored_records[1:]]

        return keep, delete

    def remove_duplicates(self, duplicate_groups: Dict[str, List[Dict]]):
        """Remove duplicate records from the database."""
        self.logger.info(f"{'DRY RUN: ' if self.dry_run else ''}Starting duplicate removal...")

        records_to_delete = []

        for key, records in duplicate_groups.items():
            keep, delete = self.select_record_to_keep(records)

            # Log decision
            self.logger.info(f"\nDuplicate group: {key}")
            self.logger.info(f"  Keeping: ID={keep['id']}, "
                           f"author_name={keep.get('author_name')}, "
                           f"account_id={keep.get('account_id')}")

            for record in delete:
                self.logger.info(f"  Deleting: ID={record['id']}, "
                               f"author_name={record.get('author_name')}, "
                               f"account_id={record.get('account_id')}")
                records_to_delete.append(record['id'])

        # Delete records if not in dry run mode
        if not self.dry_run and records_to_delete:
            self.logger.info(f"\nDeleting {len(records_to_delete)} duplicate records...")

            # Delete in batches to avoid timeout
            batch_size = 100
            for i in range(0, len(records_to_delete), batch_size):
                batch = records_to_delete[i:i + batch_size]
                try:
                    response = self.supabase.table('influencers') \
                        .delete() \
                        .in_('id', batch) \
                        .execute()

                    self.stats['duplicates_removed'] += len(batch)
                    self.logger.info(f"Deleted batch {i // batch_size + 1}: {len(batch)} records")

                except Exception as e:
                    self.logger.error(f"Error deleting batch: {e}")
                    self.stats['errors'].append(f"Delete error: {e}")

        elif self.dry_run:
            self.logger.info(f"\nDRY RUN: Would delete {len(records_to_delete)} records")
            self.stats['duplicates_removed'] = len(records_to_delete)

    def save_backup_list(self, duplicate_groups: Dict[str, List[Dict]]):
        """Save a list of duplicate IDs for backup/rollback purposes."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f'duplicate_backup_{timestamp}.json'

        backup_data = {
            'timestamp': timestamp,
            'stats': self.stats,
            'duplicate_groups': []
        }

        for key, records in duplicate_groups.items():
            keep, delete = self.select_record_to_keep(records)
            group = {
                'key': key,
                'kept_id': keep['id'],
                'deleted_ids': [r['id'] for r in delete],
                'kept_record': {
                    'id': keep['id'],
                    'author_name': keep.get('author_name'),
                    'account_id': keep.get('account_id'),
                    'email': keep.get('email')
                },
                'deleted_records': [
                    {
                        'id': r['id'],
                        'author_name': r.get('author_name'),
                        'account_id': r.get('account_id'),
                        'email': r.get('email')
                    }
                    for r in delete
                ]
            }
            backup_data['duplicate_groups'].append(group)

        with open(backup_file, 'w') as f:
            json.dump(backup_data, f, indent=2)

        self.logger.info(f"Backup data saved to: {backup_file}")

    def print_summary(self):
        """Print summary of operations."""
        print("\n" + "="*50)
        print("DUPLICATE REMOVAL SUMMARY")
        print("="*50)
        print(f"Total records processed: {self.stats['total_records']}")
        print(f"Duplicate groups found: {self.stats['duplicate_groups']}")
        print(f"Total duplicates identified: {self.stats['duplicates_found']}")
        print(f"Duplicates removed: {self.stats['duplicates_removed']}")

        if self.stats['errors']:
            print(f"\nErrors encountered: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:5]:  # Show first 5 errors
                print(f"  - {error}")

        if self.dry_run:
            print("\n⚠️  DRY RUN MODE - No changes were made to the database")
            print("Run without --dry-run to execute the removal")
        else:
            print("\n✅ Duplicate removal completed successfully")

    def run(self):
        """Main execution method."""
        try:
            # Fetch all records
            records = self.fetch_all_influencers()

            if not records:
                self.logger.error("No records fetched. Exiting.")
                return

            # Find duplicates
            duplicate_groups = self.find_duplicates(records)

            if not duplicate_groups:
                self.logger.info("No duplicates found!")
                return

            # Save backup information
            self.save_backup_list(duplicate_groups)

            # Remove duplicates
            self.remove_duplicates(duplicate_groups)

            # Print summary
            self.print_summary()

        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            self.stats['errors'].append(f"Fatal error: {e}")
            self.print_summary()
            raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Remove duplicate influencers with swapped fields'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without modifying the database'
    )
    parser.add_argument(
        '--config',
        default='supabase_config.json',
        help='Path to Supabase configuration file'
    )

    args = parser.parse_args()

    # Check if config file exists
    if not os.path.exists(args.config):
        print(f"Error: Config file '{args.config}' not found!")
        print("Please ensure supabase_config.json exists with your credentials.")
        sys.exit(1)

    # Create and run the duplicate remover
    remover = DuplicateRemover(
        config_file=args.config,
        dry_run=args.dry_run
    )

    print(f"Starting duplicate removal {'(DRY RUN)' if args.dry_run else ''}...")
    remover.run()


if __name__ == '__main__':
    main()