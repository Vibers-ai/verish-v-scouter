#!/usr/bin/env python3
"""
Merge US confirmed and uncertain influencers into a single file.
This creates a more inclusive dataset of potential US influencers.
"""

import json
from datetime import datetime


def merge_influencer_files():
    """Merge US confirmed and uncertain influencer files."""

    print("Merging US Influencers")
    print("=" * 50)

    # Load confirmed US influencers
    us_confirmed_file = 'influencers_us_confirmed.json'
    print(f"\nLoading {us_confirmed_file}...")

    try:
        with open(us_confirmed_file, 'r', encoding='utf-8') as f:
            us_confirmed = json.load(f)
        print(f"Loaded {len(us_confirmed)} confirmed US influencers")
    except FileNotFoundError:
        print(f"Error: {us_confirmed_file} not found!")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {us_confirmed_file}: {e}")
        return

    # Load uncertain influencers
    uncertain_file = 'influencers_uncertain.json'
    print(f"\nLoading {uncertain_file}...")

    try:
        with open(uncertain_file, 'r', encoding='utf-8') as f:
            uncertain = json.load(f)
        print(f"Loaded {len(uncertain)} uncertain influencers")
    except FileNotFoundError:
        print(f"Error: {uncertain_file} not found!")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {uncertain_file}: {e}")
        return

    # Merge the two lists
    print("\nMerging files...")
    merged_influencers = us_confirmed + uncertain

    # Remove duplicates based on influencer ID
    unique_influencers = {}
    for influencer in merged_influencers:
        inf_id = influencer.get('id')
        if inf_id and inf_id not in unique_influencers:
            unique_influencers[inf_id] = influencer

    # Convert back to list
    final_merged = list(unique_influencers.values())

    # Save merged file
    output_file = 'influencers_us_merged.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_merged, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(final_merged)} influencers to {output_file}")

    # Create summary report
    report_file = f'merge_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'

    with open(report_file, 'w') as f:
        f.write("US Influencer Merge Report\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        f.write("Input Files:\n")
        f.write("-" * 30 + "\n")
        f.write(f"1. {us_confirmed_file}: {len(us_confirmed)} influencers\n")
        f.write(f"2. {uncertain_file}: {len(uncertain)} influencers\n\n")

        f.write("Output:\n")
        f.write("-" * 30 + "\n")
        f.write(f"Total before deduplication: {len(merged_influencers)} influencers\n")
        f.write(f"Duplicates removed: {len(merged_influencers) - len(final_merged)}\n")
        f.write(f"Final merged file: {len(final_merged)} influencers\n\n")

        f.write("Breakdown by category:\n")
        f.write("-" * 30 + "\n")

        # Count by filter reason
        reasons = {}
        for inf in final_merged:
            reason = inf.get('location_filter_reason', 'unknown')
            reasons[reason] = reasons.get(reason, 0) + 1

        for reason, count in sorted(reasons.items(), key=lambda x: -x[1]):
            percentage = (count / len(final_merged)) * 100
            f.write(f"  {reason}: {count} ({percentage:.1f}%)\n")

    print(f"Report saved to {report_file}")

    print("\n" + "=" * 50)
    print("Merge complete!")
    print(f"\nThe merged file '{output_file}' contains:")
    print(f"- {len([i for i in final_merged if i.get('location_filter_reason', '').startswith('US')])} confirmed US influencers")
    print(f"- {len([i for i in final_merged if i.get('location_filter_reason') == 'uncertain'])} uncertain influencers")
    print(f"- {len([i for i in final_merged if i.get('location_filter_reason') == 'no signature'])} influencers with no signature")
    print(f"\nTotal: {len(final_merged)} potential US influencers")
    print("\nThis merged file excludes the {} non-US influencers from 'influencers_non_us.json'")


if __name__ == "__main__":
    merge_influencer_files()