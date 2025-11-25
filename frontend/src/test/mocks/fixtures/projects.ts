import type { Project, ProjectResponse } from "@/types/project";

export const mockProject: ProjectResponse = {
  _id: "project-001",
  name: "Test Project",
  description: "A test project for unit testing",
  owner: {
    _id: "user-pm-001",
    username: "pmuser",
  },
  members: [
    { _id: "user-pm-001", username: "pmuser" },
    { _id: "user-dev-001", username: "devuser" },
  ],
  created_at: "2024-01-10T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
};

export const mockProject2: ProjectResponse = {
  _id: "project-002",
  name: "Another Project",
  description: "Another test project",
  owner: {
    _id: "user-pm-001",
    username: "pmuser",
  },
  members: [
    { _id: "user-pm-001", username: "pmuser" },
    { _id: "user-sm-001", username: "smuser" },
  ],
  created_at: "2024-01-15T00:00:00Z",
  updated_at: "2024-01-15T00:00:00Z",
};

export const mockProjects: ProjectResponse[] = [mockProject, mockProject2];

export const mockProjectRaw: Project = {
  _id: "project-001",
  name: "Test Project",
  description: "A test project for unit testing",
  owner_id: "user-pm-001",
  members_ids: ["user-pm-001", "user-dev-001"],
  created_at: "2024-01-10T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
};
