#!/usr/bin/env python3
"""
Process NEW records from Excel that aren't already in database
"""

import sys
import pandas as pd
from process_influencers_round_3 import InfluencerDataProcessor

def find_new_records(processor, df):
    """Find records that don't exist in database"""
    new_records = []

    print("🔍 Checking for new records...")

    for idx, row in df.iterrows():
        author_id = str(row.get('authorMeta/id', ''))
        account_id = str(row.get('authorMeta/nickName', ''))

        # Check if exists
        existing = processor.supabase.table('influencers').select('id').eq('author_id', author_id).eq('account_id', account_id).execute()

        if not existing.data:
            new_records.append(idx)
            if len(new_records) <= 5:  # Show first 5 new records
                print(f"  New record found at index {idx}: {account_id}")

    return new_records

def main():
    # Create processor instance
    processor = InfluencerDataProcessor()

    # Read Excel file
    print("\n📊 Reading Excel file...")
    df = pd.read_excel('verish_round_4.xlsx')
    total_records = len(df)

    # Start from a specific index (skip known duplicates)
    start_idx = 100  # Start from record 101 to skip the first batch of duplicates

    if len(sys.argv) > 1:
        start_idx = int(sys.argv[1])

    print(f"\n🎯 Processing NEW records starting from index {start_idx}")

    # Process records starting from start_idx
    batch_size = 20
    max_records = min(start_idx + 100, total_records)  # Process 100 records at a time

    df_subset = df.iloc[start_idx:max_records]

    print(f"Processing records {start_idx+1} to {max_records} of {total_records} total")

    processor.stats['total'] = len(df_subset)

    # Process in batches
    success_count = 0
    error_count = 0

    for i in range(0, len(df_subset), batch_size):
        batch_df = df_subset.iloc[i:min(i+batch_size, len(df_subset))]

        print(f"\n📦 Processing batch {i+1}-{min(i+batch_size, len(df_subset))} of {len(df_subset)}...")

        for idx, row in batch_df.iterrows():
            try:
                print(f"\n[{idx+1}/{max_records}] Processing {row.get('authorMeta/nickName', 'Unknown')}...")

                # Process row data
                data = processor.process_row(row)

                # Download and upload thumbnail
                thumbnail_url = row.get('videoMeta/coverUrl')
                if thumbnail_url and not pd.isna(thumbnail_url):
                    image_path = processor.download_image(thumbnail_url, data['account_id'])
                    if image_path:
                        r2_url = processor.upload_to_r2(image_path)
                        data['r2_thumbnail_url'] = r2_url or ''
                    else:
                        data['r2_thumbnail_url'] = ''
                else:
                    data['r2_thumbnail_url'] = ''

                # Try to insert/update in database
                try:
                    # Check if exists
                    existing = processor.supabase.table('influencers').select('id').eq('account_id', data['account_id']).execute()

                    if existing.data and len(existing.data) > 0:
                        # Update
                        update_data = {k: v for k, v in data.items() if k != 'id'}
                        result = processor.supabase.table('influencers').update(update_data).eq('id', existing.data[0]['id']).execute()
                        print(f"  ✓ Updated existing record (ID: {existing.data[0]['id']})")
                        success_count += 1
                    else:
                        # Insert new
                        insert_data = {k: v for k, v in data.items() if k != 'id'}
                        result = processor.supabase.table('influencers').insert(insert_data).execute()
                        if result.data:
                            print(f"  ✓ Inserted NEW record (ID: {result.data[0]['id']})")
                            success_count += 1

                except Exception as e:
                    if 'duplicate key' in str(e):
                        print(f"  ⚠ Skipping - already exists (different key)")
                        error_count += 1
                    else:
                        print(f"  ✗ Error: {str(e)[:100]}")
                        error_count += 1

            except Exception as e:
                print(f"  ✗ Failed to process: {str(e)[:100]}")
                error_count += 1

    # Summary
    print("\n" + "="*60)
    print("PROCESSING COMPLETE")
    print("="*60)
    print(f"✅ Successfully processed: {success_count} records")
    print(f"⚠️  Skipped/Errors: {error_count} records")
    print(f"📊 Total attempted: {len(df_subset)} records")

    if success_count > 0:
        print(f"\n🎉 Successfully added/updated {success_count} influencer records!")

if __name__ == "__main__":
    main()