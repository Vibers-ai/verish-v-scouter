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

# Read the influencers_filtered_clean.json file
with open('influencers_filtered_clean.json', 'r') as f:
    json_filtered_data = json.load(f)

# Read the influencers.json file
with open('influencers.json', 'r') as f:
    json_data = json.load(f)

# Extract account names from influencers_filtered_clean.json
json_filtered_accounts = set()
for item in json_filtered_data:
    if 'authorMeta' in item and 'name' in item['authorMeta']:
        json_filtered_accounts.add(item['authorMeta']['name'].lower())

# Extract account names from influencers.json
json_accounts = set()
for item in json_data:
    if 'authorMeta' in item and 'name' in item['authorMeta']:
        json_accounts.add(item['authorMeta']['name'].lower())

print(f"Found {len(json_filtered_accounts)} unique account names in influencers_filtered_clean.json")
print(f"Found {len(json_accounts)} unique account names in influencers.json")

# Fetch all account_ids from database
response = supabase.table('influencers').select('account_id').execute()
db_influencers = response.data

# Extract account_ids from database
db_account_ids = set()
for influencer in db_influencers:
    if influencer.get('account_id'):
        db_account_ids.add(influencer['account_id'].lower())

print(f"Found {len(db_account_ids)} unique account_ids in database\n")

# Find duplicates between different sources
db_vs_filtered = db_account_ids.intersection(json_filtered_accounts)
db_vs_regular = db_account_ids.intersection(json_accounts)
filtered_vs_regular = json_filtered_accounts.intersection(json_accounts)
all_three = db_account_ids.intersection(json_filtered_accounts).intersection(json_accounts)

print("=" * 60)
print("COMPREHENSIVE DUPLICATE ANALYSIS")
print("=" * 60)

print(f"\n1. DATABASE vs INFLUENCERS_FILTERED_CLEAN.JSON:")
print(f"   - Total duplicates: {len(db_vs_filtered)}")
print(f"   - % of DB accounts: {(len(db_vs_filtered) / len(db_account_ids)) * 100:.2f}%")
print(f"   - % of filtered JSON accounts: {(len(db_vs_filtered) / len(json_filtered_accounts)) * 100:.2f}%")

print(f"\n2. DATABASE vs INFLUENCERS.JSON:")
print(f"   - Total duplicates: {len(db_vs_regular)}")
print(f"   - % of DB accounts: {(len(db_vs_regular) / len(db_account_ids)) * 100:.2f}%")
print(f"   - % of regular JSON accounts: {(len(db_vs_regular) / len(json_accounts)) * 100:.2f}%")

print(f"\n3. INFLUENCERS_FILTERED_CLEAN.JSON vs INFLUENCERS.JSON:")
print(f"   - Total duplicates: {len(filtered_vs_regular)}")
print(f"   - % of filtered accounts: {(len(filtered_vs_regular) / len(json_filtered_accounts)) * 100:.2f}%")
print(f"   - % of regular accounts: {(len(filtered_vs_regular) / len(json_accounts)) * 100:.2f}%")

print(f"\n4. ACCOUNTS IN ALL THREE SOURCES:")
print(f"   - Total: {len(all_three)}")

# Find unique accounts in each source
only_in_db = db_account_ids - json_filtered_accounts - json_accounts
only_in_filtered = json_filtered_accounts - db_account_ids - json_accounts
only_in_regular = json_accounts - db_account_ids - json_filtered_accounts

print(f"\n5. UNIQUE ACCOUNTS PER SOURCE:")
print(f"   - Only in database: {len(only_in_db)}")
print(f"   - Only in filtered JSON: {len(only_in_filtered)}")
print(f"   - Only in regular JSON: {len(only_in_regular)}")

# Sample of duplicates
print("\n" + "=" * 60)
print("SAMPLE DUPLICATES")
print("=" * 60)

if db_vs_filtered:
    print(f"\nDB vs Filtered JSON (first 5):")
    for i, account in enumerate(list(db_vs_filtered)[:5], 1):
        print(f"   {i}. {account}")

if db_vs_regular:
    print(f"\nDB vs Regular JSON (first 5):")
    for i, account in enumerate(list(db_vs_regular)[:5], 1):
        print(f"   {i}. {account}")

if all_three:
    print(f"\nIn all three sources (first 5):")
    for i, account in enumerate(list(all_three)[:5], 1):
        print(f"   {i}. {account}")

# Save comprehensive report to file
report = {
    'summary': {
        'database_total': len(db_account_ids),
        'filtered_json_total': len(json_filtered_accounts),
        'regular_json_total': len(json_accounts)
    },
    'duplicates': {
        'db_vs_filtered': {
            'count': len(db_vs_filtered),
            'accounts': list(db_vs_filtered)
        },
        'db_vs_regular': {
            'count': len(db_vs_regular),
            'accounts': list(db_vs_regular)
        },
        'filtered_vs_regular': {
            'count': len(filtered_vs_regular),
            'accounts': list(filtered_vs_regular)
        },
        'all_three_sources': {
            'count': len(all_three),
            'accounts': list(all_three)
        }
    },
    'unique_accounts': {
        'only_in_db': {
            'count': len(only_in_db),
            'accounts': list(only_in_db)[:20]  # Save first 20 as sample
        },
        'only_in_filtered': {
            'count': len(only_in_filtered),
            'accounts': list(only_in_filtered)[:20]
        },
        'only_in_regular': {
            'count': len(only_in_regular),
            'accounts': list(only_in_regular)[:20]
        }
    }
}

with open('duplicate_analysis_comprehensive.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f"\nDetailed report saved to duplicate_analysis_comprehensive.json")