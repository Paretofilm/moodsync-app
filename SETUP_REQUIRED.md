# Setup Required - MoodSync App

## GitHub Secrets Configuration Needed

To complete the CI/CD pipeline setup, you need to add AWS credentials to your GitHub repository:

### Steps:

1. **Go to your GitHub repository**:
   https://github.com/Paretofilm/moodsync-app

2. **Navigate to Settings**:
   - Click on "Settings" tab
   - In the left sidebar, click "Secrets and variables"
   - Click "Actions"

3. **Add the following secrets**:
   - Click "New repository secret"
   - Add `AWS_ACCESS_KEY_ID` with your AWS Access Key ID
   - Add `AWS_SECRET_ACCESS_KEY` with your AWS Secret Access Key

### Getting AWS Credentials:

If you don't have AWS credentials:

1. Go to AWS Console > IAM
2. Create a new IAM user or use existing one
3. Ensure the user has permissions for Amplify
4. Generate access keys

### Required Permissions:

The IAM user needs at least:

- AmplifyFullAccess (or more restrictive custom policy)
- Ability to trigger Amplify builds

## Current Status:

✅ Code is ready and pushed to GitHub
✅ GitHub Actions workflow is configured correctly
✅ Amplify app is created (ID: d32q73w0m2w4bq)
❌ AWS credentials missing in GitHub Secrets
❌ Amplify deployment not triggered due to missing credentials

## Next Steps:

1. Add the AWS credentials to GitHub Secrets
2. Re-run the failed workflow:

   ```bash
   gh run rerun 17137355120
   ```

   Or push any small change to trigger a new run

3. The workflow will then:
   - Install dependencies
   - Run auto-fixes if needed
   - Trigger the Amplify deployment

## Manual Amplify Deployment (Alternative):

If you prefer to deploy manually while we fix the CI/CD:

```bash
# In the project directory
npm install
npx ampx generate outputs --branch main --app-id d32q73w0m2w4bq
```

Then commit and push the `amplify_outputs.json` file.
