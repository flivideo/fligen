// Project file system operations for FR-13

import { promises as fs } from 'fs';
import path from 'path';
import type {
  ProjectMetadata,
  HumanPrompts,
  SourceTranscripts,
  ProjectData,
} from './types.js';
import type { ProjectListItem } from './types.js';

const ASSETS_DIR = path.resolve(process.cwd(), '..', 'assets');
const PROJECTS_DIR = path.join(ASSETS_DIR, 'projects');

/**
 * Ensure the projects directory exists
 */
async function ensureProjectsDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
}

/**
 * Ensure a specific project directory exists
 */
async function ensureProjectDir(projectCode: string): Promise<string> {
  await ensureProjectsDir();
  const projectDir = path.join(PROJECTS_DIR, projectCode);
  await fs.mkdir(projectDir, { recursive: true });
  return projectDir;
}

/**
 * Validate project code (no spaces, valid filename characters)
 */
function validateProjectCode(projectCode: string): { valid: boolean; error?: string } {
  if (!projectCode || projectCode.trim().length === 0) {
    return { valid: false, error: 'Project code is required' };
  }

  if (projectCode !== projectCode.trim()) {
    return { valid: false, error: 'Project code cannot have leading or trailing spaces' };
  }

  if (projectCode.includes(' ')) {
    return { valid: false, error: 'Project code cannot contain spaces' };
  }

  // Check for invalid filename characters
  const invalidChars = /[<>:"|?*\/\\]/;
  if (invalidChars.test(projectCode)) {
    return { valid: false, error: 'Project code contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Check if a project exists
 */
export async function projectExists(projectCode: string): Promise<boolean> {
  try {
    const projectDir = path.join(PROJECTS_DIR, projectCode);
    const projectFile = path.join(projectDir, 'project.json');
    await fs.access(projectFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save a complete project with all JSON files
 */
export async function saveProject(data: ProjectData): Promise<{ success: boolean; error?: string }> {
  try {
    const { projectCode } = data.metadata;

    // Validate project code
    const validation = validateProjectCode(projectCode);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    console.log(`[Projects] Saving project: ${projectCode}`);

    // Create project directory
    const projectDir = await ensureProjectDir(projectCode);

    // Write project.json
    const projectFile = path.join(projectDir, 'project.json');
    await fs.writeFile(projectFile, JSON.stringify(data.metadata, null, 2));
    console.log(`[Projects] Wrote ${projectFile}`);

    // Write human_prompts.json
    const promptsFile = path.join(projectDir, 'human_prompts.json');
    await fs.writeFile(promptsFile, JSON.stringify(data.humanPrompts, null, 2));
    console.log(`[Projects] Wrote ${promptsFile}`);

    // Write source_transcripts.json (if provided)
    if (data.sourceTranscripts) {
      const transcriptsFile = path.join(projectDir, 'source_transcripts.json');
      await fs.writeFile(transcriptsFile, JSON.stringify(data.sourceTranscripts, null, 2));
      console.log(`[Projects] Wrote ${transcriptsFile}`);
    }

    console.log(`[Projects] Successfully saved project: ${projectCode}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Projects] Error saving project:`, error);
    return { success: false, error: `Failed to save project: ${message}` };
  }
}

/**
 * Load a project by project code
 */
export async function loadProject(projectCode: string): Promise<ProjectData | null> {
  try {
    console.log(`[Projects] Loading project: ${projectCode}`);

    const projectDir = path.join(PROJECTS_DIR, projectCode);

    // Read project.json
    const projectFile = path.join(projectDir, 'project.json');
    const projectData = await fs.readFile(projectFile, 'utf-8');
    const metadata = JSON.parse(projectData) as ProjectMetadata;

    // Read human_prompts.json
    const promptsFile = path.join(projectDir, 'human_prompts.json');
    const promptsData = await fs.readFile(promptsFile, 'utf-8');
    const humanPrompts = JSON.parse(promptsData) as HumanPrompts;

    // Try to read source_transcripts.json (optional)
    let sourceTranscripts: SourceTranscripts | undefined;
    try {
      const transcriptsFile = path.join(projectDir, 'source_transcripts.json');
      const transcriptsData = await fs.readFile(transcriptsFile, 'utf-8');
      sourceTranscripts = JSON.parse(transcriptsData) as SourceTranscripts;
    } catch {
      // Optional file, ignore if missing
    }

    console.log(`[Projects] Successfully loaded project: ${projectCode}`);

    return {
      metadata,
      humanPrompts,
      sourceTranscripts,
    };
  } catch (error) {
    console.error(`[Projects] Error loading project ${projectCode}:`, error);
    return null;
  }
}

/**
 * List all projects
 */
export async function listProjects(): Promise<ProjectListItem[]> {
  try {
    await ensureProjectsDir();

    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects: ProjectListItem[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectCode = entry.name;
        const projectData = await loadProject(projectCode);

        if (projectData) {
          projects.push({
            projectCode,
            createdAt: projectData.metadata.createdAt,
            updatedAt: projectData.metadata.updatedAt,
          });
        }
      }
    }

    // Sort by updatedAt descending (most recent first)
    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`[Projects] Found ${projects.length} projects`);
    return projects;
  } catch (error) {
    console.error('[Projects] Error listing projects:', error);
    return [];
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectCode: string): Promise<boolean> {
  try {
    console.log(`[Projects] Deleting project: ${projectCode}`);

    const projectDir = path.join(PROJECTS_DIR, projectCode);

    // Remove all files in the project directory
    const files = await fs.readdir(projectDir);
    for (const file of files) {
      await fs.unlink(path.join(projectDir, file));
    }

    // Remove the directory
    await fs.rmdir(projectDir);

    console.log(`[Projects] Deleted project: ${projectCode}`);
    return true;
  } catch (error) {
    console.error(`[Projects] Error deleting project ${projectCode}:`, error);
    return false;
  }
}
