export interface UserResponse {
  _id: string;
  username: string;
  full_name: string;
  email: string;
  role: "user" | "admin";
  created_at?: string;
  updated_at?: string;
}

export interface UserUpdate {
  username: string;
  full_name: string;
  email: string;
  role: "user" | "admin";
}
