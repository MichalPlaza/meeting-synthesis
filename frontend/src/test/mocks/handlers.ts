import { http, HttpResponse, delay } from "msw";
import {
  mockAdminUser,
  mockDeveloper,
  mockUsers,
  mockManagers,
  mockAuthResponse,
  mockRefreshResponse,
  mockProjects,
  mockProject,
  mockMeetings,
  mockMeeting,
  mockConversations,
  mockConversation,
  mockChatMessages,
  mockChatResponse,
} from "./fixtures";

const API_BASE = "http://localhost:8000";

export const handlers = [
  // ==================== AUTH HANDLERS ====================
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.formData()) as FormData;
    const username = body.get("username");
    const password = body.get("password");

    // Simulate invalid credentials
    if (username === "invalid" || password === "wrong") {
      return HttpResponse.json(
        { detail: "Invalid credentials" },
        { status: 401 }
      );
    }

    return HttpResponse.json(mockAuthResponse);
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json();

    // Simulate email already exists
    if (body && typeof body === "object" && "email" in body && body.email === "existing@example.com") {
      return HttpResponse.json(
        { detail: "Email already registered" },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  }),

  http.post(`${API_BASE}/auth/refresh-token`, () => {
    return HttpResponse.json(mockRefreshResponse);
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ message: "Logged out successfully" });
  }),

  // ==================== USER HANDLERS ====================
  http.get(`${API_BASE}/users/me`, () => {
    return HttpResponse.json(mockDeveloper);
  }),

  http.get(`${API_BASE}/users`, () => {
    return HttpResponse.json(mockUsers);
  }),

  http.get(`${API_BASE}/users/managers`, () => {
    return HttpResponse.json(mockManagers);
  }),

  http.get(`${API_BASE}/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u._id === params.id);
    if (!user) {
      return HttpResponse.json({ detail: "User not found" }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  http.patch(`${API_BASE}/users/:id`, async ({ params, request }) => {
    const user = mockUsers.find((u) => u._id === params.id);
    if (!user) {
      return HttpResponse.json({ detail: "User not found" }, { status: 404 });
    }
    const updates = await request.json();
    return HttpResponse.json({ ...user, ...updates });
  }),

  http.delete(`${API_BASE}/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u._id === params.id);
    if (!user) {
      return HttpResponse.json({ detail: "User not found" }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // ==================== PROJECT HANDLERS ====================
  http.get(`${API_BASE}/project`, () => {
    return HttpResponse.json(mockProjects);
  }),

  http.get(`${API_BASE}/project/:id`, ({ params }) => {
    const project = mockProjects.find((p) => p._id === params.id);
    if (!project) {
      return HttpResponse.json({ detail: "Project not found" }, { status: 404 });
    }
    return HttpResponse.json(project);
  }),

  http.post(`${API_BASE}/project`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { ...mockProject, ...(body as object), _id: `project-${Date.now()}` },
      { status: 201 }
    );
  }),

  http.patch(`${API_BASE}/project/:id`, async ({ params, request }) => {
    const project = mockProjects.find((p) => p._id === params.id);
    if (!project) {
      return HttpResponse.json({ detail: "Project not found" }, { status: 404 });
    }
    const updates = await request.json();
    return HttpResponse.json({ ...project, ...updates });
  }),

  http.delete(`${API_BASE}/project/:id`, ({ params }) => {
    const project = mockProjects.find((p) => p._id === params.id);
    if (!project) {
      return HttpResponse.json({ detail: "Project not found" }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // ==================== MEETING HANDLERS ====================
  http.get(`${API_BASE}/meetings`, ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");

    let meetings = mockMeetings;
    if (projectId) {
      meetings = mockMeetings.filter((m) => m.project._id === projectId);
    }

    return HttpResponse.json(meetings);
  }),

  http.get(`${API_BASE}/meetings/:id`, ({ params }) => {
    const meeting = mockMeetings.find((m) => m._id === params.id);
    if (!meeting) {
      return HttpResponse.json({ detail: "Meeting not found" }, { status: 404 });
    }
    return HttpResponse.json(meeting);
  }),

  http.post(`${API_BASE}/meetings`, async ({ request }) => {
    await delay(100); // Simulate upload delay
    return HttpResponse.json(
      { ...mockMeeting, _id: `meeting-${Date.now()}` },
      { status: 201 }
    );
  }),

  http.patch(`${API_BASE}/meetings/:id`, async ({ params, request }) => {
    const meeting = mockMeetings.find((m) => m._id === params.id);
    if (!meeting) {
      return HttpResponse.json({ detail: "Meeting not found" }, { status: 404 });
    }
    const updates = await request.json();
    return HttpResponse.json({ ...meeting, ...updates });
  }),

  http.delete(`${API_BASE}/meetings/:id`, ({ params }) => {
    const meeting = mockMeetings.find((m) => m._id === params.id);
    if (!meeting) {
      return HttpResponse.json({ detail: "Meeting not found" }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Meeting comments
  http.get(`${API_BASE}/meetings/:id/comments`, () => {
    return HttpResponse.json([
      {
        _id: "comment-001",
        meeting_id: "meeting-001",
        user_id: "user-dev-001",
        content: "Great meeting notes!",
        created_at: "2024-01-20T12:00:00Z",
        updated_at: "2024-01-20T12:00:00Z",
      },
    ]);
  }),

  http.post(`${API_BASE}/meetings/:id/comments`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        _id: `comment-${Date.now()}`,
        ...(body as object),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  http.patch(`${API_BASE}/meetings/:meetingId/comments/:commentId`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      _id: "comment-001",
      ...(body as object),
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete(`${API_BASE}/meetings/:meetingId/comments/:commentId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Meeting history
  http.get(`${API_BASE}/meetings/:id/history`, () => {
    return HttpResponse.json([
      {
        _id: "history-001",
        meeting_id: "meeting-001",
        version: 1,
        changed_by: "user-dev-001",
        changes: { title: { old: "Old Title", new: "Sprint Planning Meeting" } },
        created_at: "2024-01-20T11:00:00Z",
      },
    ]);
  }),

  // ==================== KNOWLEDGE BASE HANDLERS ====================
  http.get(`${API_BASE}/knowledge-base/conversations`, () => {
    return HttpResponse.json(mockConversations);
  }),

  http.get(`${API_BASE}/knowledge-base/conversations/:id`, ({ params }) => {
    const conversation = mockConversations.find((c) => c.id === params.id);
    if (!conversation) {
      return HttpResponse.json(
        { detail: "Conversation not found" },
        { status: 404 }
      );
    }
    return HttpResponse.json(conversation);
  }),

  http.get(`${API_BASE}/knowledge-base/conversations/:id/messages`, () => {
    return HttpResponse.json(mockChatMessages);
  }),

  http.post(`${API_BASE}/knowledge-base/conversations`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        ...mockConversation,
        ...(body as object),
        id: `conv-${Date.now()}`,
      },
      { status: 201 }
    );
  }),

  http.post(`${API_BASE}/knowledge-base/chat`, async ({ request }) => {
    const body = await request.json();
    const requestBody = body as { stream?: boolean };

    // Handle streaming response
    if (requestBody.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunks = [
            "Based on ",
            "the sprint ",
            "planning meeting, ",
            "the main decisions were ",
            "to use JWT for authentication.",
          ];

          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
              );
              if (index === chunks.length - 1) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              }
            }, index * 50);
          });
        },
      });

      return new HttpResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return HttpResponse.json(mockChatResponse);
  }),

  http.delete(`${API_BASE}/knowledge-base/conversations/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/knowledge-base/meetings/:id/reindex`, () => {
    return HttpResponse.json({ message: "Meeting reindexed successfully" });
  }),

  // ==================== ADMIN HANDLERS ====================
  http.get(`${API_BASE}/admin/stats`, () => {
    return HttpResponse.json({
      total_users: 10,
      total_meetings: 25,
      total_projects: 5,
      meetings_this_week: 8,
      meetings_this_month: 20,
      processing_time_avg: 45.5,
      active_users_today: 4,
    });
  }),

  http.get(`${API_BASE}/admin/activity`, () => {
    return HttpResponse.json([
      {
        date: "2024-01-20",
        meetings_uploaded: 5,
        users_active: 3,
      },
      {
        date: "2024-01-21",
        meetings_uploaded: 3,
        users_active: 4,
      },
    ]);
  }),
];

// Error handlers for testing error states
export const errorHandlers = {
  networkError: http.get(`${API_BASE}/meetings/:id`, () => {
    return HttpResponse.error();
  }),

  serverError: http.get(`${API_BASE}/meetings/:id`, () => {
    return HttpResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }),

  unauthorized: http.get(`${API_BASE}/users/me`, () => {
    return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }),

  notFound: http.get(`${API_BASE}/meetings/:id`, () => {
    return HttpResponse.json({ detail: "Meeting not found" }, { status: 404 });
  }),
};
