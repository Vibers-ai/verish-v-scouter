#!/usr/bin/env python3
"""
Filter US Influencers from TikTok Data

This script filters influencer data to identify:
1. Confirmed US influencers (clear US location indicators)
2. Non-US influencers (clear non-US location indicators)
3. Uncertain influencers (no clear location indicators)
"""

import json
import re
from typing import Dict, List, Tuple
from datetime import datetime


class USInfluencerFilter:
    def __init__(self):
        # US location indicators
        self.us_cities = [
            'NYC', 'New York', 'LA', 'Los Angeles', 'Chicago', 'Houston',
            'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas',
            'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus',
            'Charlotte', 'Indianapolis', 'San Francisco', 'Seattle', 'Denver',
            'Washington', 'DC', 'Boston', 'El Paso', 'Nashville', 'Detroit',
            'Portland', 'Memphis', 'Oklahoma City', 'Las Vegas', 'Vegas',
            'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson',
            'Fresno', 'Sacramento', 'Kansas City', 'Mesa', 'Atlanta',
            'Omaha', 'Colorado Springs', 'Raleigh', 'Miami', 'Long Beach',
            'Virginia Beach', 'Oakland', 'Minneapolis', 'Tulsa', 'Tampa',
            'Arlington', 'New Orleans', 'Orlando', 'Pittsburgh', 'Cincinnati',
            'Scottsdale', 'Beverly Hills', 'Manhattan', 'Brooklyn', 'Queens',
            'Bronx', 'Staten Island', 'Hollywood', 'Malibu', 'Silicon Valley',
            'Bay Area', 'SoCal', 'NorCal'
        ]

        self.us_states = [
            'Alabama', 'AL', 'Alaska', 'AK', 'Arizona', 'AZ', 'Arkansas', 'AR',
            'California', 'CA', 'Cali', 'Colorado', 'CO', 'Connecticut', 'CT',
            'Delaware', 'DE', 'Florida', 'FL', 'Georgia', 'GA', 'Hawaii', 'HI',
            'Idaho', 'ID', 'Illinois', 'IL', 'Indiana', 'IN', 'Iowa', 'IA',
            'Kansas', 'KS', 'Kentucky', 'KY', 'Louisiana', 'LA', 'Maine', 'ME',
            'Maryland', 'MD', 'Massachusetts', 'MA', 'Michigan', 'MI',
            'Minnesota', 'MN', 'Mississippi', 'MS', 'Missouri', 'MO',
            'Montana', 'MT', 'Nebraska', 'NE', 'Nevada', 'NV',
            'New Hampshire', 'NH', 'New Jersey', 'NJ', 'New Mexico', 'NM',
            'New York', 'NY', 'North Carolina', 'NC', 'North Dakota', 'ND',
            'Ohio', 'OH', 'Oklahoma', 'OK', 'Oregon', 'OR', 'Pennsylvania', 'PA',
            'Rhode Island', 'RI', 'South Carolina', 'SC', 'South Dakota', 'SD',
            'Tennessee', 'TN', 'Texas', 'TX', 'Utah', 'UT', 'Vermont', 'VT',
            'Virginia', 'VA', 'Washington', 'WA', 'West Virginia', 'WV',
            'Wisconsin', 'WI', 'Wyoming', 'WY'
        ]

        self.us_keywords = ['USA', 'United States', 'America', 'U.S.', 'US']
        self.us_flag = '🇺🇸'

        # Non-US location indicators
        self.non_us_countries = [
            'UK', 'United Kingdom', 'England', 'Britain', 'Scotland', 'Wales',
            'Canada', 'Australia', 'Germany', 'France', 'Spain', 'Italy',
            'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Portugal',
            'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru',
            'Japan', 'Korea', 'China', 'India', 'Philippines', 'Singapore',
            'Malaysia', 'Indonesia', 'Thailand', 'Vietnam', 'Dubai', 'UAE',
            'Saudi Arabia', 'Lebanon', 'Israel', 'Turkey', 'Russia', 'Poland',
            'Czech', 'Hungary', 'Romania', 'Greece', 'Sweden', 'Norway',
            'Denmark', 'Finland', 'Ireland', 'New Zealand', 'South Africa',
            'Nigeria', 'Egypt', 'Morocco', 'Kenya', 'Croatia', 'Serbia'
        ]

        self.non_us_cities = [
            'London', 'Manchester', 'Birmingham', 'Liverpool', 'Edinburgh',
            'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa',
            'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
            'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne',
            'Paris', 'Madrid', 'Barcelona', 'Rome', 'Milan', 'Amsterdam',
            'Mexico City', 'São Paulo', 'Rio', 'Buenos Aires', 'Santiago',
            'Tokyo', 'Seoul', 'Beijing', 'Shanghai', 'Mumbai', 'Delhi',
            'Manila', 'Bangkok', 'Jakarta', 'Kuala Lumpur', 'Dubai',
            'Tel Aviv', 'Istanbul', 'Moscow', 'Warsaw', 'Prague',
            'Stockholm', 'Oslo', 'Copenhagen', 'Dublin', 'Auckland'
        ]

        # Non-US flag emojis
        self.non_us_flags = [
            '🇬🇧', '🇨🇦', '🇦🇺', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹', '🇳🇱',
            '🇲🇽', '🇧🇷', '🇦🇷', '🇨🇱', '🇨🇴', '🇵🇪', '🇯🇵', '🇰🇷',
            '🇨🇳', '🇮🇳', '🇵🇭', '🇸🇬', '🇲🇾', '🇮🇩', '🇹🇭', '🇻🇳',
            '🇦🇪', '🇸🇦', '🇱🇧', '🇮🇱', '🇹🇷', '🇷🇺', '🇵🇱', '🇨🇿',
            '🇭🇺', '🇷🇴', '🇬🇷', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇮🇪',
            '🇳🇿', '🇿🇦', '🇳🇬', '🇪🇬', '🇲🇦', '🇰🇪', '🇭🇷', '🇷🇸',
            '🇧🇪', '🇨🇭', '🇦🇹', '🇵🇹', '🇳🇮', '🇬🇹', '🇸🇻', '🇭🇳',
            '🇨🇷', '🇵🇦', '🇩🇴', '🇨🇺', '🇻🇪', '🇪🇨', '🇧🇴', '🇵🇾',
            '🇺🇾', '🇯🇲', '🇹🇹', '🇧🇧', '🇧🇸', '🇭🇹', '🇱🇰', '🇧🇩',
            '🇵🇰', '🇦🇫', '🇳🇵', '🇰🇭', '🇱🇦', '🇲🇲', '🇹🇼', '🇲🇳',
            '🇰🇿', '🇺🇿', '🇹🇯', '🇰🇬', '🇹🇲', '🇦🇿', '🇬🇪', '🇦🇲',
            '🇺🇦', '🇧🇾', '🇲🇩', '🇱🇹', '🇱🇻', '🇪🇪', '🇸🇰', '🇸🇮',
            '🇧🇬', '🇦🇱', '🇲🇰', '🇧🇦', '🇲🇪', '🇽🇰', '🇲🇹', '🇨🇾'
        ]

        # Non-US email domains
        self.non_us_domains = [
            '.co.uk', '.ca', '.au', '.de', '.fr', '.es', '.it', '.nl',
            '.mx', '.br', '.jp', '.kr', '.cn', '.in', '.ru', '.pl'
        ]

    def is_us_influencer(self, signature: str) -> Tuple[bool, str]:
        """
        Determine if an influencer is from the US based on their signature.

        Returns:
            Tuple[bool, str]: (is_us, reason)
            - True, "reason" if US influencer
            - False, "reason" if non-US influencer
            - None, "uncertain" if unclear
        """
        if not signature:
            return None, "no signature"

        signature_lower = signature.lower()

        # Check for US flag emoji
        if self.us_flag in signature:
            return True, "US flag emoji"

        # Check for non-US flags
        for flag in self.non_us_flags:
            if flag in signature:
                return False, f"non-US flag: {flag}"

        # Check for non-US email domains
        for domain in self.non_us_domains:
            if domain in signature_lower:
                return False, f"non-US domain: {domain}"

        # Check for explicit non-US countries
        for country in self.non_us_countries:
            # Use word boundaries to avoid false matches
            pattern = r'\b' + re.escape(country.lower()) + r'\b'
            if re.search(pattern, signature_lower):
                return False, f"non-US country: {country}"

        # Check for non-US cities
        for city in self.non_us_cities:
            pattern = r'\b' + re.escape(city.lower()) + r'\b'
            if re.search(pattern, signature_lower):
                return False, f"non-US city: {city}"

        # Check for explicit US keywords
        for keyword in self.us_keywords:
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
            if re.search(pattern, signature_lower):
                return True, f"US keyword: {keyword}"

        # Check for US cities
        for city in self.us_cities:
            # Special handling for LA (could be Louisiana or Los Angeles)
            if city == 'LA':
                # Check if it's clearly Los Angeles or Louisiana context
                if re.search(r'\bla\b(?!\s*[a-z])', signature_lower):
                    # Check context to avoid false positives
                    if 'louisiana' not in signature_lower:
                        return True, f"US city: {city}"
            else:
                pattern = r'\b' + re.escape(city.lower()) + r'\b'
                if re.search(pattern, signature_lower):
                    return True, f"US city: {city}"

        # Check for US states
        for state in self.us_states:
            # Special handling for state abbreviations to avoid false matches
            if len(state) == 2:
                # Look for state abbreviation with proper boundaries
                pattern = r'(?:^|[\s,])' + re.escape(state.upper()) + r'(?:$|[\s,])'
                if re.search(pattern, signature.upper()):
                    return True, f"US state: {state}"
            else:
                pattern = r'\b' + re.escape(state.lower()) + r'\b'
                if re.search(pattern, signature_lower):
                    return True, f"US state: {state}"

        return None, "uncertain"

    def filter_influencers(self, data: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Filter influencers into US, non-US, and uncertain categories.

        Args:
            data: List of influencer dictionaries

        Returns:
            Dictionary with 'us', 'non_us', and 'uncertain' lists
        """
        results = {
            'us': [],
            'non_us': [],
            'uncertain': []
        }

        for influencer in data:
            signature = influencer.get('authorMeta', {}).get('signature', '')
            is_us, reason = self.is_us_influencer(signature)

            # Add reason to the influencer data for tracking
            influencer_copy = influencer.copy()
            influencer_copy['location_filter_reason'] = reason

            if is_us is True:
                results['us'].append(influencer_copy)
            elif is_us is False:
                results['non_us'].append(influencer_copy)
            else:
                results['uncertain'].append(influencer_copy)

        return results


def main():
    """Main function to filter US influencers from the dataset."""

    print("US Influencer Filter")
    print("=" * 50)

    # Initialize filter
    filter_tool = USInfluencerFilter()

    # Load the data
    input_file = 'influencers_filtered_clean.json'
    print(f"\nLoading data from {input_file}...")

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Loaded {len(data)} influencers")
    except FileNotFoundError:
        print(f"Error: {input_file} not found!")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {input_file}: {e}")
        return

    # Filter the data
    print("\nFiltering influencers by location...")
    results = filter_tool.filter_influencers(data)

    # Save results to separate files
    output_files = {
        'influencers_us_confirmed.json': results['us'],
        'influencers_non_us.json': results['non_us'],
        'influencers_uncertain.json': results['uncertain']
    }

    for filename, data_list in output_files.items():
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data_list, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(data_list)} influencers to {filename}")

    # Generate summary report
    report_filename = f'filter_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'

    with open(report_filename, 'w') as f:
        f.write("US Influencer Filter Report\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Input file: {input_file}\n")
        f.write(f"Total influencers processed: {len(data)}\n\n")

        f.write("Results Summary:\n")
        f.write("-" * 30 + "\n")
        f.write(f"US Confirmed: {len(results['us'])} ({len(results['us'])/len(data)*100:.1f}%)\n")
        f.write(f"Non-US: {len(results['non_us'])} ({len(results['non_us'])/len(data)*100:.1f}%)\n")
        f.write(f"Uncertain: {len(results['uncertain'])} ({len(results['uncertain'])/len(data)*100:.1f}%)\n\n")

        # Sample reasons for US influencers
        f.write("Sample US Detection Reasons:\n")
        f.write("-" * 30 + "\n")
        us_reasons = {}
        for inf in results['us'][:100]:  # Sample first 100
            reason = inf.get('location_filter_reason', 'unknown')
            us_reasons[reason] = us_reasons.get(reason, 0) + 1
        for reason, count in sorted(us_reasons.items(), key=lambda x: -x[1])[:10]:
            f.write(f"  {reason}: {count}\n")

        # Sample reasons for non-US influencers
        f.write("\nSample Non-US Detection Reasons:\n")
        f.write("-" * 30 + "\n")
        non_us_reasons = {}
        for inf in results['non_us']:
            reason = inf.get('location_filter_reason', 'unknown')
            non_us_reasons[reason] = non_us_reasons.get(reason, 0) + 1
        for reason, count in sorted(non_us_reasons.items(), key=lambda x: -x[1])[:10]:
            f.write(f"  {reason}: {count}\n")

        # Sample uncertain signatures
        f.write("\nSample Uncertain Signatures:\n")
        f.write("-" * 30 + "\n")
        for inf in results['uncertain'][:10]:
            sig = inf.get('authorMeta', {}).get('signature', 'No signature')
            # Clean signature for display
            sig_clean = sig.replace('\n', ' | ')[:100]
            f.write(f"  - {sig_clean}...\n" if len(sig) > 100 else f"  - {sig_clean}\n")

    print(f"\nReport saved to {report_filename}")

    print("\n" + "=" * 50)
    print("Filtering complete!")
    print("\nNext steps:")
    print("1. Review the uncertain influencers in 'influencers_uncertain.json'")
    print("2. Check samples from US and non-US files for accuracy")
    print("3. Consider manual review or additional filtering for uncertain cases")


if __name__ == "__main__":
    main()