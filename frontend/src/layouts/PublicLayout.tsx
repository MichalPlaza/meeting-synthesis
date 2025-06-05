import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/AuthContext';

function MainLayout() {
  const location = useLocation(); 
  const userName = "ANNA";
  const { isAuthenticated, user, logout } = useAuth();
  
  const handleLogout = () => {
    logout();
  };
  

  return (
    <div>
      <header className="bg-gray-800 text-white p-5 flex justify-between items-center">
        <NavigationMenu>
          <NavigationMenuList className="space-x-20">
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink className={cn("px-5 py-2 rounded-md text-lg font-medium", { 'bg-gray-900 text-white': location.pathname === '/' })}>
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
             <NavigationMenuItem>
              <Link to="/guide"> {/* Thay /guide bằng route thực tế */}
                <NavigationMenuLink className={cn("px-5 py-2 rounded-md text-lg font-medium", { 'bg-gray-900 text-white': location.pathname === '/guide' })}>
                  Guide
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
             <NavigationMenuItem>
              <Link to="/about"> {/* Thay /about bằng route thực tế */}
                <NavigationMenuLink className={cn("px-5 py-2 rounded-md text-lg font-medium", { 'bg-gray-900 text-white': location.pathname === '/about' })}>
                  About
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
             <NavigationMenuItem>
              <Link to="/contact"> {/* Thay /contact bằng route thực tế */}
                <NavigationMenuLink className={cn("px-5 py-2 rounded-md text-lg font-medium", { 'bg-gray-900 text-white': location.pathname === '/contact' })}>
                  Contact
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* User Info and Logout */}
        <NavigationMenu>
          {isAuthenticated ? (
            <NavigationMenuList className="space-x-20">
              <NavigationMenuItem>
                <Button className="space-x-20 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-lg font-medium">
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
                <Link to="/register">
                  <NavigationMenuLink className={cn("px-5 py-2 rounded-md text-lg font-medium", { 'bg-gray-900 text-white': location.pathname === '/register' })}>
                    Sign up
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/login">
                  <NavigationMenuLink className={cn("px-5 py-2 rounded-md text-lg font-medium", { 'bg-gray-900 text-white': location.pathname === '/login' })}>
                    Log in
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          )}
        </NavigationMenu>
        
      </header>

      <main className="container mx-auto p-4">
        <Outlet />
      </main>

    </div>
  );
}

export default MainLayout;