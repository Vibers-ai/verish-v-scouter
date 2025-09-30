#!/usr/bin/env python3
"""
Merge script to combine 6th_vibers_pick.json and influencers_us_merged.json
to create merged_influencers_1000.json for round 6 processing.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

def load_json_file(file_path: str) -> List[Dict[str, Any]]:
    """Load a JSON file and return its contents"""
    print(f"Loading {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"  Loaded {len(data) if isinstance(data, list) else 1} records")
    return data

def get_unique_key(record: Dict[str, Any]) -> str:
    """Generate a unique key for deduplication based on author info"""
    author_meta = record.get('authorMeta', {})
    # Use author ID as primary key, fallback to username
    author_id = str(author_meta.get('id', ''))
    username = str(author_meta.get('name', ''))

    if author_id:
        return f"id_{author_id}"
    elif username:
        return f"user_{username}"
    else:
        # Fallback to video URL if no author info
        return record.get('webVideoUrl', str(hash(str(record))))

def merge_and_deduplicate(vibers_data: List[Dict], us_data: List[Dict], target_count: int = 1000) -> List[Dict]:
    """
    Merge two datasets and deduplicate, prioritizing vibers pick data.
    Returns up to target_count unique influencers.
    """
    print("\n" + "=" * 60)
    print("MERGING INFLUENCER DATA")
    print("=" * 60)

    # Use a dictionary to store unique records
    unique_records = {}

    # First, add all vibers pick data (these have priority)
    vibers_count = 0
    for record in vibers_data:
        key = get_unique_key(record)
        if key not in unique_records:
            unique_records[key] = record
            vibers_count += 1

    print(f"Added {vibers_count} unique records from vibers pick")

    # Then add US influencers data until we reach target count
    us_count = 0
    for record in us_data:
        if len(unique_records) >= target_count:
            break

        key = get_unique_key(record)
        if key not in unique_records:
            unique_records[key] = record
            us_count += 1

    print(f"Added {us_count} unique records from US influencers")
    print(f"Total unique records: {len(unique_records)}")

    # Convert to list and limit to target count
    merged_data = list(unique_records.values())[:target_count]

    # Sort by follower count (descending) for consistency
    merged_data.sort(key=lambda x: x.get('authorMeta', {}).get('fans', 0), reverse=True)

    return merged_data

def analyze_data(data: List[Dict]) -> Dict[str, Any]:
    """Analyze the merged data and return statistics"""
    stats = {
        'total_records': len(data),
        'mega_tier': 0,  # >100K followers
        'micro_tier': 0,  # <100K followers
        'with_email': 0,
        'total_followers': 0,
        'total_views': 0,
        'avg_engagement_rate': 0
    }

    engagement_rates = []

    for record in data:
        author_meta = record.get('authorMeta', {})
        fans = author_meta.get('fans', 0)

        # Count tiers
        if fans >= 100000:
            stats['mega_tier'] += 1
        else:
            stats['micro_tier'] += 1

        # Check for email in signature
        signature = author_meta.get('signature', '')
        if '@' in signature and '.' in signature:
            stats['with_email'] += 1

        # Accumulate totals
        stats['total_followers'] += fans
        stats['total_views'] += record.get('playCount', 0)

        # Calculate engagement rate
        plays = record.get('playCount', 0)
        if plays > 0:
            engagement = (record.get('diggCount', 0) +
                         record.get('commentCount', 0) +
                         record.get('shareCount', 0)) / plays * 100
            engagement_rates.append(engagement)

    # Calculate averages
    if engagement_rates:
        stats['avg_engagement_rate'] = sum(engagement_rates) / len(engagement_rates)

    return stats

def main():
    """Main entry point"""
    # File paths
    vibers_file = Path('6th_vibers_pick.json')
    us_file = Path('influencers_us_merged.json')
    output_file = Path('merged_influencers_1000.json')

    # Check if input files exist
    if not vibers_file.exists():
        print(f"Error: {vibers_file} not found!")
        return

    if not us_file.exists():
        print(f"Error: {us_file} not found!")
        return

    # Load data
    vibers_data = load_json_file(str(vibers_file))
    us_data = load_json_file(str(us_file))

    # Merge and deduplicate
    merged_data = merge_and_deduplicate(vibers_data, us_data, target_count=1000)

    # Save merged data
    print(f"\nSaving merged data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Successfully saved {len(merged_data)} records to {output_file}")

    # Analyze and display statistics
    stats = analyze_data(merged_data)

    print("\n" + "=" * 60)
    print("MERGE STATISTICS")
    print("=" * 60)
    print(f"Total records: {stats['total_records']}")
    print(f"Mega tier (≥100K): {stats['mega_tier']} ({stats['mega_tier']/stats['total_records']*100:.1f}%)")
    print(f"Micro tier (<100K): {stats['micro_tier']} ({stats['micro_tier']/stats['total_records']*100:.1f}%)")
    print(f"With email: {stats['with_email']} ({stats['with_email']/stats['total_records']*100:.1f}%)")
    print(f"Average engagement rate: {stats['avg_engagement_rate']:.2f}%")
    print(f"Total followers: {stats['total_followers']:,}")
    print(f"Total views: {stats['total_views']:,}")

    # Save statistics
    stats_file = f"merge_stats_round_6_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(stats_file, 'w') as f:
        json.dump(stats, f, indent=2)
    print(f"\n📊 Statistics saved to: {stats_file}")

if __name__ == "__main__":
    main()