#!/usr/bin/env python3
"""
CSS Duplicate Checker - Python Version
Automatically detects duplicate CSS rules and selectors
"""

import re
import json
import sys
from collections import defaultdict
from datetime import datetime

class CSSDuplicateChecker:
    def __init__(self, css_file_path):
        self.css_file_path = css_file_path
        self.css_content = ""
        self.duplicates = {
            'selectors': defaultdict(list),
            'rules': defaultdict(list),
            'properties': defaultdict(list)
        }

    def read_css_file(self):
        """Read and parse CSS file"""
        try:
            with open(self.css_file_path, 'r', encoding='utf-8') as file:
                self.css_content = file.read()
            file_size = len(self.css_content) / 1024
            print(f"✅ Successfully read CSS file: {self.css_file_path}")
            print(f"📊 File size: {file_size:.2f} KB")
            return True
        except FileNotFoundError:
            print(f"❌ CSS file not found: {self.css_file_path}")
            return False
        except Exception as e:
            print(f"❌ Error reading CSS file: {e}")
            return False

    def parse_css(self):
        """Extract CSS rules and selectors"""
        rules = []
        lines = self.css_content.split('\n')
        current_rule = None
        brace_count = 0
        rule_start_line = 0

        for i, line in enumerate(lines):
            line = line.strip()
            
            # Skip comments and empty lines
            if line.startswith('/*') or line.startswith('*') or line == '':
                continue

            # Check for selector (contains { but not inside a rule)
            if '{' in line and brace_count == 0:
                if current_rule:
                    rules.append(current_rule)
                
                selector = line.split('{')[0].strip()
                current_rule = {
                    'selector': selector,
                    'properties': [],
                    'start_line': i + 1,
                    'end_line': i + 1,
                    'full_text': line
                }
                brace_count = 1
                rule_start_line = i + 1
            # Inside a rule
            elif current_rule and brace_count > 0:
                current_rule['full_text'] += '\n' + line
                current_rule['end_line'] = i + 1

                # Count braces
                brace_count += line.count('{') - line.count('}')

                # Rule ends
                if brace_count == 0:
                    rules.append(current_rule)
                    current_rule = None
                # Property inside rule
                elif ':' in line and '{' not in line and '}' not in line:
                    parts = line.split(':', 1)
                    property_name = parts[0].strip()
                    value = parts[1].strip().rstrip(';')
                    current_rule['properties'].append({
                        'property': property_name,
                        'value': value,
                        'line': i + 1
                    })

        # Add last rule if exists
        if current_rule:
            rules.append(current_rule)

        return rules

    def find_duplicate_selectors(self, rules):
        """Find duplicate selectors"""
        selector_map = defaultdict(list)
        
        for rule in rules:
            selector_map[rule['selector']].append(rule)

        # Filter only duplicates
        for selector, rule_list in selector_map.items():
            if len(rule_list) > 1:
                self.duplicates['selectors'][selector] = rule_list

    def find_similar_rules(self, rules):
        """Find similar rules (same selector with different properties)"""
        selector_map = defaultdict(list)
        
        for rule in rules:
            selector_map[rule['selector']].append(rule)

        # Filter selectors with multiple rule definitions
        for selector, rule_list in selector_map.items():
            if len(rule_list) > 1:
                self.duplicates['rules'][selector] = rule_list

    def find_duplicate_properties(self, rules):
        """Find duplicate property combinations"""
        property_map = defaultdict(list)
        
        for rule in rules:
            if not rule['properties']:
                continue
            
            # Create a signature of all properties
            signature = '|'.join(sorted([f"{p['property']}:{p['value']}" for p in rule['properties']]))
            
            property_map[signature].append(rule)

        # Filter only duplicates
        for signature, rule_list in property_map.items():
            if len(rule_list) > 1:
                self.duplicates['properties'][signature] = rule_list

    def generate_report(self):
        """Generate detailed report"""
        print('\n🔍 CSS DUPLICATE ANALYSIS REPORT')
        print('=' * 50)

        # Duplicate Selectors Report
        if self.duplicates['selectors']:
            print(f'\n❌ DUPLICATE SELECTORS ({len(self.duplicates["selectors"])} found):')
            print('-' * 30)
            
            for selector, rules in self.duplicates['selectors'].items():
                print(f'\n📌 Selector: {selector}')
                print(f'   Found {len(rules)} identical rules:')
                for i, rule in enumerate(rules):
                    print(f'   {i + 1}. Lines {rule["start_line"]}-{rule["end_line"]}')
        else:
            print('\n✅ No duplicate selectors found!')

        # Similar Rules Report
        if self.duplicates['rules']:
            print(f'\n⚠️  SIMILAR RULES ({len(self.duplicates["rules"])} found):')
            print('-' * 30)
            
            for selector, rules in self.duplicates['rules'].items():
                print(f'\n📌 Selector: {selector}')
                print(f'   Found {len(rules)} different rule definitions:')
                for i, rule in enumerate(rules):
                    print(f'   {i + 1}. Lines {rule["start_line"]}-{rule["end_line"]}')
                    print(f'      Properties: {len(rule["properties"])}')
        else:
            print('\n✅ No similar rules found!')

        # Duplicate Properties Report
        if self.duplicates['properties']:
            print(f'\n🔄 DUPLICATE PROPERTY COMBINATIONS ({len(self.duplicates["properties"])} found):')
            print('-' * 30)
            
            for signature, rules in self.duplicates['properties'].items():
                display_signature = signature[:100] + '...' if len(signature) > 100 else signature
                print(f'\n📌 Properties: {display_signature}')
                print(f'   Found in {len(rules)} different selectors:')
                for i, rule in enumerate(rules):
                    print(f'   {i + 1}. {rule["selector"]} (Lines {rule["start_line"]}-{rule["end_line"]})')
        else:
            print('\n✅ No duplicate property combinations found!')

        # Summary
        total_duplicates = (len(self.duplicates['selectors']) + 
                           len(self.duplicates['rules']) + 
                           len(self.duplicates['properties']))
        
        print('\n📊 SUMMARY:')
        print('-' * 30)
        print(f'Total duplicate issues found: {total_duplicates}')
        print(f'Duplicate selectors: {len(self.duplicates["selectors"])}')
        print(f'Similar rules: {len(self.duplicates["rules"])}')
        print(f'Duplicate properties: {len(self.duplicates["properties"])}')
        
        if total_duplicates == 0:
            print('\n🎉 Congratulations! Your CSS file is clean of duplicates!')
        else:
            print('\n💡 Consider consolidating these duplicates to improve maintainability.')

    def export_results(self, output_file):
        """Export results to JSON"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'file': self.css_file_path,
            'summary': {
                'total_duplicates': (len(self.duplicates['selectors']) + 
                                   len(self.duplicates['rules']) + 
                                   len(self.duplicates['properties'])),
                'duplicate_selectors': len(self.duplicates['selectors']),
                'similar_rules': len(self.duplicates['rules']),
                'duplicate_properties': len(self.duplicates['properties'])
            },
            'duplicates': {
                'selectors': [
                    {
                        'selector': selector,
                        'count': len(rules),
                        'locations': [{'start_line': r['start_line'], 'end_line': r['end_line']} for r in rules]
                    }
                    for selector, rules in self.duplicates['selectors'].items()
                ],
                'rules': [
                    {
                        'selector': selector,
                        'count': len(rules),
                        'locations': [{'start_line': r['start_line'], 'end_line': r['end_line'], 'property_count': len(r['properties'])} for r in rules]
                    }
                    for selector, rules in self.duplicates['rules'].items()
                ],
                'properties': [
                    {
                        'signature': signature[:200],
                        'count': len(rules),
                        'selectors': [{'selector': r['selector'], 'start_line': r['start_line'], 'end_line': r['end_line']} for r in rules]
                    }
                    for signature, rules in self.duplicates['properties'].items()
                ]
            }
        }

        try:
            with open(output_file, 'w', encoding='utf-8') as file:
                json.dump(results, file, indent=2, ensure_ascii=False)
            print(f'\n📄 Results exported to: {output_file}')
        except Exception as e:
            print(f'\n❌ Error exporting results: {e}')

    def analyze(self):
        """Main analysis method"""
        print('🚀 Starting CSS Duplicate Analysis...\n')
        
        if not self.read_css_file():
            return False

        rules = self.parse_css()
        print(f'📋 Parsed {len(rules)} CSS rules')

        self.find_duplicate_selectors(rules)
        self.find_similar_rules(rules)
        self.find_duplicate_properties(rules)

        self.generate_report()
        self.export_results('css-duplicates-report.json')

        return True

def main():
    css_file = sys.argv[1] if len(sys.argv) > 1 else 'frontend/src/styles/globals.css'
    
    checker = CSSDuplicateChecker(css_file)
    checker.analyze()

if __name__ == '__main__':
    main()
