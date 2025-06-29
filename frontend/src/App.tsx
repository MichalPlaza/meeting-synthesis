import { Navigate, Route, Routes } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PublicLayout from "./layouts/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectListPage from "./pages/ProjectListPage";
import { useAuth } from "./AuthContext";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import MeetingDetailsPage from "./pages/MeetingDetailsPage";
import MeetingsListPage from "./pages/MeetingsListPage"; // <-- IMPORT
import StyleGuidePage from "./pages/StyleGuidePage";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/meetings" replace /> // <-- ZMIANA: Przekierowanie na /meetings
              ) : (
                <HomePage />
              )
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/style-guide" element={<StyleGuidePage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/meetings" element={<MeetingsListPage />} />{" "}
            {/* <-- NOWA STRONA */}
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
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
