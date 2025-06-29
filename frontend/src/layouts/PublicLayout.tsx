import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const userName = user?.full_name;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster
        position="bottom-right"
        offset={24}
        gap={16}
        richColors
        toastOptions={{
          style: {
            // Styl inline pozostaje pusty
          },
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
          <Link to="/" className="text-xl font-bold text-foreground">
            Meeting Synthesis
          </Link>
          <nav className="flex items-center space-x-2 md:space-x-4">
            {isAuthenticated ? (
              <>
                <Link to="/projects">
                  <Button variant="ghost">My Projects</Button>
                </Link>
                <span className="hidden md:inline text-muted-foreground">
                  Hello, {userName || user?.username}
                </span>
                <Button variant="secondary" onClick={logout}>
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
                  <Link to="/#features">Features</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden md:inline-flex"
                >
                  <Link to="/contact">Contact</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden md:inline-flex"
                >
                  <Link to="/contact">Contact</Link>
                </Button>
                <Link to="/login">
                  <Button variant="secondary" size="sm">
                    Log in
                  </Button>
                </Link>
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
