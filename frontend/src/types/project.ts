export interface Project {
  _id: string;
  name: string;
  description: string;
  owner_id: string;
  members_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  _id: string;
  username: string;
}

export interface ProjectResponse {
  _id: string;
  name: string;
  description: string;
  owner: ProjectMember;
  members: ProjectMember[];
  created_at: string;
  updated_at: string;
}

export type ProjectUpdate = Partial<Project>;
