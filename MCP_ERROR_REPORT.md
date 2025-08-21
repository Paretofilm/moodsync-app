# MCP Error Report - MoodSync App Testing

## Issue 1: Package Lock File Conflicts

**MCP Involved:** amplify-gen-2-code-generator

**Problem:** The generated `package-lock.json` had dependency conflicts causing `npm ci` to fail in AWS Amplify build

**Error Details:**

```
npm error Invalid: lock file's react-remove-scroll-bar@2.3.6 does not satisfy react-remove-scroll-bar@2.3.8
npm error Invalid: lock file's react-style-singleton@2.2.1 does not satisfy react-style-singleton@2.2.3
npm error Missing: dom-helpers@5.2.1 from lock file
npm error Missing: globalize@0.1.1 from lock file
```

**Root Cause:** The code generator created a `package-lock.json` that was inconsistent with the actual dependencies

**Solution:** Delete and regenerate package-lock.json

## Issue 2: Agent Name Confusion

**MCP Involved:** Task tool

**Problem:** Tried to use `amplify-pipeline` as subagent_type but it doesn't exist

**Error:** "Agent type 'amplify-pipeline' not found"

**Solution:** Use the MCP directly with `mcp__amplify-pipeline__pipeline_deploy`

## Observations

### What Worked Well:

1. ✅ amplify-gen-2-code-generator successfully created the complete app structure
2. ✅ All Gen 2 patterns were correctly used (defineData, defineAuth, etc.)
3. ✅ amplify-pipeline-mcp successfully set up CI/CD with auto-fix
4. ✅ amplify-gen-2-nextjs-docs provided accurate documentation

### What Needs Improvement:

1. ⚠️ Package-lock.json generation needs to be more robust
2. ⚠️ Initial deployment should complete before pipeline setup (timing issue)

## Issue 3: Node Version Mismatch in GitHub Actions

**MCP Involved:** amplify-pipeline-mcp

**Problem:** The pipeline MCP generated GitHub Actions workflow with Node 18, but modern Amplify packages require Node 20+

**Error Details:**

```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: '@isaacs/balanced-match@4.0.1',
npm warn EBADENGINE   required: { node: '20 || >=22' },
npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
```

**Root Cause:** Pipeline MCP defaults to Node 18 in GitHub Actions setup

**Solution:** Update workflow to use Node 20

## Issue 4: Incorrect Pipeline Deploy Command

**MCP Involved:** amplify-pipeline-mcp

**Problem:** The pipeline MCP generated workflow with `npx ampx pipeline-deploy` which is incorrect

**Error Details:**

- The workflow tried to use `npx ampx pipeline-deploy` which doesn't exist
- Should trigger AWS Amplify build instead using AWS CLI

**Root Cause:** Pipeline MCP generated incorrect deployment command

**Solution:** Use `aws amplify start-job` to trigger Amplify builds

## Issue 5: Missing AWS Credentials in GitHub Secrets

**MCP Involved:** amplify-pipeline-mcp (documentation issue)

**Problem:** The pipeline MCP didn't document that AWS credentials need to be added to GitHub secrets

**Error Details:**
```
Credentials could not be loaded, please check your action inputs: Could not load credentials from any providers
```

**Root Cause:** AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY not configured in GitHub repository secrets

**Solution:** User needs to add AWS credentials to GitHub repository secrets:
1. Go to GitHub repository settings
2. Navigate to Secrets and variables > Actions
3. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

## Recommendations:

1. Code generator should run `npm install` to generate a valid package-lock.json
2. Pipeline MCP could check if initial deployment is complete before setup
3. Add validation for package-lock.json consistency
4. **Pipeline MCP should default to Node 20 for GitHub Actions workflows** (Node 18 is incompatible with modern Amplify packages)
