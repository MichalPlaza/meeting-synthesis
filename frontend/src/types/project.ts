export interface Project {
  _id: string;
  name: string;
  description: string;
  owner_id: string; 
  members_ids: string[]; 
  created_at: string;
  updated_at: string; 
}