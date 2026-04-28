import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, UserCheck, Loader2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  type: "like" | "comment" | "friend_request" | "friend_accepted";
  read: boolean;
  created_at: string;
  post_id: string | null;
  actor: { username: string; display_name: string; avatar_url: string | null } | null;
}

const ICONS = {
  like: { Icon: Heart, color: "text-primary" },
  comment: { Icon: MessageCircle, color: "text-accent" },
  friend_request: { Icon: UserPlus, color: "text-primary" },
  friend_accepted: { Icon: UserCheck, color: "text-accent" },
};

const labelFor = (n: Notif) => {
  const name = n.actor?.display_name ?? "Someone";
  switch (n.type) {
    case "like": return `${name} liked your post`;
    case "comment": return `${name} commented on your post`;
    case "friend_request": return `${name} sent you a friend request`;
    case "friend_accepted": return `${name} accepted your friend request`;
  }
};

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select(`id, type, read, created_at, post_id,
        actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)`)
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notif-list-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true })
      .eq("recipient_id", user.id).eq("read", false);
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-4xl font-black">Notifications</h1>
        <Button variant="ghost" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4" />Mark all read</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          You're all caught up ✨
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const { Icon, color } = ICONS[n.type];
            const link = n.type.startsWith("friend") ? `/u/${n.actor?.username ?? ""}` : "/";
            return (
              <Link
                key={n.id}
                to={link}
                onClick={() => !n.read && markRead(n.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border p-3 shadow-card transition-smooth hover:shadow-soft",
                  n.read ? "bg-card" : "bg-primary/5",
                )}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-sunset text-primary-foreground">
                      {n.actor?.display_name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn("absolute -bottom-1 -right-1 rounded-full bg-card p-1", color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{labelFor(n)}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
