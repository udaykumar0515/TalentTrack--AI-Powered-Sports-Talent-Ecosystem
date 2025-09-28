#!/usr/bin/env node

/**
 * CSS Duplicate Checker
 * Automatically detects duplicate CSS rules and selectors
 */

const fs = require('fs');
const path = require('path');

class CSSDuplicateChecker {
  constructor(cssFilePath) {
    this.cssFilePath = cssFilePath;
    this.cssContent = '';
    this.duplicates = {
      selectors: new Map(),
      rules: new Map(),
      properties: new Map()
    };
  }

  // Read and parse CSS file
  readCSSFile() {
    try {
      this.cssContent = fs.readFileSync(this.cssFilePath, 'utf8');
      console.log(`✅ Successfully read CSS file: ${this.cssFilePath}`);
      console.log(`📊 File size: ${(this.cssContent.length / 1024).toFixed(2)} KB`);
      return true;
    } catch (error) {
      console.error(`❌ Error reading CSS file: ${error.message}`);
      return false;
    }
  }

  // Extract CSS rules and selectors
  parseCSS() {
    const rules = [];
    const lines = this.cssContent.split('\n');
    let currentRule = null;
    let braceCount = 0;
    let ruleStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and empty lines
      if (line.startsWith('/*') || line.startsWith('*') || line === '') {
        continue;
      }

      // Check for selector (contains { but not inside a rule)
      if (line.includes('{') && braceCount === 0) {
        if (currentRule) {
          rules.push(currentRule);
        }
        
        const selector = line.split('{')[0].trim();
        currentRule = {
          selector: selector,
          properties: [],
          startLine: i + 1,
          endLine: i + 1,
          fullText: line
        };
        braceCount = 1;
        ruleStartLine = i + 1;
      }
      // Inside a rule
      else if (currentRule && braceCount > 0) {
        currentRule.fullText += '\n' + line;
        currentRule.endLine = i + 1;

        // Count braces
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;

        // Rule ends
        if (braceCount === 0) {
          rules.push(currentRule);
          currentRule = null;
        }
        // Property inside rule
        else if (line.includes(':') && !line.includes('{') && !line.includes('}')) {
          const property = line.split(':')[0].trim();
          const value = line.split(':').slice(1).join(':').trim().replace(';', '');
          currentRule.properties.push({ property, value, line: i + 1 });
        }
      }
    }

    // Add last rule if exists
    if (currentRule) {
      rules.push(currentRule);
    }

    return rules;
  }

  // Find duplicate selectors
  findDuplicateSelectors(rules) {
    const selectorMap = new Map();
    
    rules.forEach(rule => {
      const selector = rule.selector;
      if (selectorMap.has(selector)) {
        selectorMap.get(selector).push(rule);
      } else {
        selectorMap.set(selector, [rule]);
      }
    });

    // Filter only duplicates
    selectorMap.forEach((rules, selector) => {
      if (rules.length > 1) {
        this.duplicates.selectors.set(selector, rules);
      }
    });
  }

  // Find duplicate property combinations
  findDuplicateProperties(rules) {
    const propertyMap = new Map();
    
    rules.forEach(rule => {
      if (rule.properties.length === 0) return;
      
      // Create a signature of all properties
      const signature = rule.properties
        .map(p => `${p.property}:${p.value}`)
        .sort()
        .join('|');
      
      if (propertyMap.has(signature)) {
        propertyMap.get(signature).push(rule);
      } else {
        propertyMap.set(signature, [rule]);
      }
    });

    // Filter only duplicates
    propertyMap.forEach((rules, signature) => {
      if (rules.length > 1) {
        this.duplicates.properties.set(signature, rules);
      }
    });
  }

  // Find similar rules (same selector with different properties)
  findSimilarRules(rules) {
    const similarMap = new Map();
    
    rules.forEach(rule => {
      const selector = rule.selector;
      if (similarMap.has(selector)) {
        similarMap.get(selector).push(rule);
      } else {
        similarMap.set(selector, [rule]);
      }
    });

    // Filter selectors with multiple rule definitions
    similarMap.forEach((rules, selector) => {
      if (rules.length > 1) {
        this.duplicates.rules.set(selector, rules);
      }
    });
  }

  // Generate detailed report
  generateReport() {
    console.log('\n🔍 CSS DUPLICATE ANALYSIS REPORT');
    console.log('=' .repeat(50));

    // Duplicate Selectors Report
    if (this.duplicates.selectors.size > 0) {
      console.log(`\n❌ DUPLICATE SELECTORS (${this.duplicates.selectors.size} found):`);
      console.log('-'.repeat(30));
      
      this.duplicates.selectors.forEach((rules, selector) => {
        console.log(`\n📌 Selector: ${selector}`);
        console.log(`   Found ${rules.length} identical rules:`);
        rules.forEach((rule, index) => {
          console.log(`   ${index + 1}. Lines ${rule.startLine}-${rule.endLine}`);
        });
      });
    } else {
      console.log('\n✅ No duplicate selectors found!');
    }

    // Similar Rules Report
    if (this.duplicates.rules.size > 0) {
      console.log(`\n⚠️  SIMILAR RULES (${this.duplicates.rules.size} found):`);
      console.log('-'.repeat(30));
      
      this.duplicates.rules.forEach((rules, selector) => {
        console.log(`\n📌 Selector: ${selector}`);
        console.log(`   Found ${rules.length} different rule definitions:`);
        rules.forEach((rule, index) => {
          console.log(`   ${index + 1}. Lines ${rule.startLine}-${rule.endLine}`);
          console.log(`      Properties: ${rule.properties.length}`);
        });
      });
    } else {
      console.log('\n✅ No similar rules found!');
    }

    // Duplicate Properties Report
    if (this.duplicates.properties.size > 0) {
      console.log(`\n🔄 DUPLICATE PROPERTY COMBINATIONS (${this.duplicates.properties.size} found):`);
      console.log('-'.repeat(30));
      
      this.duplicates.properties.forEach((rules, signature) => {
        console.log(`\n📌 Properties: ${signature.substring(0, 100)}${signature.length > 100 ? '...' : ''}`);
        console.log(`   Found in ${rules.length} different selectors:`);
        rules.forEach((rule, index) => {
          console.log(`   ${index + 1}. ${rule.selector} (Lines ${rule.startLine}-${rule.endLine})`);
        });
      });
    } else {
      console.log('\n✅ No duplicate property combinations found!');
    }

    // Summary
    const totalDuplicates = this.duplicates.selectors.size + 
                           this.duplicates.rules.size + 
                           this.duplicates.properties.size;
    
    console.log('\n📊 SUMMARY:');
    console.log('-'.repeat(30));
    console.log(`Total duplicate issues found: ${totalDuplicates}`);
    console.log(`Duplicate selectors: ${this.duplicates.selectors.size}`);
    console.log(`Similar rules: ${this.duplicates.rules.size}`);
    console.log(`Duplicate properties: ${this.duplicates.properties.size}`);
    
    if (totalDuplicates === 0) {
      console.log('\n🎉 Congratulations! Your CSS file is clean of duplicates!');
    } else {
      console.log('\n💡 Consider consolidating these duplicates to improve maintainability.');
    }
  }

  // Export results to JSON
  exportResults(outputFile) {
    const results = {
      timestamp: new Date().toISOString(),
      file: this.cssFilePath,
      summary: {
        totalDuplicates: this.duplicates.selectors.size + this.duplicates.rules.size + this.duplicates.properties.size,
        duplicateSelectors: this.duplicates.selectors.size,
        similarRules: this.duplicates.rules.size,
        duplicateProperties: this.duplicates.properties.size
      },
      duplicates: {
        selectors: Array.from(this.duplicates.selectors.entries()).map(([selector, rules]) => ({
          selector,
          count: rules.length,
          locations: rules.map(rule => ({ startLine: rule.startLine, endLine: rule.endLine }))
        })),
        rules: Array.from(this.duplicates.rules.entries()).map(([selector, rules]) => ({
          selector,
          count: rules.length,
          locations: rules.map(rule => ({ startLine: rule.startLine, endLine: rule.endLine, propertyCount: rule.properties.length }))
        })),
        properties: Array.from(this.duplicates.properties.entries()).map(([signature, rules]) => ({
          signature: signature.substring(0, 200),
          count: rules.length,
          selectors: rules.map(rule => ({ selector: rule.selector, startLine: rule.startLine, endLine: rule.endLine }))
        }))
      }
    };

    try {
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
      console.log(`\n📄 Results exported to: ${outputFile}`);
    } catch (error) {
      console.error(`❌ Error exporting results: ${error.message}`);
    }
  }

  // Main analysis method
  analyze() {
    console.log('🚀 Starting CSS Duplicate Analysis...\n');
    
    if (!this.readCSSFile()) {
      return false;
    }

    const rules = this.parseCSS();
    console.log(`📋 Parsed ${rules.length} CSS rules`);

    this.findDuplicateSelectors(rules);
    this.findSimilarRules(rules);
    this.findDuplicateProperties(rules);

    this.generateReport();
    this.exportResults('css-duplicates-report.json');

    return true;
  }
}

// CLI Usage
if (require.main === module) {
  const cssFile = process.argv[2] || 'frontend/src/styles/globals.css';
  
  if (!fs.existsSync(cssFile)) {
    console.error(`❌ CSS file not found: ${cssFile}`);
    console.log('Usage: node css-duplicate-checker.js [path-to-css-file]');
    process.exit(1);
  }

  const checker = new CSSDuplicateChecker(cssFile);
  checker.analyze();
}

module.exports = CSSDuplicateChecker;
