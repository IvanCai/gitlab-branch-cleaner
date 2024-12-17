import { Gitlab } from '@gitbeaker/node';
import type { ProjectSchema } from '@gitbeaker/core';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GITLAB_TOKEN) {
  console.error('GITLAB_TOKEN is required in environment variables');
  process.exit(1);
}

const gitlab = new Gitlab({
  token: process.env.GITLAB_TOKEN,
  host: process.env.GITLAB_URL || 'https://gitlab.com'
});

// Parse group filter from environment variable
const groupFilter = process.env.GROUP_FILTER ? 
  process.env.GROUP_FILTER.split(',').map(g => g.trim().toLowerCase()) : 
  [];

interface BranchInfo {
  name: string;
  project: string;
}

export async function getAllProjects(dryRun = false): Promise<any[]> {
  try {
    // Get all projects the user has access to
    const projects = await gitlab.Projects.all({
      membership: true,
      perPage: 100
    });

    // If group filter is set, filter projects by group name
    if (groupFilter.length > 0) {
      if (dryRun) console.log(`Filtering projects for groups: ${groupFilter.join(', ')}`);
      return projects.filter(project => {
        const projectGroup = project.path_with_namespace?.split('/')[0].toLowerCase();
        return groupFilter.includes(projectGroup);
      });
    }

    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export async function getHotfixBranches(projectId: number | string): Promise<BranchInfo[]> {
  try {
    const project = await gitlab.Projects.show(projectId);
    const branches = await gitlab.Branches.all(project.id);
    
    return branches
      .filter(branch => branch.name.toLowerCase().startsWith('hotfix/'))
      .map(branch => ({
        name: branch.name,
        project: project.path_with_namespace || ''
      }));
  } catch (error) {
    console.error(`Error getting branches for project ${projectId}:`, error);
    return [];
  }
}

export async function cleanHotfixBranchesForProject(projectId: number | string, dryRun = false): Promise<BranchInfo[]> {
  try {
    const project = await gitlab.Projects.show(projectId);
    if (dryRun) console.log(`\nScanning project: ${project.path_with_namespace}`);
    
    const hotfixBranches = await getHotfixBranches(projectId);

    if (hotfixBranches.length === 0) {
      if (dryRun) console.log(`No hotfix branches found in ${project.path_with_namespace}`);
      return [];
    }

    if (dryRun) {
      console.log(`Found ${hotfixBranches.length} hotfix branches in ${project.path_with_namespace}`);
      return hotfixBranches;
    }

    // Delete each hotfix branch
    const deletedBranches: BranchInfo[] = [];
    for (const branch of hotfixBranches) {
      try {
        await gitlab.Branches.remove(project.id, branch.name);
        console.log(`Successfully deleted branch: ${branch.name} from ${project.path_with_namespace}`);
        deletedBranches.push(branch);
      } catch (error) {
        console.error(`Failed to delete branch ${branch.name} from ${project.path_with_namespace}:`, error);
      }
    }
    return deletedBranches;
  } catch (error) {
    console.error(`Error processing project ${projectId}:`, error);
    return [];
  }
}

export async function deleteHotfixBranches(dryRun = false): Promise<BranchInfo[]> {
  try {
    // If TEST_PROJECT_ID is set, only clean that specific project
    if (process.env.TEST_PROJECT_ID) {
      console.log(`Testing cleanup for specific project ID: ${process.env.TEST_PROJECT_ID}`);
      return await cleanHotfixBranchesForProject(process.env.TEST_PROJECT_ID, dryRun);
    }

    console.log('Starting hotfix branch cleanup across all projects...');
    if (groupFilter.length > 0) {
      console.log(`Filtering projects for groups: ${groupFilter.join(', ')}`);
    }
    
    const projects = await getAllProjects(dryRun);
    console.log(`Found ${projects.length} projects to scan`);

    const allBranches: BranchInfo[] = [];
    for (const project of projects) {
      const branches = await cleanHotfixBranchesForProject(project.id, dryRun);
      allBranches.push(...branches);
    }
    
    console.log('\nHotfix branch cleanup completed');
    return allBranches;
  } catch (error) {
    console.error('Error in deleteHotfixBranches:', error);
    return [];
  }
}

// Only run the scheduler if this file is being run directly
if (require.main === module) {
  // Schedule the job to run at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled hotfix branch cleanup...');
    deleteHotfixBranches();
  });

  // Main startup message
  if (process.env.TEST_PROJECT_ID) {
    console.log(`GitLab branch cleaner started in TEST mode for project ID: ${process.env.TEST_PROJECT_ID}`);
  } else {
    console.log('GitLab branch cleaner started. Waiting for midnight to clean hotfix branches across all projects...');
    if (groupFilter.length > 0) {
      console.log(`Group filter active for: ${groupFilter.join(', ')}`);
    }
  }

  // Run immediately if TEST_RUN is set to true
  if (process.env.TEST_RUN === 'true') {
    console.log('Running test cleanup...');
    deleteHotfixBranches();
  }
}
