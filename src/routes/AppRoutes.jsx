
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";

import Login from "../pages/login";
import Register from "../pages/register";
import Notes from "../pages/Notes";
import Applications from "../pages/Applications";
import Dashboard from "../pages/Dashboard";
import Analytics from "../pages/Analytics";
import Navbar from "../components/Navbar";
import ProtectedRoute from "../ProtectedRoute";
import InterviewPreparation from "../pages/InterviewPreparation";

function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected pages */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/analytics"
              element={<Analytics />}
            />

            <Route
              path="/applications"
              element={<Applications />}
            />

            <Route
              path="/notes"
              element={<Notes />}
            />

            <Route
              path="/applications/:applicationId/preparation"
              element={<InterviewPreparation />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
