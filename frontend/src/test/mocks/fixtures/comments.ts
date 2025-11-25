// Mock comments data for testing

interface Comment {
  _id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

// Comments authored by the developer user (user-dev-001)
export const mockComments: Comment[] = [
  {
    _id: "comment-001",
    author_id: "user-dev-001", // Same as mockDeveloper._id
    author_name: "Developer User",
    content: "This meeting was very productive. Great discussion about the new feature.",
    created_at: "2024-01-15T10:30:00Z",
  },
  {
    _id: "comment-002",
    author_id: "user-pm-001",
    author_name: "Project Manager",
    content: "I agree with the proposed timeline. Let's schedule a follow-up next week.",
    created_at: "2024-01-15T11:00:00Z",
  },
  {
    _id: "comment-003",
    author_id: "user-dev-001",
    author_name: "Developer User",
    content: "I'll start working on the implementation today.",
    created_at: "2024-01-15T11:30:00Z",
  },
];

export const mockEmptyComments: Comment[] = [];

export const mockSingleComment: Comment = {
  _id: "comment-single",
  author_id: "user-dev-001",
  author_name: "Developer User",
  content: "A single comment for testing.",
  created_at: new Date().toISOString(),
};
