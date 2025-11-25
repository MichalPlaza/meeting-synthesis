import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function AdminSubNav() {
  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      buttonVariants({ variant: "ghost", size: "sm" }),
      "h-8",
      isActive
        ? "bg-muted text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="border-b border-border/50 mb-6">
      <div className="flex gap-2 -mb-px">
        <NavLink to="/admin/dashboard" className={subNavLinkClass} end>
          Dashboard
        </NavLink>
        <NavLink to="/admin/users" className={subNavLinkClass} end>
          Users
        </NavLink>
        <NavLink to="/admin/projects" className={subNavLinkClass} end>
          Projects
        </NavLink>
        <NavLink to="/admin/meetings" className={subNavLinkClass} end>
          Meetings
        </NavLink>
      </div>
    </div>
  );
}
