#!/usr/bin/env python3
"""
Simple duplicate remover using direct HTTP requests to Supabase API.
Removes influencers with swapped author_name and account_id fields.
"""

import os
import sys
import json
import argparse
import requests
from datetime import datetime
from typing import Dict, List, Tuple
from collections import defaultdict

class SimpleSupabaseClient:
    def __init__(self, url: str, key: str):
        """Initialize simple Supabase client."""
        self.base_url = url
        self.api_key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

    def select_all(self, table: str, page_size: int = 1000) -> List[Dict]:
        """Fetch all records from a table."""
        all_records = []
        offset = 0

        while True:
            url = f"{self.base_url}/rest/v1/{table}"
            params = {
                'select': '*',
                'offset': offset,
                'limit': page_size
            }

            response = requests.get(url, headers=self.headers, params=params)
            if response.status_code != 200:
                print(f"Error fetching data: {response.status_code} - {response.text}")
                break

            records = response.json()
            if not records:
                break

            all_records.extend(records)
            print(f"Fetched {len(records)} records (total: {len(all_records)})")

            if len(records) < page_size:
                break
            offset += page_size

        return all_records

    def delete_by_ids(self, table: str, ids: List[int]) -> bool:
        """Delete records by IDs."""
        if not ids:
            return True

        url = f"{self.base_url}/rest/v1/{table}"

        # Delete in batches
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            batch = ids[i:i + batch_size]

            # Build query string for deletion
            id_list = ','.join(str(id) for id in batch)
            params = {'id': f'in.({id_list})'}

            response = requests.delete(url, headers=self.headers, params=params)
            if response.status_code not in [200, 204]:
                print(f"Error deleting batch: {response.status_code} - {response.text}")
                return False
            print(f"Deleted batch of {len(batch)} records")

        return True


class DuplicateRemover:
    def __init__(self, config_file: str = 'supabase_config.json', dry_run: bool = True):
        """Initialize the duplicate remover."""
        self.dry_run = dry_run
        self.stats = {
            'total_records': 0,
            'duplicate_groups': 0,
            'duplicates_found': 0,
            'duplicates_removed': 0,
            'errors': []
        }

        # Setup logging
        self.setup_logging()

        # Load config
        if not os.path.exists(config_file):
            print(f"Error: Config file '{config_file}' not found!")
            sys.exit(1)

        with open(config_file, 'r') as f:
            config = json.load(f)

        # Initialize simple Supabase client
        self.client = SimpleSupabaseClient(
            config['supabase_url'],
            config['supabase_key']
        )

    def setup_logging(self):
        """Setup logging file."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.log_file = f'duplicate_removal_{timestamp}.log'
        self.logs = []
        self.log(f"Starting duplicate removal at {timestamp}")

    def log(self, message: str):
        """Log a message."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"{timestamp} - {message}"
        print(log_entry)
        self.logs.append(log_entry)

    def save_logs(self):
        """Save logs to file."""
        with open(self.log_file, 'w') as f:
            f.write('\n'.join(self.logs))
        print(f"Logs saved to: {self.log_file}")

    def create_normalized_key(self, author_name: str, account_id: str) -> str:
        """Create a normalized key for duplicate detection."""
        author_name = str(author_name).lower().strip() if author_name else ''
        account_id = str(account_id).lower().strip() if account_id else ''

        # Create sorted tuple to catch swapped fields
        values = sorted([author_name, account_id])
        return '|'.join(values)

    def score_record(self, record: Dict) -> int:
        """Score a record based on data quality."""
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

        # Prefer older records
        created_at = record.get('created_at')
        if created_at:
            try:
                score += 1  # Simplified scoring for date
            except:
                pass

        # Prefer records with higher engagement
        try:
            follower_count = int(record.get('follower_count', 0) or 0)
            views_count = int(record.get('views_count', 0) or 0)
            if follower_count > 100000:
                score += 2
            if views_count > 1000000:
                score += 2
        except:
            pass

        return score

    def find_duplicates(self, records: List[Dict]) -> Dict[str, List[Dict]]:
        """Find duplicate records with swapped fields."""
        self.log("Identifying duplicates...")

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

        self.log(f"Found {self.stats['duplicate_groups']} duplicate groups")
        self.log(f"Total duplicates to remove: {self.stats['duplicates_found']}")

        return duplicate_groups

    def select_record_to_keep(self, records: List[Dict]) -> Tuple[Dict, List[Dict]]:
        """Select which record to keep from duplicates."""
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
        self.log(f"{'DRY RUN: ' if self.dry_run else ''}Starting duplicate removal...")

        records_to_delete = []
        backup_data = []

        for key, records in duplicate_groups.items():
            keep, delete = self.select_record_to_keep(records)

            # Log decision
            self.log(f"\nDuplicate group: {key}")
            self.log(f"  Keeping: ID={keep['id']}, author_name={keep.get('author_name')}, account_id={keep.get('account_id')}")

            for record in delete:
                self.log(f"  Deleting: ID={record['id']}, author_name={record.get('author_name')}, account_id={record.get('account_id')}")
                records_to_delete.append(record['id'])

                # Save backup info
                backup_data.append({
                    'deleted_id': record['id'],
                    'kept_id': keep['id'],
                    'deleted_author_name': record.get('author_name'),
                    'deleted_account_id': record.get('account_id'),
                    'kept_author_name': keep.get('author_name'),
                    'kept_account_id': keep.get('account_id')
                })

        # Save backup file
        self.save_backup(backup_data)

        # Delete records if not in dry run mode
        if not self.dry_run and records_to_delete:
            self.log(f"\nDeleting {len(records_to_delete)} duplicate records...")

            if self.client.delete_by_ids('influencers', records_to_delete):
                self.stats['duplicates_removed'] = len(records_to_delete)
                self.log(f"Successfully deleted {len(records_to_delete)} duplicates")
            else:
                self.log("Error occurred during deletion")
                self.stats['errors'].append("Deletion failed")

        elif self.dry_run:
            self.log(f"\nDRY RUN: Would delete {len(records_to_delete)} records")
            self.stats['duplicates_removed'] = len(records_to_delete)

    def save_backup(self, backup_data: List[Dict]):
        """Save backup information."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f'duplicate_backup_{timestamp}.json'

        with open(backup_file, 'w') as f:
            json.dump({
                'timestamp': timestamp,
                'stats': self.stats,
                'deletions': backup_data
            }, f, indent=2)

        self.log(f"Backup data saved to: {backup_file}")

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
            for error in self.stats['errors'][:5]:
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
            self.log("Fetching all influencers from database...")
            records = self.client.select_all('influencers')

            if not records:
                self.log("No records fetched. Exiting.")
                return

            self.stats['total_records'] = len(records)
            self.log(f"Total records fetched: {len(records)}")

            # Find duplicates
            duplicate_groups = self.find_duplicates(records)

            if not duplicate_groups:
                self.log("No duplicates found!")
                return

            # Remove duplicates
            self.remove_duplicates(duplicate_groups)

            # Save logs
            self.save_logs()

            # Print summary
            self.print_summary()

        except Exception as e:
            self.log(f"Unexpected error: {e}")
            self.stats['errors'].append(f"Fatal error: {e}")
            self.save_logs()
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

    # Create and run the duplicate remover
    remover = DuplicateRemover(
        config_file=args.config,
        dry_run=args.dry_run
    )

    print(f"Starting duplicate removal {'(DRY RUN)' if args.dry_run else ''}...")
    remover.run()


if __name__ == '__main__':
    main()