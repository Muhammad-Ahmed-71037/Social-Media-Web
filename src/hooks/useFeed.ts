import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FeedPost } from "@/components/PostCard";

export const useFeed = (authorId?: string) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    let q = supabase
      .from("posts")
      .select(`
        id, author_id, content, created_at,
        author:profiles!posts_author_id_fkey(username, display_name, avatar_url),
        media:post_media(id, url, media_type, position),
        likes(user_id),
        comments(id)
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    if (authorId) q = q.eq("author_id", authorId);
    const { data, error } = await q;
    if (error) { setLoading(false); return; }
    const mapped: FeedPost[] = (data ?? []).map((p: any) => ({
      id: p.id,
      author_id: p.author_id,
      content: p.content,
      created_at: p.created_at,
      author: p.author,
      media: (p.media ?? []).sort((a: any, b: any) => a.position - b.position),
      like_count: p.likes?.length ?? 0,
      comment_count: p.comments?.length ?? 0,
      i_liked: p.likes?.some((l: any) => l.user_id === user.id) ?? false,
    }));
    setPosts(mapped);
    setLoading(false);
  }, [user, authorId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Realtime: any change to posts/likes/comments refreshes the feed
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("feed-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, () => load())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  return { posts, loading, reload: load };
};
