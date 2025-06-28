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
      <Toaster richColors theme="light" position="top-center" />
      <header className="container mx-auto max-w-5xl p-4">
        <div className="flex justify-between items-center border-b border-border/50 pb-4">
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
                  <Link to="/about">About</Link>
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

      <main className="container mx-auto max-w-5xl p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
