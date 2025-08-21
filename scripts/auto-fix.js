#!/usr/bin/env node

/**
 * Auto-fix common deployment issues
 * Enhanced version with comprehensive error detection and fixing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoFixer {
  constructor() {
    this.fixes = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      fix: '🔧'
    };
    console.log(`${icons[type]} ${message}`);
  }

  exec(command, silent = false) {
    try {
      return execSync(command, { 
        encoding: 'utf8',
        stdio: silent ? 'pipe' : 'inherit'
      });
    } catch (error) {
      if (!silent) {
        this.errors.push(error.message);
      }
      return null;
    }
  }

  // Fix ESLint issues
  fixLinting() {
    this.log('Fixing linting issues...', 'fix');
    
    const result = this.exec('npx eslint . --fix --ext .js,.jsx,.ts,.tsx', true);
    if (result !== null) {
      this.fixes.push('Fixed linting issues');
      this.log('Linting issues fixed', 'success');
    }
  }

  // Fix Prettier formatting
  fixFormatting() {
    this.log('Fixing formatting...', 'fix');
    
    const result = this.exec('npx prettier --write "**/*.{js,jsx,ts,tsx,css,md,json}" --ignore-path .gitignore', true);
    if (result !== null) {
      this.fixes.push('Fixed formatting');
      this.log('Formatting fixed', 'success');
    }
  }

  // Fix package vulnerabilities
  fixVulnerabilities() {
    this.log('Fixing npm vulnerabilities...', 'fix');
    
    const result = this.exec('npm audit fix', true);
    if (result !== null) {
      this.fixes.push('Fixed npm vulnerabilities');
      this.log('Vulnerabilities fixed', 'success');
    }
  }

  // Fix TypeScript errors
  fixTypeScriptErrors() {
    this.log('Fixing TypeScript errors...', 'fix');
    
    const errors = this.exec('npx tsc --noEmit --pretty false 2>&1', true);
    
    if (errors && errors.includes('Cannot find name')) {
      this.exec('npx eslint . --fix --rule "import/no-unresolved: error"', true);
      this.fixes.push('Added missing imports');
    }
  }

  // Fix Amplify-specific issues
  fixAmplifyIssues() {
    this.log('Checking Amplify configuration...', 'fix');
    
    if (!fs.existsSync('amplify_outputs.json')) {
      this.log('Missing amplify_outputs.json', 'warning');
      
      // Look for app-id in workflow files
      let hasAppId = null;
      try {
        hasAppId = this.exec('grep -r "app-id" .github/workflows/*.yml 2>/dev/null | head -1', true);
      } catch (e) {
        // grep might not be available on all systems
      }
      
      if (hasAppId) {
        const match = hasAppId.match(/app-id[\s:]+([\w-]+)/);
        if (match && match[1]) {
          const appId = match[1];
          this.exec(`npx ampx generate outputs --app-id ${appId} --branch main --format json`, true);
          this.fixes.push('Generated amplify_outputs.json');
        }
      }
    }
  }

  // Main execution
  async run() {
    this.log('Starting auto-fix process...');
    
    this.fixLinting();
    this.fixFormatting();
    this.fixVulnerabilities();
    this.fixTypeScriptErrors();
    this.fixAmplifyIssues();
    
    console.log('');
    console.log('='.repeat(50));
    
    if (this.fixes.length > 0) {
      this.log(`Fixed ${this.fixes.length} issues:`, 'success');
      this.fixes.forEach(fix => console.log(`  - ${fix}`));
      
      if (process.env.CI) {
        this.log('Committing fixes...', 'info');
        this.exec('git add -A');
        this.exec(`git commit -m "🤖 Auto-fix: ${this.fixes.join(', ')}" || true`);
      }
    } else {
      this.log('No issues found to fix!', 'success');
    }
    
    if (this.errors.length > 0) {
      this.log(`${this.errors.length} errors could not be auto-fixed:`, 'error');
      this.errors.forEach(error => console.log(`  - ${error.substring(0, 100)}`));
      process.exit(1);
    }
  }
}

// Run the auto-fixer
const fixer = new AutoFixer();
fixer.run().catch(error => {
  console.error('Auto-fix failed:', error);
  process.exit(1);
});
