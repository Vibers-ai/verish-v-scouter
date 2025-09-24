import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv('react-app/.env')

# Initialize Supabase client
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

# Read the JSON file
with open('influencers_filtered_clean.json', 'r') as f:
    json_data = json.load(f)

# Extract account names from JSON
json_account_names = set()
for item in json_data:
    if 'authorMeta' in item and 'name' in item['authorMeta']:
        json_account_names.add(item['authorMeta']['name'].lower())

print(f"Found {len(json_account_names)} unique account names in JSON file")

# Fetch all account_ids from database
response = supabase.table('influencers').select('account_id').execute()
db_influencers = response.data

# Extract account_ids from database
db_account_ids = set()
for influencer in db_influencers:
    if influencer.get('account_id'):
        db_account_ids.add(influencer['account_id'].lower())

print(f"Found {len(db_account_ids)} unique account_ids in database")

# Find duplicates
duplicates = json_account_names.intersection(db_account_ids)

print(f"\n=== DUPLICATE ANALYSIS ===")
print(f"Total duplicates found: {len(duplicates)}")
print(f"Percentage of JSON accounts that are duplicates: {(len(duplicates) / len(json_account_names)) * 100:.2f}%")
print(f"Percentage of DB accounts that are duplicates: {(len(duplicates) / len(db_account_ids)) * 100:.2f}%")

if duplicates:
    print(f"\nFirst 10 duplicate accounts:")
    for i, account in enumerate(list(duplicates)[:10], 1):
        print(f"{i}. {account}")

# Save duplicates to file for reference
with open('duplicate_accounts.json', 'w') as f:
    json.dump({
        'total_duplicates': len(duplicates),
        'duplicate_accounts': list(duplicates),
        'json_total': len(json_account_names),
        'db_total': len(db_account_ids)
    }, f, indent=2)

print(f"\nDuplicate accounts saved to duplicate_accounts.json")