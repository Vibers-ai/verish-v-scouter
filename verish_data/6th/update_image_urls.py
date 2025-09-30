#!/usr/bin/env python3
"""
Update image URLs in merged_influencers_1000.json with fresh URLs from 6th_for_images.json
Remove records that don't have matching data in 6th_for_images.json
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

def create_lookup_map(images_data: List[Dict]) -> Dict[str, str]:
    """
    Create a lookup map from various identifiers to new image URLs
    Key can be: webVideoUrl, author_id, or account_id
    """
    lookup = {}

    for record in images_data:
        # Get the new cover URL
        cover_url = record.get('videoMeta', {}).get('coverUrl')
        if not cover_url:
            continue

        # Use webVideoUrl as primary key
        web_video_url = record.get('webVideoUrl')
        if web_video_url:
            lookup[web_video_url] = cover_url

        # Also map by author ID and username for fallback
        author_meta = record.get('authorMeta', {})
        author_id = str(author_meta.get('id', ''))
        username = str(author_meta.get('name', ''))

        if author_id:
            lookup[f"author_{author_id}"] = cover_url
        if username:
            lookup[f"user_{username}"] = cover_url

    return lookup

def update_and_filter_records(merged_data: List[Dict], lookup_map: Dict[str, str]) -> List[Dict]:
    """
    Update image URLs in merged data and filter out records without matches
    """
    updated_records = []
    stats = {
        'total': len(merged_data),
        'updated': 0,
        'removed': 0,
        'kept_without_update': 0
    }

    for record in merged_data:
        # Try to find new image URL using various keys
        new_image_url = None

        # First try: match by webVideoUrl
        web_video_url = record.get('webVideoUrl')
        if web_video_url and web_video_url in lookup_map:
            new_image_url = lookup_map[web_video_url]

        # Second try: match by author_id
        if not new_image_url:
            author_meta = record.get('authorMeta', {})
            author_id = str(author_meta.get('id', ''))
            if author_id:
                author_key = f"author_{author_id}"
                if author_key in lookup_map:
                    new_image_url = lookup_map[author_key]

        # Third try: match by username
        if not new_image_url:
            username = str(author_meta.get('name', ''))
            if username:
                user_key = f"user_{username}"
                if user_key in lookup_map:
                    new_image_url = lookup_map[user_key]

        # If we found a new image URL, update the record
        if new_image_url:
            # Update the cover URL in videoMeta
            if 'videoMeta' not in record:
                record['videoMeta'] = {}
            record['videoMeta']['coverUrl'] = new_image_url

            updated_records.append(record)
            stats['updated'] += 1

            # Show progress
            if stats['updated'] % 100 == 0:
                print(f"  Updated {stats['updated']} records...")
        else:
            # No matching image found - remove this record
            stats['removed'] += 1
            author_name = record.get('authorMeta', {}).get('nickName', 'Unknown')
            if stats['removed'] <= 5:  # Only show first 5 removed
                print(f"  ✗ Removing record for {author_name} (no matching image)")

    # Print statistics
    print("\n" + "=" * 60)
    print("UPDATE STATISTICS")
    print("=" * 60)
    print(f"Total original records: {stats['total']}")
    print(f"Records updated with new images: {stats['updated']}")
    print(f"Records removed (no matching image): {stats['removed']}")
    print(f"Final record count: {len(updated_records)}")
    print(f"Retention rate: {len(updated_records)/stats['total']*100:.1f}%")

    return updated_records

def main():
    """Main entry point"""
    # File paths
    merged_file = Path('merged_influencers_1000.json')
    images_file = Path('6th_for_images.json')
    output_file = Path('merged_influencers_1000_updated.json')
    backup_file = Path('merged_influencers_1000_backup.json')

    # Check if input files exist
    if not merged_file.exists():
        print(f"Error: {merged_file} not found!")
        return

    if not images_file.exists():
        print(f"Error: {images_file} not found!")
        return

    # Load data
    print("=" * 60)
    print("IMAGE URL UPDATER")
    print("=" * 60)

    merged_data = load_json_file(str(merged_file))
    images_data = load_json_file(str(images_file))

    # Create backup of original file
    print(f"\nCreating backup at {backup_file}...")
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, indent=2, ensure_ascii=False)
    print("✓ Backup created")

    # Create lookup map from images data
    print("\nCreating image URL lookup map...")
    lookup_map = create_lookup_map(images_data)
    print(f"  Created lookup map with {len(lookup_map)} entries")

    # Update and filter records
    print("\nUpdating image URLs and filtering records...")
    updated_data = update_and_filter_records(merged_data, lookup_map)

    # Save updated data
    print(f"\nSaving updated data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Successfully saved {len(updated_data)} records to {output_file}")

    # Also overwrite the original file with updated data
    print(f"\nOverwriting original {merged_file} with updated data...")
    with open(merged_file, 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Original file updated with {len(updated_data)} records")
    print(f"\n📁 Backup of original data saved to: {backup_file}")

    # Save update statistics
    stats_file = f"image_update_stats_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    stats = {
        'original_count': len(merged_data),
        'images_available': len(images_data),
        'lookup_entries': len(lookup_map),
        'updated_count': len(updated_data),
        'removed_count': len(merged_data) - len(updated_data),
        'retention_rate': f"{len(updated_data)/len(merged_data)*100:.1f}%"
    }
    with open(stats_file, 'w') as f:
        json.dump(stats, f, indent=2)
    print(f"📊 Statistics saved to: {stats_file}")

if __name__ == "__main__":
    main()