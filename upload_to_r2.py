#!/usr/bin/env python3
"""
Upload thumbnails to Cloudflare R2 storage
"""

import os
import sys
import json
import boto3
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from botocore.config import Config

class R2Uploader:
    def __init__(self, account_id, access_key_id, secret_access_key, bucket_name):
        """Initialize R2 client"""
        self.bucket_name = bucket_name

        # Configure S3 client for R2
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name='auto',  # R2 uses 'auto' as region
            config=Config(
                signature_version='s3v4',
                retries={'max_attempts': 3}
            )
        )

    def upload_file(self, file_path, key_prefix=''):
        """Upload a single file to R2"""
        try:
            file_path = Path(file_path)
            key = f"{key_prefix}{file_path.name}" if key_prefix else file_path.name

            # Upload with public-read ACL if needed
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                key,
                ExtraArgs={
                    'ContentType': 'image/jpeg',
                    'CacheControl': 'public, max-age=31536000'  # 1 year cache
                }
            )

            return True, key
        except Exception as e:
            return False, str(e)

    def upload_directory(self, directory, key_prefix='', max_workers=5):
        """Upload all files from a directory"""
        directory = Path(directory)
        files = list(directory.glob('*.jpg'))

        results = {'success': [], 'failed': []}
        total = len(files)

        print(f"\nUploading {total} files from {directory}...")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all upload tasks
            futures = {
                executor.submit(self.upload_file, file, key_prefix): file
                for file in files
            }

            # Process completed uploads
            completed = 0
            for future in as_completed(futures):
                completed += 1
                file = futures[future]
                success, result = future.result()

                if success:
                    results['success'].append(file.name)
                    print(f"✓ [{completed}/{total}] Uploaded: {file.name}")
                else:
                    results['failed'].append((file.name, result))
                    print(f"✗ [{completed}/{total}] Failed: {file.name} - {result}")

        return results

def load_config():
    """Load R2 configuration from file or environment"""
    config_file = Path('r2_config.json')

    if config_file.exists():
        with open(config_file, 'r') as f:
            return json.load(f)

    # Try environment variables
    import os
    config = {
        'account_id': os.environ.get('R2_ACCOUNT_ID'),
        'access_key_id': os.environ.get('R2_ACCESS_KEY_ID'),
        'secret_access_key': os.environ.get('R2_SECRET_ACCESS_KEY'),
        'bucket_name': os.environ.get('R2_BUCKET_NAME'),
    }

    if all(config.values()):
        return config

    return None

def save_config_template():
    """Save a configuration template"""
    template = {
        'account_id': 'your_cloudflare_account_id',
        'access_key_id': 'your_r2_access_key_id',
        'secret_access_key': 'your_r2_secret_access_key',
        'bucket_name': 'your_bucket_name',
        'thumbnails_base_url': 'https://your-custom-domain.com/thumbnails/'
    }

    with open('r2_config_template.json', 'w') as f:
        json.dump(template, f, indent=2)

    print("Created r2_config_template.json")
    print("Please copy it to r2_config.json and fill in your credentials")

def update_data_with_urls(base_url, dry_run=False):
    """Update data_combined.json with R2 URLs"""
    with open('data_combined.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for item in data['data']:
        if 'account_id' in item and item['account_id']:
            # Clean account_id for filename
            account_id = str(item['account_id'])
            account_id = account_id.replace('/', '_').replace('\\', '_').replace(':', '_')

            # Determine which folder based on influencer_type
            folder = 'thumbnails_sales' if item.get('influencer_type') == 'sales' else 'thumbnails_regular'

            # Build the R2 URL
            # Check for duplicates (files with _ID suffix)
            possible_files = [
                f"{account_id}.jpg",
                f"{account_id}_{item['id']}.jpg"
            ]

            # Check which file exists
            for filename in possible_files:
                file_path = Path(folder) / filename
                if file_path.exists():
                    item['r2_thumbnail_url'] = f"{base_url}{folder}/{filename}"
                    updated += 1
                    break

    if not dry_run:
        # Save updated data
        with open('data_combined_with_r2.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Updated {updated} items with R2 URLs")
        print("Saved to: data_combined_with_r2.json")
    else:
        print(f"\n📋 DRY RUN: Would update {updated} items with R2 URLs")

    return updated

def main():
    print("=" * 60)
    print("Cloudflare R2 Upload Script")
    print("=" * 60)

    # Check if boto3 is installed
    try:
        import boto3
    except ImportError:
        print("\n❌ boto3 is not installed!")
        print("Install it with: pip install boto3")
        return

    # Load configuration
    config = load_config()

    if not config:
        print("\n⚠️  No configuration found!")
        save_config_template()
        print("\nPlease set up your R2 credentials in r2_config.json")
        return

    print("\n📋 Configuration loaded")
    print(f"   Bucket: {config['bucket_name']}")

    # Ask what to upload
    print("\nWhat would you like to upload?")
    print("1. thumbnails_regular only")
    print("2. thumbnails_sales only")
    print("3. Both directories")
    print("4. Update data file with R2 URLs only")

    try:
        choice = input("\nEnter choice (1-4): ")
    except EOFError:
        choice = '3'  # Default to both

    if choice == '4':
        # Just update the data file
        base_url = config.get('thumbnails_base_url', f"https://{config['bucket_name']}.r2.dev/")
        update_data_with_urls(base_url, dry_run=False)
        return

    # Initialize uploader
    uploader = R2Uploader(
        config['account_id'],
        config['access_key_id'],
        config['secret_access_key'],
        config['bucket_name']
    )

    directories = []
    if choice == '1':
        directories = [('thumbnails_regular', 'thumbnails_regular/')]
    elif choice == '2':
        directories = [('thumbnails_sales', 'thumbnails_sales/')]
    else:
        directories = [
            ('thumbnails_regular', 'thumbnails_regular/'),
            ('thumbnails_sales', 'thumbnails_sales/')
        ]

    # Upload directories
    all_results = {'success': [], 'failed': []}

    for local_dir, r2_prefix in directories:
        if os.path.exists(local_dir):
            print(f"\n📤 Uploading {local_dir} to R2...")
            results = uploader.upload_directory(local_dir, r2_prefix, max_workers=10)
            all_results['success'].extend(results['success'])
            all_results['failed'].extend(results['failed'])
        else:
            print(f"\n⚠️  Directory {local_dir} not found!")

    # Summary
    print("\n" + "=" * 60)
    print("UPLOAD SUMMARY")
    print("=" * 60)
    print(f"✅ Successfully uploaded: {len(all_results['success'])} files")
    print(f"❌ Failed: {len(all_results['failed'])} files")

    if all_results['failed']:
        print("\nFailed uploads:")
        for filename, error in all_results['failed'][:10]:
            print(f"  - {filename}: {error}")
        if len(all_results['failed']) > 10:
            print(f"  ... and {len(all_results['failed']) - 10} more")

    # Update data file with R2 URLs if upload was successful
    if all_results['success'] and config.get('thumbnails_base_url'):
        print("\n📝 Updating data file with R2 URLs...")
        update_data_with_urls(config['thumbnails_base_url'])

if __name__ == "__main__":
    main()