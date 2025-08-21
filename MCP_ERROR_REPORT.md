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

## Issue 6: Backend Not Deployed / CloudFormation Stack Missing

**MCP Involved:** amplify-gen-2-code-generator

**Problem:** The code generator created an app but didn't deploy the backend, causing builds to fail

**Error Details:**
```
[StackDoesNotExistError] Stack does not exist.
Stack with id amplify-d32q73w0m2w4bq-main-branch-c8c420b81a does not exist
```

**Root Cause:** The backend CloudFormation stack needs to be created before the app can build

**Solution:** Need to run initial backend deployment locally with `npx ampx sandbox` or similar

## Issue 7: Amplify Build Uses Node 18

**MCP Involved:** AWS Amplify Console default configuration

**Problem:** Amplify build environment defaults to Node 18, but packages require Node 20+

**Solution:** Add `nvm use 20` to amplify.yml build commands

## Issue 8: Pipeline MCP Doesn't Handle Initial Backend Deployment

**MCP Involved:** amplify-pipeline-mcp

**Problem:** The pipeline MCP doesn't automatically deploy the backend if it doesn't exist

**Error Details:**
- `npx ampx sandbox` doesn't accept `--app-id` or `--branch` parameters
- Sandbox is for local development, not production deployment
- Pipeline setup fails if backend stack doesn't exist
- Users must manually deploy backend before pipeline works

**Root Cause:** The pipeline MCP assumes backend already exists but doesn't create it

**What SHOULD Happen:**
1. Pipeline MCP's `pipeline_deploy` command should:
   - Check if CloudFormation stack exists
   - If not, create the initial backend deployment
   - Then set up CI/CD pipeline
2. This should be automatic - no manual steps required

**Current Workaround:**
Users must manually deploy backend first using:
```bash
npx ampx sandbox --once  # Creates local sandbox (not ideal)
# OR
npx ampx pipeline-deploy --app-id <id> --branch main  # If this command exists
```

### Why This Is Critical:
- Amplify builds fail with "Stack does not exist" if backend isn't deployed
- The pipeline can't create the initial backend stack (but it should!)
- Manual initial deployment shouldn't be required for CI/CD setup
- This breaks the "automatic" nature of the pipeline setup

## Issue 9: Code Generator Creates Invalid Data Models

**MCP Involved:** amplify-gen-2-code-generator

**Problem:** The code generator creates data models with invalid/incomplete relationships

**Error Details:**
1. Models have `belongsTo` relationships without corresponding `hasMany` in the related model
2. Models use `.required()` and `.default()` methods on enums which don't exist
3. Authorization rules use `.where()` which isn't valid
4. User attributes include unsupported fields like `picture`

**Examples of Invalid Code Generated:**
```typescript
// INVALID - enum doesn't have .required()
status: a.enum(["PENDING", "ACCEPTED"]).required()

// INVALID - missing hasMany in UserProfile
Mood: a.model({
  userProfile: a.belongsTo("UserProfile", "userId")
})
// But UserProfile missing: moods: a.hasMany("Mood", "userId")

// INVALID - where clause not supported
.authorization((allow) => [
  allow.authenticated().to(["read"]).where((mood) => mood.isPrivate.eq(false))
])

// INVALID - picture not a valid user attribute
userAttributes: {
  picture: { required: false, mutable: true }
}
```

**Root Cause:** 
The code generator is producing invalid Amplify Gen 2 syntax that doesn't match the documentation.
The docs MCP clearly shows enums should be: `a.enum(["VALUE1", "VALUE2"])` without `.required()` or `.default()`
But the generator creates: `a.enum(["VALUE1", "VALUE2"]).required()` which is invalid

**Note:** The code generator is NOT consulting the docs MCP when generating code, leading to these syntax errors

**What Had to Be Fixed Manually:**
1. Remove `.required()` from all enum fields
2. Remove `.default()` from enum fields  
3. Add `hasMany` relationships to all models referenced by `belongsTo`
4. Remove invalid `where` clauses from authorization
5. Remove unsupported user attributes

**Impact:** Backend deployment fails with multiple TypeScript and schema errors

## Issue 10: Frontend Build Fails After Backend Deployment

**MCP Involved:** amplify-gen-2-code-generator

**Problem:** The frontend Next.js app generated by the code generator fails to build in Amplify

**Error Details:**
- Build step failed after backend was successfully deployed
- Frontend code likely has issues with imports, dependencies, or configuration

**Root Cause:** The code generator creates a frontend with issues that prevent successful build

**Impact:** While backend deploys successfully, the app cannot be accessed because frontend build fails

## UPDATE: Issues Have Been Fixed!

**As of 2025-08-21, all critical issues have been fixed in the MCPs:**

### Fixed in amplify-gen-2-code-generator:
- ✅ Enum syntax generation (no more invalid `.required()` on enums)
- ✅ Relationship generation (automatic bidirectional relationships)
- ✅ User attributes validation (filters out invalid attributes like 'picture')

### Fixed in amplify-pipeline-mcp:
- ✅ Node version updated to 20
- ✅ Backend deployment check and auto-deploy
- ✅ GitHub Actions workflow uses proper AWS CLI commands

### See `/Users/kjetilge/mcp-servers/MCP_FIXES_SUMMARY.md` for full details

---

## Summary

### Success Rate:
- ✅ Backend deployment: **SUCCESSFUL** (after manual fixes)
- ❌ Frontend deployment: **FAILED** (app doesn't build)
- ⚠️ Overall: Backend works but app is not accessible

### Critical Issues That Required Manual Fixes:
1. Invalid enum syntax in data models
2. Missing hasMany relationships
3. Social login secrets configuration
4. Storage access definition conflicts
5. Package-lock.json inconsistencies

## Recommendations:

1. **Pipeline MCP should:**
   - **AUTOMATICALLY deploy the backend if it doesn't exist**
   - Check CloudFormation stack existence before setup
   - Create initial backend deployment as part of pipeline_deploy
   - Default to Node 20 in GitHub Actions
   - Not require manual backend deployment steps

2. **Code generator should:**
   - Run `npm install` to generate valid package-lock.json
   - Provide instructions for initial backend deployment
   - Include a "Deploy Backend" section in README

3. **Amplify configuration should:**
   - Default to Node 20 in build environment
   - Provide clearer error messages about missing stacks

4. **Documentation improvements:**
   - Emphasize backend deployment as prerequisite
   - Include troubleshooting for "Stack does not exist" error
   - Provide complete setup checklist
