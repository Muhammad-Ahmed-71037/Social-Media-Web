import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  status: string;
  requester_id: string;
  addressee_id: string;
  requester: { username: string; display_name: string; avatar_url: string | null } | null;
  addressee: { username: string; display_name: string; avatar_url: string | null } | null;
}

const Friends = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select(`id, status, requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(username, display_name, avatar_url),
        addressee:profiles!friendships_addressee_id_fkey(username, display_name, avatar_url)`)
      .order("created_at", { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`friend-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const accept = async (id: string) => {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    if (error) toast.error("Couldn't accept"); else toast.success("Friends ✨");
  };
  const reject = async (id: string) => { await supabase.from("friendships").delete().eq("id", id); };
  const remove = async (id: string) => {
    if (!confirm("Remove friend?")) return;
    await supabase.from("friendships").delete().eq("id", id);
  };

  if (!user) return null;

  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === user.id);
  const outgoing = rows.filter((r) => r.status === "pending" && r.requester_id === user.id);
  const friends = rows.filter((r) => r.status === "accepted");

  const card = (other: Row["requester"], actions: React.ReactNode) =>
    other && (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
        <Link to={`/u/${other.username}`}>
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={other.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-sunset text-primary-foreground">
              {other.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <Link to={`/u/${other.username}`} className="flex-1 min-w-0">
          <p className="truncate font-semibold hover:text-primary">{other.display_name}</p>
          <p className="truncate text-xs text-muted-foreground">@{other.username}</p>
        </Link>
        <div className="flex gap-1">{actions}</div>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <h1 className="mb-6 font-display text-4xl font-black">Friends</h1>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="friends">
          <TabsList className="rounded-full bg-secondary p-1">
            <TabsTrigger value="friends" className="rounded-full">Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="incoming" className="rounded-full">Requests ({incoming.length})</TabsTrigger>
            <TabsTrigger value="outgoing" className="rounded-full">Sent ({outgoing.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 space-y-2">
            {friends.length === 0 && <p className="py-8 text-center text-muted-foreground">No friends yet — try Search.</p>}
            {friends.map((r) => {
              const other = r.requester_id === user.id ? r.addressee : r.requester;
              return <div key={r.id}>{card(other,
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><UserMinus className="h-4 w-4" /></Button>,
              )}</div>;
            })}
          </TabsContent>

          <TabsContent value="incoming" className="mt-4 space-y-2">
            {incoming.length === 0 && <p className="py-8 text-center text-muted-foreground">No incoming requests.</p>}
            {incoming.map((r) => (
              <div key={r.id}>{card(r.requester,
                <>
                  <Button size="sm" variant="hero" onClick={() => accept(r.id)}><Check className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => reject(r.id)}><X className="h-4 w-4" /></Button>
                </>,
              )}</div>
            ))}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4 space-y-2">
            {outgoing.length === 0 && <p className="py-8 text-center text-muted-foreground">No pending requests.</p>}
            {outgoing.map((r) => (
              <div key={r.id}>{card(r.addressee,
                <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>Cancel</Button>,
              )}</div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Friends;
