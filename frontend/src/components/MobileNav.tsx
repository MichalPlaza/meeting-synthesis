import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/AuthContext";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const handleNavClick = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center px-4 py-3 text-base font-medium rounded-[var(--radius-field)] transition-colors",
      "min-h-[44px]", // Touch-friendly minimum size
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-secondary hover:text-secondary-foreground"
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden min-w-[44px] min-h-[44px]"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <SheetHeader className="border-b border-border pb-4 mb-4">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-2">
          {isAuthenticated ? (
            <>
              <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border mb-2">
                Hello, {user?.full_name || user?.username}
              </div>

              <NavLink
                to="/meetings"
                className={navLinkClass}
                onClick={handleNavClick}
                end
              >
                Meetings
              </NavLink>

              <NavLink
                to="/projects"
                className={navLinkClass}
                onClick={handleNavClick}
                end
              >
                Projects
              </NavLink>

              <NavLink
                to="/knowledge-base"
                className={navLinkClass}
                onClick={handleNavClick}
                end
              >
                Knowledge Base
              </NavLink>

              {user?.role === "project_manager" && (
                <NavLink
                  to="/manage-access"
                  className={navLinkClass}
                  onClick={handleNavClick}
                  end
                >
                  Manage Access
                </NavLink>
              )}

              {user?.role === "admin" && (
                <NavLink
                  to="/admin/dashboard"
                  className={navLinkClass}
                  onClick={handleNavClick}
                >
                  Admin Dashboard
                </NavLink>
              )}

              <div className="border-t border-border mt-4 pt-4">
                <Button
                  variant="secondary"
                  className="w-full min-h-[44px]"
                  onClick={handleLogout}
                >
                  Log Out
                </Button>
              </div>
            </>
          ) : (
            <>
              <NavLink
                to="/#features"
                className={navLinkClass}
                onClick={handleNavClick}
              >
                Features
              </NavLink>

              <NavLink
                to="/about"
                className={navLinkClass}
                onClick={handleNavClick}
              >
                About
              </NavLink>

              <NavLink
                to="/contact"
                className={navLinkClass}
                onClick={handleNavClick}
              >
                Contact
              </NavLink>

              <div className="border-t border-border mt-4 pt-4">
                <NavLink to="/login" onClick={handleNavClick} className="block">
                  <Button variant="secondary" className="w-full min-h-[44px]">
                    Log In
                  </Button>
                </NavLink>
              </div>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
