import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Users, Bell, User as UserIcon, LogOut, Sparkles, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { cn } from "@/lib/utils";

const NavItem = ({ to, icon: Icon, label, badge }: { to: string; icon: any; label: string; badge?: number }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-smooth",
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )
    }
  >
    <Icon className="h-5 w-5" />
    <span className="hidden lg:inline">{label}</span>
    {badge ? (
      <span className="absolute -right-1 -top-1 lg:static lg:ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-sunset px-1.5 text-[11px] font-semibold text-primary-foreground">
        {badge > 99 ? "99+" : badge}
      </span>
    ) : null}
  </NavLink>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const { profile } = useMyProfile();
  const unread = useUnreadCount();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  return (
    <div className="min-h-screen bg-warm">
      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-sunset">Lumen</span>
          </Link>
          <Link to="/search"><Button variant="ghost" size="icon"><Search className="h-5 w-5" /></Button></Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col border-r border-border bg-background/60 p-4 md:flex lg:w-64">
          <Link to="/" className="mb-8 flex items-center gap-2 px-2 pt-2">
            <Sparkles className="h-7 w-7 text-primary" />
            <span className="hidden font-display text-2xl font-bold text-sunset lg:inline">Lumen</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            <NavItem to="/" icon={Home} label="Feed" />
            <NavItem to="/search" icon={Search} label="Search" />
            <NavItem to="/friends" icon={Users} label="Friends" />
            <NavItem to="/notifications" icon={Bell} label="Notifications" badge={unread} />
            {profile && <NavItem to={`/u/${profile.username}`} icon={UserIcon} label="Profile" />}
          </nav>
          {profile && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl p-2">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-sunset text-primary-foreground">
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-sm font-semibold">{profile.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden lg:inline-flex">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </aside>

        <main className="min-h-screen flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      {/* Bottom bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1 p-2">
          <NavItem to="/" icon={Home} label="" />
          <NavItem to="/search" icon={Search} label="" />
          <NavItem to="/friends" icon={Users} label="" />
          <NavItem to="/notifications" icon={Bell} label="" badge={unread} />
          {profile && <NavItem to={`/u/${profile.username}`} icon={UserIcon} label="" />}
        </div>
      </nav>
    </div>
  );
};
