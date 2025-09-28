#!/usr/bin/env python3

import json
import os
from typing import Dict, List, Set

def load_json_file(filepath: str) -> List[Dict]:
    """Load and return data from a JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def merge_influencer_data(
    vibers_pick_path: str,
    influencers_merged_path: str,
    output_path: str,
    vibers_count: int = 60,
    total_target: int = 1000
) -> None:
    """
    Merge two influencer datasets, removing duplicates based on username.
    Also outputs the remaining (non-selected) records from each file.

    Args:
        vibers_pick_path: Path to 5th vibers pick JSON file
        influencers_merged_path: Path to influencers_us_merged JSON file
        output_path: Path for the output merged JSON file
        vibers_count: Number of records to take from vibers pick (default: 60)
        total_target: Total number of unique records desired (default: 1000)
    """

    # Load both datasets
    print(f"Loading {vibers_pick_path}...")
    vibers_data = load_json_file(vibers_pick_path)
    print(f"  Found {len(vibers_data)} records")

    print(f"\nLoading {influencers_merged_path}...")
    influencers_data = load_json_file(influencers_merged_path)
    print(f"  Found {len(influencers_data)} records")

    # Initialize result lists and username tracker
    merged_data = []
    seen_usernames: Set[str] = set()
    vibers_remaining = []
    influencers_remaining = []

    # Track indices of selected records
    vibers_selected_indices: Set[int] = set()
    influencers_selected_indices: Set[int] = set()

    # First, add up to 'vibers_count' records from vibers pick
    vibers_added = 0
    for idx, record in enumerate(vibers_data):
        username = record.get('authorMeta', {}).get('name', '')

        if vibers_added < vibers_count and username and username not in seen_usernames:
            merged_data.append(record)
            seen_usernames.add(username)
            vibers_selected_indices.add(idx)
            vibers_added += 1
        else:
            # Add to remaining if not selected
            if idx not in vibers_selected_indices:
                vibers_remaining.append(record)

    print(f"\nAdded {vibers_added} unique records from vibers pick")
    print(f"Remaining records in vibers pick: {len(vibers_remaining)}")

    # Add records from influencers_merged until we reach the target
    influencers_added = 0
    for idx, record in enumerate(influencers_data):
        username = record.get('authorMeta', {}).get('name', '')

        if len(merged_data) < total_target and username and username not in seen_usernames:
            merged_data.append(record)
            seen_usernames.add(username)
            influencers_selected_indices.add(idx)
            influencers_added += 1
        else:
            # Add to remaining if not selected
            if idx not in influencers_selected_indices:
                influencers_remaining.append(record)

    print(f"Added {influencers_added} unique records from influencers_us_merged")
    print(f"Remaining records in influencers_us_merged: {len(influencers_remaining)}")
    print(f"\nTotal unique records in merged dataset: {len(merged_data)}")

    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save the merged data
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, indent=2, ensure_ascii=False)

    print(f"\nMerged data saved to: {output_path}")

    # Save the remaining records from vibers pick
    vibers_remaining_path = output_path.replace('merged_influencers_1000.json', '5th_vibers_pick_remaining.json')
    with open(vibers_remaining_path, 'w', encoding='utf-8') as f:
        json.dump(vibers_remaining, f, indent=2, ensure_ascii=False)
    print(f"Remaining vibers pick saved to: {vibers_remaining_path}")

    # Save the remaining records from influencers_us_merged
    influencers_remaining_path = output_path.replace('merged_influencers_1000.json', 'influencers_us_merged_remaining.json')
    with open(influencers_remaining_path, 'w', encoding='utf-8') as f:
        json.dump(influencers_remaining, f, indent=2, ensure_ascii=False)
    print(f"Remaining influencers_us_merged saved to: {influencers_remaining_path}")

    # Print summary statistics
    print("\n=== Summary ===")
    print(f"Target total: {total_target}")
    print(f"Actual total: {len(merged_data)}")
    print(f"Records from vibers pick: {vibers_added} (out of {len(vibers_data)})")
    print(f"Records from influencers_us_merged: {influencers_added} (out of {len(influencers_data)})")
    print(f"Unique usernames in merged: {len(seen_usernames)}")
    print(f"\nRemaining records:")
    print(f"  - 5th_vibers_pick_remaining.json: {len(vibers_remaining)} records")
    print(f"  - influencers_us_merged_remaining.json: {len(influencers_remaining)} records")

if __name__ == "__main__":
    # Define file paths
    base_path = "/Users/jacob/Desktop/Vibers/Projects/2025/Verish"
    vibers_pick_path = os.path.join(base_path, "data/5th/5th_vibers_pick.json")
    influencers_merged_path = os.path.join(base_path, "data/5th/influencers_us_merged.json")
    output_path = os.path.join(base_path, "data/5th/merged_influencers_1000.json")

    # Run the merge
    merge_influencer_data(
        vibers_pick_path=vibers_pick_path,
        influencers_merged_path=influencers_merged_path,
        output_path=output_path,
        vibers_count=60,
        total_target=1000
    )