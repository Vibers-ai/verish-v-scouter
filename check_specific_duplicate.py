#!/usr/bin/env python3
"""
Check for specific duplicate records in the database.
"""

import json
import requests
import sys

def check_duplicates(search_term):
    """Check for specific duplicates in the database."""

    # Load config
    with open('supabase_config.json', 'r') as f:
        config = json.load(f)

    headers = {
        'apikey': config['supabase_key'],
        'Authorization': f'Bearer {config["supabase_key"]}',
        'Content-Type': 'application/json'
    }

    # Search for records containing the search term in either field
    url = f"{config['supabase_url']}/rest/v1/influencers"

    # Search in author_name
    params1 = {
        'select': 'id,author_name,account_id,follower_count,email,saved',
        'author_name': f'ilike.%{search_term}%'
    }

    response1 = requests.get(url, headers=headers, params=params1)

    # Search in account_id
    params2 = {
        'select': 'id,author_name,account_id,follower_count,email,saved',
        'account_id': f'ilike.%{search_term}%'
    }

    response2 = requests.get(url, headers=headers, params=params2)

    records = []

    if response1.status_code == 200:
        records.extend(response1.json())

    if response2.status_code == 200:
        records.extend(response2.json())

    # Remove duplicates by ID
    seen_ids = set()
    unique_records = []
    for record in records:
        if record['id'] not in seen_ids:
            seen_ids.add(record['id'])
            unique_records.append(record)

    records = unique_records

    print(f"\n=== Searching for '{search_term}' ===")
    print(f"Found {len(records)} record(s):\n")

    for record in records:
        print(f"ID: {record['id']}")
        print(f"  Author Name: {record.get('author_name')}")
        print(f"  Account ID: {record.get('account_id')}")
        print(f"  Followers: {record.get('follower_count')}")
        print(f"  Email: {record.get('email')}")
        print(f"  Saved: {record.get('saved')}")
        print("-" * 40)

    # Check for potential duplicates
    if len(records) > 1:
        print("\n⚠️  Multiple records found - checking for duplicates...")

        # Create normalized keys
        seen_keys = {}
        for record in records:
            author = str(record.get('author_name', '')).lower().strip()
            account = str(record.get('account_id', '')).lower().strip()

            # Check both possible combinations
            key1 = f"{author}|{account}"
            key2 = f"{account}|{author}"

            print(f"\nRecord ID {record['id']}:")
            print(f"  Normalized key 1: {key1}")
            print(f"  Normalized key 2: {key2}")

            for existing_key, existing_record in seen_keys.items():
                if key1 == existing_key or key2 == existing_key:
                    print(f"  🔴 DUPLICATE with ID {existing_record['id']}")

            seen_keys[key1] = record

if __name__ == '__main__':
    search_term = sys.argv[1] if len(sys.argv) > 1 else "caitknightt"
    check_duplicates(search_term)