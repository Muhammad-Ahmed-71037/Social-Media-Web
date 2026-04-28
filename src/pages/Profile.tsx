import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/PostCard";
import { Loader2, Lock, UserPlus, Check, X, Settings, UserMinus, Camera, Globe, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FeedPost } from "@/components/PostCard";

interface ViewedProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  privacy: "public" | "friends" | "private";
}

const Profile = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { profile: me, refresh: refreshMe } = useMyProfile();
  const [target, setTarget] = useState<ViewedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_out" | "pending_in" | "friends">("none");
  const [friendRowId, setFriendRowId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const isMe = me?.username === username;

  useEffect(() => {
    if (!username) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data: prof } = await supabase
        .from("profiles").select("*").eq("username", username).maybeSingle();
      if (!active) return;
      if (!prof) { setTarget(null); setLoading(false); return; }
      setTarget(prof as ViewedProfile);

      // friendship
      if (user && user.id !== prof.id) {
        const { data: fs } = await supabase
          .from("friendships").select("*")
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${prof.id}),and(requester_id.eq.${prof.id},addressee_id.eq.${user.id})`)
          .maybeSingle();
        if (fs) {
          setFriendRowId(fs.id);
          if (fs.status === "accepted") setFriendStatus("friends");
          else if (fs.status === "pending") setFriendStatus(fs.requester_id === user.id ? "pending_out" : "pending_in");
          else setFriendStatus("none");
        } else { setFriendStatus("none"); setFriendRowId(null); }
      }

      // posts (RLS will filter automatically)
      const { data } = await supabase
        .from("posts")
        .select(`id, author_id, content, created_at,
          author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
          media:post_media(id, url, media_type, position),
          likes(user_id), comments(id)`)
        .eq("author_id", prof.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      setPosts(((data ?? []) as any[]).map((p) => ({
        id: p.id, author_id: p.author_id, content: p.content, created_at: p.created_at,
        author: p.author,
        media: (p.media ?? []).sort((a: any, b: any) => a.position - b.position),
        like_count: p.likes?.length ?? 0,
        comment_count: p.comments?.length ?? 0,
        i_liked: p.likes?.some((l: any) => l.user_id === user?.id) ?? false,
      })));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [username, user]);

  const sendRequest = async () => {
    if (!user || !target) return;
    const { data, error } = await supabase.from("friendships")
      .insert({ requester_id: user.id, addressee_id: target.id }).select().single();
    if (error) { toast.error("Couldn't send request"); return; }
    setFriendStatus("pending_out"); setFriendRowId(data.id);
    toast.success("Request sent");
  };
  const accept = async () => {
    if (!friendRowId) return;
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendRowId);
    if (error) { toast.error("Couldn't accept"); return; }
    setFriendStatus("friends"); toast.success("You're now friends ✨");
  };
  const reject = async () => {
    if (!friendRowId) return;
    await supabase.from("friendships").delete().eq("id", friendRowId);
    setFriendStatus("none"); setFriendRowId(null);
  };
  const unfriend = async () => {
    if (!friendRowId) return;
    if (!confirm("Remove this friend?")) return;
    await supabase.from("friendships").delete().eq("id", friendRowId);
    setFriendStatus("none"); setFriendRowId(null);
  };

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!me) return;
    const fd = new FormData(e.currentTarget);
    const updates = {
      display_name: String(fd.get("display_name") || "").trim().slice(0, 60),
      bio: String(fd.get("bio") || "").trim().slice(0, 280),
      privacy: fd.get("privacy") as "public" | "friends" | "private",
    };
    const file = fd.get("avatar") as File | null;
    let avatar_url: string | undefined;
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) { toast.error("Avatar must be under 5MB"); return; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${me.id}/avatar/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("social-media").upload(path, file, { upsert: true });
      if (upErr) { toast.error("Upload failed"); return; }
      avatar_url = supabase.storage.from("social-media").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("profiles").update({ ...updates, ...(avatar_url ? { avatar_url } : {}) }).eq("id", me.id);
    if (error) { toast.error("Couldn't save"); return; }
    toast.success("Profile updated");
    setEditOpen(false);
    await refreshMe();
    if (target) setTarget({ ...target, ...updates, ...(avatar_url ? { avatar_url } : {}) });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!target) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h2 className="font-display text-3xl font-bold">User not found</h2>
      <Link to="/" className="text-primary hover:underline">← Back to feed</Link>
    </div>
  );

  const cannotSeePosts = !isMe && (
    (target.privacy === "private") ||
    (target.privacy === "friends" && friendStatus !== "friends")
  );

  const PrivacyIcon = target.privacy === "public" ? Globe : target.privacy === "friends" ? UsersIcon : Lock;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="rounded-3xl bg-gradient-sunset p-6 text-primary-foreground shadow-glow">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-24 w-24 border-4 border-primary-foreground/40">
            <AvatarImage src={target.avatar_url ?? undefined} />
            <AvatarFallback className="bg-background text-2xl text-foreground">
              {target.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-black">{target.display_name}</h1>
            <p className="opacity-90">@{target.username}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm opacity-90">
              <PrivacyIcon className="h-3.5 w-3.5" />{target.privacy}
            </p>
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm"><Settings className="h-4 w-4" />Edit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="avatar"><Camera className="mr-1 inline h-4 w-4" />Avatar</Label>
                      <Input id="avatar" name="avatar" type="file" accept="image/*" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display name</Label>
                      <Input id="display_name" name="display_name" defaultValue={me?.display_name} maxLength={60} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea id="bio" name="bio" defaultValue={me?.bio ?? ""} maxLength={280} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="privacy">Privacy</Label>
                      <Select name="privacy" defaultValue={me?.privacy}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public — anyone signed in</SelectItem>
                          <SelectItem value="friends">Friends only</SelectItem>
                          <SelectItem value="private">Private — only me</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" variant="hero" className="w-full">Save</Button>
                  </form>
                </DialogContent>
              </Dialog>
            ) : friendStatus === "friends" ? (
              <Button onClick={unfriend} variant="secondary" size="sm"><UserMinus className="h-4 w-4" />Friends</Button>
            ) : friendStatus === "pending_out" ? (
              <Button disabled variant="secondary" size="sm">Requested</Button>
            ) : friendStatus === "pending_in" ? (
              <>
                <Button onClick={accept} variant="secondary" size="sm"><Check className="h-4 w-4" />Accept</Button>
                <Button onClick={reject} variant="ghost" size="sm" className="text-primary-foreground"><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <Button onClick={sendRequest} variant="secondary" size="sm"><UserPlus className="h-4 w-4" />Add friend</Button>
            )}
          </div>
        </div>
        {target.bio && <p className="mt-4 max-w-prose text-sm leading-relaxed opacity-95">{target.bio}</p>}
      </header>

      <div className="mt-6 space-y-4">
        {cannotSeePosts ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">This profile is {target.privacy === "private" ? "private" : "friends-only"}</p>
            <p className="text-sm text-muted-foreground">
              {target.privacy === "friends" ? "Become friends to see posts." : "These posts aren't visible to you."}
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            No posts yet.
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
};

export default Profile;
