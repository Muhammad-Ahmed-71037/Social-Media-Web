import { PostComposer } from "@/components/PostComposer";
import { PostCard } from "@/components/PostCard";
import { useFeed } from "@/hooks/useFeed";
import { Loader2, Sparkles } from "lucide-react";

const Feed = () => {
  const { posts, loading } = useFeed();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <div className="mb-6 hidden md:block">
        <h1 className="font-display text-4xl font-black tracking-tight">Your feed</h1>
        <p className="mt-1 text-muted-foreground">What's new from you and your friends.</p>
      </div>

      <PostComposer />

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 font-display text-2xl font-bold">It's quiet here</h2>
            <p className="mt-2 text-muted-foreground">Share your first post or find friends to follow their stories.</p>
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
};

export default Feed;
