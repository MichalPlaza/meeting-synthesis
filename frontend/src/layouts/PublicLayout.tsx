import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const userName = user?.full_name;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-[var(--radius-pill)] text-sm font-medium transition-colors",
      isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-muted/50"
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster
        position="bottom-right"
        offset="1.5rem"
        gap={16}
        richColors
        toastOptions={{
          style: {},
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
                {/* --- ZMIANA ZACZYNA SIĘ TUTAJ --- */}
                <div className="hidden md:flex items-center gap-2 mr-4">
                  <NavLink to="/meetings" className={navLinkClass}>
                    Meetings
                  </NavLink>
                  <NavLink to="/projects" className={navLinkClass}>
                    Projects
                  </NavLink>
                </div>
                <span className="hidden md:inline text-muted-foreground">
                  Hello, {userName || user?.username}
                </span>
                <Button variant="secondary" onClick={logout}>
                  Log Out
                </Button>
                {/* --- ZMIANA KOŃCZY SIĘ TUTAJ --- */}
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
