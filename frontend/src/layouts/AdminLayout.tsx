// src/layouts/AdminLayout.tsx

import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  LogOut,
  LayoutDashboard,
  Users,
  FolderKanban,
  BookUser,
} from "lucide-react";

function AdminLayout() {
  const { user, logout } = useAuth();
  const userName = user?.full_name;

  const sidebarNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
      isActive && "bg-muted text-primary"
    );

  return (
    <div className="grid h-screen w-full grid-rows-[auto_1fr] md:grid-cols-[220px_1fr] lg:grid-cols-[200px_1fr]">
      <div className="flex h-14 items-center border-b border-r bg-muted/40 px-4 lg:h-[60px] lg:px-6">
        <NavLink
          to="/admin"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <LayoutDashboard className="h-6 w-6" />
          <span>Admin Panel</span>
        </NavLink>
      </div>

      <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
        <div className="w-full flex-1"></div>
        <span className="text-sm text-muted-foreground hidden md:inline">
          Hello, {userName || user?.username}
        </span>
        <Button variant="secondary" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>
        <ThemeToggle />
      </header>

      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex-1 py-4">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <NavLink to="/admin/dashboard" className={sidebarNavLinkClass}>
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </NavLink>
            <NavLink to="/admin/users" className={sidebarNavLinkClass}>
              <Users className="h-4 w-4" />
              Users
            </NavLink>
            <NavLink to="/admin/projects" className={sidebarNavLinkClass}>
              <FolderKanban className="h-4 w-4" />
              Projects
            </NavLink>
            <NavLink to="/admin/meetings" className={sidebarNavLinkClass}>
              <BookUser className="h-4 w-4" />
              Meetings
            </NavLink>
          </nav>
        </div>
      </div>

      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto bg-background">
        <Outlet />
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default AdminLayout;
