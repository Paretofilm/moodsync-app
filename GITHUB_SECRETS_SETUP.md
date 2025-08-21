# GitHub Secrets Setup Guide

## Creating AWS Access Keys for GitHub Actions

Since you're using AWS SSO, you need to create programmatic access keys for GitHub Actions.

### Option 1: Create an IAM User (Recommended)

1. **Login to AWS Console** with your SSO account (376129887209 / develop.aws@fagfilm.no)

2. **Go to IAM**:
   - Navigate to IAM service
   - Click "Users" in the left sidebar
   - Click "Create user"

3. **Create a new user**:
   - Username: `github-actions-amplify`
   - Select "Programmatic access"

4. **Attach permissions**:
   - Attach these policies:
     - `AmplifyFullAccess`
     - Or create a custom policy with minimal permissions:
       ```json
       {
         "Version": "2012-10-17",
         "Statement": [
           {
             "Effect": "Allow",
             "Action": [
               "amplify:StartJob",
               "amplify:GetApp",
               "amplify:GetBranch",
               "amplify:ListJobs",
               "amplify:GetJob"
             ],
             "Resource": "arn:aws:amplify:eu-north-1:376129887209:apps/d32q73w0m2w4bq/*"
           }
         ]
       }
       ```

5. **Save the credentials**:
   - Access Key ID: `AKIA...`
   - Secret Access Key: `...` (shown only once!)

### Option 2: Use Temporary Credentials (Less Secure)

You can export your current SSO credentials temporarily:
```bash
aws configure export-credentials --profile aws-development
```

However, these expire and need regular renewal.

## Adding Secrets to GitHub

1. **Go to your repository**:
   https://github.com/Paretofilm/moodsync-app

2. **Navigate to Settings**:
   - Click "Settings" tab
   - Click "Secrets and variables" → "Actions"

3. **Add Repository Secrets**:
   
   Click "New repository secret" for each:

   - **Name**: `AWS_ACCESS_KEY_ID`
   - **Value**: Your AWS Access Key ID (starts with `AKIA...`)

   - **Name**: `AWS_SECRET_ACCESS_KEY`
   - **Value**: Your AWS Secret Access Key

## Testing the Setup

After adding the secrets, test by:

1. **Re-run the failed workflow**:
   ```bash
   gh workflow run amplify-pipeline-main.yml
   ```

2. **Or push a small change**:
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test GitHub Actions with AWS credentials"
   git push
   ```

## Current Status

- ✅ GitHub Actions workflow is correctly configured
- ✅ amplify.yml uses standard `npm ci` commands
- ❌ AWS credentials not yet in GitHub Secrets
- ❌ Amplify deployment blocked by missing credentials

Once you add the AWS credentials, the pipeline will:
1. Run on every push to main
2. Auto-fix linting and formatting issues
3. Trigger Amplify deployment
4. The app will be live at your Amplify URL