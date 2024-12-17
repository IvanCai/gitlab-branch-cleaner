import { getAllProjects, getHotfixBranches, deleteHotfixBranches } from './index';
import type { ProjectSchema } from '@gitbeaker/core';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
if (!process.env.GITLAB_TOKEN) {
  console.error('Error: GITLAB_TOKEN is required in environment variables');
  process.exit(1);
}

if (!process.env.GROUP_FILTER) {
  console.error('Error: GROUP_FILTER is required for testing');
  process.exit(1);
}

const groupFilter = process.env.GROUP_FILTER.split(',').map(g => g.trim().toLowerCase());

async function runTests() {
  console.log('Starting GitLab Branch Cleaner Tests\n');
  console.log(`Testing with group filter: ${groupFilter.join(', ')}`);

  // Test 1: Get all projects with group filter
  console.log('\nTest 1: Getting projects with group filter');
  const projects = await getAllProjects(true);
  console.log(`Found ${projects.length} projects in filtered groups`);
  
  if (projects.length === 0) {
    console.log(`No projects found in groups: ${groupFilter.join(', ')}`);
    return;
  }

  console.log('\nProjects found:');
  projects.forEach((project: ProjectSchema) => {
    const group = project.path_with_namespace?.split('/')[0] || 'unknown';
    console.log(`- ${project.path_with_namespace}`);
    console.log(`  ID: ${project.id}`);
    console.log(`  Group: ${group}`);
    console.log(`  Default branch: ${project.default_branch || 'none'}`);
  });

  // Test 2: Check for hotfix branches in each project
  console.log('\nTest 2: Checking for hotfix branches');
  let totalHotfixBranches = 0;
  for (const project of projects) {
    const branches = await getHotfixBranches(project.id);
    totalHotfixBranches += branches.length;
    if (branches.length > 0) {
      console.log(`\nProject: ${project.path_with_namespace}`);
      console.log('Hotfix branches found:');
      branches.forEach(branch => {
        console.log(`- ${branch.name}`);
      });
    }
  }

  // Test 3: Simulate branch cleanup (dry run)
  console.log('\nTest 3: Simulating branch cleanup (dry run)');
  const branchesToDelete = await deleteHotfixBranches(true);
  
  console.log('\nTest Summary:');
  console.log('=============');
  console.log(`Groups being filtered: ${groupFilter.join(', ')}`);
  console.log(`Total projects found: ${projects.length}`);
  console.log(`Total hotfix branches found: ${totalHotfixBranches}`);
  
  if (branchesToDelete.length > 0) {
    console.log('\nBranches that would be deleted:');
    const groupedBranches = branchesToDelete.reduce((acc, branch) => {
      if (!acc[branch.project]) {
        acc[branch.project] = [];
      }
      acc[branch.project].push(branch.name);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(groupedBranches).forEach(([project, branches]) => {
      console.log(`\nIn ${project}:`);
      branches.forEach(branch => console.log(`- ${branch}`));
    });
  } else {
    console.log('No hotfix branches found to delete.');
  }
}

// Run the tests
console.log('GitLab Branch Cleaner Test Mode');
console.log('==============================\n');

runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
