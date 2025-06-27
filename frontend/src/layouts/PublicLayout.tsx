import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";
import { Toaster } from "sonner";

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
          <nav className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link to="/projects">
                  <Button variant="ghost">My Projects</Button>
                </Link>
                <span className="text-muted-foreground">
                  Hello, {userName || user?.username}
                </span>
                <Button variant="secondary" onClick={logout}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/#features"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </Link>
                <Link
                  to="/about"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
                <Link to="/login">
                  <Button variant="default" size="sm">
                    Log in
                  </Button>
                </Link>
              </>
            )}
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
