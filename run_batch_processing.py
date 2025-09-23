#!/usr/bin/env python3
"""
Batch processor for influencer data - processes in smaller chunks with better error handling
"""

import sys
import pandas as pd
from process_influencers_round_3 import InfluencerDataProcessor

def main():
    # Create processor instance
    processor = InfluencerDataProcessor()

    # Read Excel file
    print("\n📊 Reading Excel file...")
    df = pd.read_excel('verish_round_3.xlsx')
    total_records = len(df)

    # Process in smaller batches
    batch_size = 20  # Process 20 records at a time
    start_idx = 0

    # Check if we should start from a specific index (for resuming)
    if len(sys.argv) > 1:
        start_idx = int(sys.argv[1])
        print(f"Starting from index: {start_idx}")

    # Process just the first 100 records for now
    max_records = min(100, total_records)

    print(f"\n🎯 Processing records {start_idx+1} to {max_records} out of {total_records} total")

    # Process the subset
    df_subset = df.iloc[start_idx:max_records]
    processor.stats['total'] = len(df_subset)

    # Process in batches
    for i in range(0, len(df_subset), batch_size):
        processor.process_batch(df_subset, i, batch_size)
        print(f"\n⏸  Batch complete. Processed {min(i+batch_size, len(df_subset))} of {len(df_subset)} records")

    # Print final summary
    print("\n" + "="*60)
    print("BATCH PROCESSING COMPLETE")
    print("="*60)
    print(f"Total in batch: {len(df_subset)}")
    print(f"Successfully processed: {processor.stats['processed']}")
    print(f"Database updates: {processor.stats['db_inserted']}")
    print(f"Errors: {len(processor.stats['errors'])}")

    if processor.stats['errors']:
        print("\n⚠️  Some errors occurred (this is normal for duplicate records)")

if __name__ == "__main__":
    main()