import { NavLink, Outlet } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const userName = user?.full_name;

  const navLinkButtonClass = () =>
    cn(
      buttonVariants({ variant: "secondary", size: "sm" }),
      "bg-transparent shadow-none",
      "hover:bg-secondary hover:text-secondary-foreground",
      "cursor-pointer"
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster
        position="bottom-right"
        offset="1.5rem"
        gap={16}
        richColors
        toastOptions={{
          classNames: {
            toast:
              "bg-card text-card-foreground border rounded-[var(--radius-container)] shadow-lg",
            title: "text-base font-semibold",
            description: "text-muted-foreground",
            actionButton: "bg-primary text-primary-foreground",
            cancelButton: "bg-secondary text-secondary-foreground",
            success: "!border-success/50 [&>div>svg]:text-success",
            error: "!border-destructive/50 [&>div>svg]:text-destructive",
            warning: "!border-warning/50 [&>div>svg]:text-warning",
            info: "!border-info/50 [&>div>svg]:text-info",
          },
        }}
      />
      <header className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center border-b border-border/50 py-4">
          <NavLink to="/" className="text-xl font-bold text-foreground">
            Meeting Synthesis
          </NavLink>
          <nav className="flex items-center space-x-2 md:space-x-4">
            {isAuthenticated ? (
              <>
                <span className="hidden md:inline text-muted-foreground">
                  Hello, {userName || user?.username}
                </span>
                <div className="hidden md:flex items-center gap-2 mr-4">
                  <NavLink to="/meetings" className={navLinkButtonClass()} end>
                    Meetings
                  </NavLink>
                  <NavLink to="/projects" className={navLinkButtonClass()} end>
                    Projects
                  </NavLink>
                  <NavLink
                    to="/knowledge-base"
                    className={navLinkButtonClass()}
                    end
                  >
                    Knowledge Base
                  </NavLink>
                  {user?.role === "project_manager" && (
                    <NavLink
                      to="/manage-access"
                      className={navLinkButtonClass()}
                      end
                    >
                      Manage Access
                    </NavLink>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={logout}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden md:inline-flex"
                >
                  <NavLink to="/#features">Features</NavLink>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden md:inline-flex"
                >
                  <NavLink to="/about">About</NavLink>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden md:inline-flex"
                >
                  <NavLink to="/contact">Contact</NavLink>
                </Button>
                <NavLink to="/login">
                  <Button variant="secondary" size="sm">
                    Log in
                  </Button>
                </NavLink>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
