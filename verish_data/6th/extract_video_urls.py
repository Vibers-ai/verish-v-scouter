#!/usr/bin/env python3
"""
Extract video URLs from merged_influencers_1000.json
and save them to a text file (one URL per line).
"""

import json
from pathlib import Path

def extract_video_urls():
    """Extract video URLs from the merged influencers JSON file"""

    # Input and output files
    input_file = Path('merged_influencers_1000.json')
    output_file = Path('video_urls.txt')

    # Check if input file exists
    if not input_file.exists():
        print(f"Error: {input_file} not found!")
        return

    # Load JSON data
    print(f"Loading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Found {len(data)} records")

    # Extract video URLs
    video_urls = []
    for record in data:
        # Try to get video URL from webVideoUrl field
        video_url = record.get('webVideoUrl', '')
        if video_url:
            video_urls.append(video_url)

    # Write URLs to file
    print(f"Writing {len(video_urls)} URLs to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        for url in video_urls:
            f.write(url + '\n')

    print(f"✅ Successfully extracted {len(video_urls)} video URLs to {output_file}")

    # Print some stats
    print(f"\nStats:")
    print(f"  Total records: {len(data)}")
    print(f"  Records with video URLs: {len(video_urls)}")
    print(f"  Records without video URLs: {len(data) - len(video_urls)}")

if __name__ == "__main__":
    extract_video_urls()