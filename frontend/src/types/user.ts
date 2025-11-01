export interface UserResponse {
  _id: string;
  username: string;
  full_name: string;
  email: string;
  role: "admin" | "project_manager" | "scrum_master" | "developer";
  manager_id: string | null;
  is_approved: boolean;
  can_edit: boolean;
}
