import { Navigate, Route, Routes } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PublicLayout from "./layouts/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectListPage from "./pages/ProjectListPage";
import { useAuth } from "./AuthContext";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import MeetingDetailsPage from "./pages/MeetingDetailsPage";
import MeetingsListPage from "./pages/MeetingsListPage";
import StyleGuidePage from "./pages/StyleGuidePage";

import log from "./services/logging";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import ProjectManagementPage from "./pages/admin/ProjectManagementPage";
import MeetingManagementPage from "./pages/admin/MeetingManagementPage";
import ManageDeveloperAccessPage from "@/pages/ManageAccessPage.tsx";

function App() {
  const { isAuthenticated } = useAuth();
  log.info("App component rendered");

  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/meetings" replace />
              ) : (
                <HomePage />
              )
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/style-guide" element={<StyleGuidePage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/meetings" element={<MeetingsListPage />} />
            <Route path="/projects" element={<ProjectListPage />} />
            <Route
              path="/manage-access"
              element={<ManageDeveloperAccessPage />}
            />
            <Route
              path="/projects/:projectId"
              element={<ProjectDetailsPage />}
            />
            <Route
              path="/meetings/:meetingId"
              element={<MeetingDetailsPage />}
            />
          </Route>
        </Route>

        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/projects" element={<ProjectManagementPage />} />
            <Route path="/admin/meetings" element={<MeetingManagementPage />} />
            <Route
              path="/admin"
              element={<Navigate to="/admin/dashboard" replace />}
            />
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <div className="text-center mt-10 text-xl">404 Not Found</div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
