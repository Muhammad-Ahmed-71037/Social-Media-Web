import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Pencil, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export interface FeedPost {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { username: string; display_name: string; avatar_url: string | null };
  media: { id: string; url: string; media_type: string }[];
  like_count: number;
  comment_count: number;
  i_liked: boolean;
}

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { username: string; display_name: string; avatar_url: string | null } | null;
}

export const PostCard = ({ post, onChanged }: { post: FeedPost; onChanged?: () => void }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.i_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const isOwner = user?.id === post.author_id;

  useEffect(() => { setLiked(post.i_liked); setLikeCount(post.like_count); }, [post.i_liked, post.like_count]);

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      setLiked(false); setLikeCount((c) => c - 1);
      const { error } = await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (error) { setLiked(true); setLikeCount((c) => c + 1); toast.error("Couldn't unlike"); }
    } else {
      setLiked(true); setLikeCount((c) => c + 1);
      const { error } = await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
      if (error) { setLiked(false); setLikeCount((c) => c - 1); toast.error("Couldn't like"); }
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, user_id, content, created_at, author:profiles!comments_user_id_fkey(username, display_name, avatar_url)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments((data as any) ?? []);
  };

  const openComments = async () => {
    setShowComments((s) => !s);
    if (!showComments) await loadComments();
  };

  // Realtime subscribe to this post's comments
  useEffect(() => {
    if (!showComments) return;
    const ch = supabase
      .channel(`comments-${post.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${post.id}` },
        () => loadComments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [showComments, post.id]);

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;
    const text = newComment.trim().slice(0, 1000);
    setNewComment("");
    const { error } = await supabase.from("comments").insert({ post_id: post.id, user_id: user.id, content: text });
    if (error) toast.error("Couldn't comment");
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) toast.error("Couldn't delete");
  };

  const deletePost = async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { toast.error("Couldn't delete"); return; }
    toast.success("Deleted");
    onChanged?.();
  };

  const saveEdit = async () => {
    const trimmed = editContent.trim().slice(0, 2000);
    const { error } = await supabase.from("posts").update({ content: trimmed }).eq("id", post.id);
    if (error) { toast.error("Couldn't save"); return; }
    post.content = trimmed;
    setEditing(false);
    toast.success("Updated");
  };

  return (
    <article className="animate-float-up rounded-3xl border border-border bg-card p-5 shadow-card transition-smooth hover:shadow-soft">
      <header className="flex items-start gap-3">
        <Link to={`/u/${post.author.username}`}>
          <Avatar className="h-11 w-11 border-2 border-primary/20">
            <AvatarImage src={post.author.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-sunset text-primary-foreground">
              {post.author.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link to={`/u/${post.author.username}`} className="font-semibold hover:text-primary">
            {post.author.display_name}
          </Link>
          <p className="text-xs text-muted-foreground">
            @{post.author.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={deletePost} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={2000} rows={3} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditContent(post.content); }}>Cancel</Button>
            <Button size="sm" variant="hero" onClick={saveEdit}>Save</Button>
          </div>
        </div>
      ) : post.content ? (
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
      ) : null}

      {post.media.length > 0 && (
        <div className={cn(
          "mt-3 grid gap-1.5 overflow-hidden rounded-2xl",
          post.media.length === 1 ? "grid-cols-1" : "grid-cols-2",
        )}>
          {post.media.map((m) => (
            m.media_type === "video" ? (
              <video key={m.id} src={m.url} controls className="h-full max-h-[480px] w-full bg-black object-cover" />
            ) : (
              <img key={m.id} src={m.url} alt="" loading="lazy" className="h-full max-h-[480px] w-full object-cover" />
            )
          ))}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-1 border-t border-border pt-3">
        <Button variant="ghost" size="sm" onClick={toggleLike} className={cn(liked && "text-primary")}>
          <Heart className={cn("h-4 w-4 transition-smooth", liked && "fill-current animate-pop")} />
          <span className="tabular-nums">{likeCount}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={openComments}>
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{post.comment_count}</span>
        </Button>
      </footer>

      {showComments && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={c.author?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-secondary text-xs">{c.author?.display_name?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-2xl bg-secondary/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <Link to={`/u/${c.author?.username ?? ""}`} className="text-sm font-semibold hover:text-primary">
                    {c.author?.display_name ?? "User"}
                  </Link>
                  {c.user_id === user?.id && (
                    <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm">{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); submitComment(); }} className="flex gap-2">
            <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment…" maxLength={1000} />
            <Button type="submit" size="icon" variant="hero" disabled={!newComment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </article>
  );
};
