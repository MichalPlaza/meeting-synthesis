import type { UserResponse } from "@/types/user";

export const mockAdminUser: UserResponse = {
  _id: "user-admin-001",
  username: "admin",
  full_name: "Admin User",
  email: "admin@example.com",
  role: "admin",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockProjectManager: UserResponse = {
  _id: "user-pm-001",
  username: "pmuser",
  full_name: "Project Manager",
  email: "pm@example.com",
  role: "project_manager",
  created_at: "2024-01-02T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

export const mockScrumMaster: UserResponse = {
  _id: "user-sm-001",
  username: "smuser",
  full_name: "Scrum Master",
  email: "sm@example.com",
  role: "scrum_master",
  created_at: "2024-01-03T00:00:00Z",
  updated_at: "2024-01-03T00:00:00Z",
};

export const mockDeveloper: UserResponse = {
  _id: "user-dev-001",
  username: "devuser",
  full_name: "Developer User",
  email: "dev@example.com",
  role: "developer",
  created_at: "2024-01-04T00:00:00Z",
  updated_at: "2024-01-04T00:00:00Z",
};

export const mockUsers: UserResponse[] = [
  mockAdminUser,
  mockProjectManager,
  mockScrumMaster,
  mockDeveloper,
];

export const mockManagers = [
  { _id: mockProjectManager._id, full_name: mockProjectManager.full_name },
  { _id: mockScrumMaster._id, full_name: mockScrumMaster.full_name },
];

export const mockAuthResponse = {
  access_token: "mock-access-token-12345",
  token_type: "bearer",
};

export const mockRefreshResponse = {
  access_token: "mock-refreshed-token-67890",
  token_type: "bearer",
};
