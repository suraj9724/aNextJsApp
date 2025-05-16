import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  Users,
  Rss,
  FileText,
  LogOut,
  Menu,
  X,
  UserPlus
} from "lucide-react";

type NavItemProps = {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  onClick?: () => void;
};

const NavItem = ({ icon: Icon, label, href, active, onClick }: NavItemProps) => (
  <Link
    href={href}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
      active
        ? "bg-blue-light text-blue"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
    onClick={onClick}
  >
    <Icon className="h-5 w-5" />
    <span>{label}</span>
  </Link>
);

const AppSidebar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const baseNavigation = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Rss, label: "RSS Feed", href: "/rssfeed" },
    { icon: FileText, label: "News", href: "/news" },
  ];

  let navigation = [...baseNavigation];
  const userRole = (session?.user as any)?.role;

  // Only add the Users link if the user is authenticated, has a role, and that role is not 'user'
  if (status === "authenticated" && userRole && userRole !== "user") {
    navigation.splice(1, 0, { icon: Users, label: "Users", href: "/users" });
  }

  const handleSignOut = async () => {
    closeMobileMenu();
    await signOut({ callbackUrl: '/login' });
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };
  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-white border-r transition-transform duration-300 ease-in-out transform",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="h-16 flex items-center px-4 border-b">
            <div className="text-xl font-bold">RSS News Feed</div>
          </div>

          {/* User info */}
          {status === "authenticated" && session?.user && (
            <div className="px-4 py-4 border-b">
              <div className="text-sm font-medium">{session.user.name || session.user.email}</div>
              <div className="text-xs text-muted-foreground capitalize">{(session.user as any).role || 'User'}</div>
            </div>
          )}

          {/* Navigation items */}
          {status === "authenticated" && (
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navigation.map((item) => (
                <NavItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  active={pathname === item.href}
                  onClick={closeMobileMenu}
                />
              ))}
            </nav>
          )}

          {/* Login/Logout button */}
          <div className="p-3 border-t">
            {status === "authenticated" ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign out
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-primary"
                onClick={() => { router.push('/login'); closeMobileMenu(); }}
              >
                <UserPlus className="h-5 w-5 mr-3" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
