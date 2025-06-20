import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";
import { DiamondIcon, Bell, User } from "lucide-react";

function PublicLayout() {
  const { isAuthenticated } = useAuth(); // Usunięto logout na razie z tego widoku

  const navLinkClasses =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

  const renderPublicNav = () => (
    <>
      <Link to="/features" className={navLinkClasses}>
        Features
      </Link>
      <Link to="/pricing" className={navLinkClasses}>
        Pricing
      </Link>
      <Link to="/support" className={navLinkClasses}>
        Support
      </Link>
    </>
  );

  const renderPrivateNav = () => (
    <>
      <Link to="/projects" className={navLinkClasses}>
        Projects
      </Link>
      <Link to="/settings" className={navLinkClasses}>
        Settings
      </Link>
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 flex h-16 items-center border-b px-4 md:px-10">
        <div className="flex items-center gap-2">
          <DiamondIcon className="h-6 w-6 text-foreground" />
          <Link to="/" className="text-lg font-bold text-foreground">
            Meeting Synthesis
          </Link>
        </div>

        <nav className="ml-10 hidden items-center space-x-6 md:flex">
          {isAuthenticated ? renderPrivateNav() : renderPublicNav()}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
                <span className="sr-only">User Menu</span>
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="secondary" className="rounded-full px-6">
                Log in
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
