# GitLab Branch Cleaner

This application automatically scans all GitLab projects you have access to and deletes branches with a 'hotfix/' prefix at midnight.

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Configure your `.env` file with:
- GITLAB_TOKEN: Your GitLab personal access token
- GITLAB_URL: Your GitLab instance URL (default: https://gitlab.com)
- TEST_RUN: Set to 'true' to run the cleanup immediately when starting the application
- TEST_PROJECT_ID: (Optional) Specify a single project ID to test the cleanup functionality
- GROUP_FILTER: (Optional) Comma-separated list of group names to filter projects (e.g., "group1,group2")

## Running the Application

Development mode:
```bash
yarn dev
```

Production mode:
```bash
yarn build
yarn start
```

Clean build files:
```bash
yarn clean
```

## Test Modes

The application supports two test modes:

1. **Immediate Execution Mode**
   - Set `TEST_RUN=true` in `.env`
   - This will run the cleanup process immediately when starting the application
   - Will clean all projects unless TEST_PROJECT_ID is set

2. **Single Project Test Mode**
   - Set `TEST_PROJECT_ID=your_project_id` in `.env`
   - This will only clean the specified project
   - Can be combined with TEST_RUN=true for immediate execution

## Group Filtering

You can limit the scope of the branch cleanup to specific GitLab groups:

1. Set `GROUP_FILTER` in your `.env` file with a comma-separated list of group names:
   ```
   GROUP_FILTER=group1,group2,group3
   ```

2. The script will only process projects that belong to the specified groups
3. Group names are case-insensitive
4. If GROUP_FILTER is not set, all accessible projects will be processed

## Features

- Automatically scans all GitLab projects you have access to
- Filters projects by group name
- Deletes branches prefixed with 'hotfix/' at midnight
- Detailed logging of all actions and errors
- Test mode for immediate execution
- Single project test mode for verification
- Uses GitLab API v4
- Configurable through environment variables

## Requirements

- Node.js 14+
- Yarn package manager
- GitLab Personal Access Token with api scope (needs access to read/write repository)
