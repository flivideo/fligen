// Project storage types for FR-13

import type {
  ProjectMetadata,
  HumanPrompts,
  SourceTranscripts,
  ProjectData,
} from '@fligen/shared';

export type { ProjectMetadata, HumanPrompts, SourceTranscripts, ProjectData };

export interface ProjectListItem {
  projectCode: string;
  createdAt: string;
  updatedAt: string;
}
