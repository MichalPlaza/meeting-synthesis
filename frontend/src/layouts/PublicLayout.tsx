import { Link, Outlet, useLocation } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";
import { Toaster } from "sonner";

function MainLayout() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const userName = user?.full_name;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Toaster richColors position="top-center" />
      <header className="bg-blue-950 text-white p-5 flex justify-between items-center px-10 md:px-20">
        <NavigationMenu>
          <NavigationMenuList className="space-x-20">
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/"
                  className={cn("px-5 py-2 rounded-md text-lg font-medium", {
                    "bg-blue-900 text-white": location.pathname === "/",
                  })}
                >
                  Home
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/guide"
                  className={cn("px-5 py-2 rounded-md text-lg font-medium", {
                    "bg-blue-900 text-white": location.pathname === "/guide",
                  })}
                >
                  Guide
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/about"
                  className={cn("px-5 py-2 rounded-md text-lg font-medium", {
                    "bg-blue-900 text-white": location.pathname === "/about",
                  })}
                >
                  About
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/contact"
                  className={cn("px-5 py-2 rounded-md text-lg font-medium", {
                    "bg-blue-900 text-white": location.pathname === "/contact",
                  })}
                >
                  Contact
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* User Info and Logout */}
        <NavigationMenu>
          {isAuthenticated ? (
            <NavigationMenuList className="space-x-20">
              <NavigationMenuItem>
                <Button className="space-x-20 bg-blue-800 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-lg font-medium">
                  Hello {userName.toUpperCase()}
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="text-white-300 hover:bg-gray-500 hover:text-white px-5 py-5 rounded-md text-lg font-medium"
                >
                  Log out
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          ) : (
            <NavigationMenuList className="space-x-20">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to="/register"
                    className={cn("px-5 py-2 rounded-md text-lg font-medium", {
                      "bg-blue-900 text-white":
                        location.pathname === "/register",
                    })}
                  >
                    Sign up
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to="/login"
                    className={cn("px-5 py-2 rounded-md text-lg font-medium", {
                      "bg-blue-900 text-white": location.pathname === "/login",
                    })}
                  >
                    Log in
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          )}
        </NavigationMenu>
      </header>

      <main className="container mx-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
