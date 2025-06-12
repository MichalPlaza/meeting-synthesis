import { useState, useEffect } from 'react';
import ProjectCard from '@/components/ProjectCard'; 
import AddProjectButton from '@/components/AddProjectButton'; 
import type { Project } from '@/types/project'; 
// import { useNavigate } from 'react-router-dom';

function ProjectListPage() {

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const navigate = useNavigate();

  const hardcodedProjects: Project[] = [
    {
      _id: "project-123",
      name: "Marketing Strategy Q3",
      description: "Planning and execution strategy for Q3 marketing campaigns.",
      owner_id: "user-owner-abc",
      members_ids: ["user-owner-abc", "user-member-xyz", "user-member-123"],
      created_at: "2023-10-26T10:00:00.000Z",
      updated_at: "2023-10-27T11:00:00.000Z",
    },
    {
      _id: "project-456",
      name: "Product Development Sprint 5",
      description: "Focusing on new feature implementation and bug fixing for the next release.",
      owner_id: "user-owner-def",
      members_ids: ["user-owner-def", "user-member-abc"],
      created_at: "2023-10-20T09:00:00.000Z",
      updated_at: "2023-10-27T12:30:00.000Z",
    },
     {
      _id: "project-789",
      name: "Internal Tools Improvement",
      description: "Enhancing internal software tools for better team productivity.",
      owner_id: "user-owner-abc", // Ví dụ cùng owner với project 1
      members_ids: ["user-owner-abc", "user-member-456"],
      created_at: "2023-11-01T09:30:00.000Z",
      updated_at: "2023-11-03T15:00:00.000Z",
    }
  ];

  useEffect(() => {
    // const fetchProjects = async () => { ... }
    // fetchProjects();

    setProjects(hardcodedProjects);
  }, []); 

  return (
    <div className="relative">
      <h2 className="text-3xl font-bold mb-6">My Projects</h2>

      <div className="mb-6">
         <AddProjectButton />
      </div>

      {loading && <p className="text-center">Đang tải danh sách project...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && !error && (
        <>
          {projects.length === 0 ? (
            <p className="text-center text-gray-600">Chưa có project nào. Nhấn nút 'Add New Project' để bắt đầu!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> 
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProjectListPage;