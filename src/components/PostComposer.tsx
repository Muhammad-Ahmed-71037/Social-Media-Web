import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Video, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const PostComposer = ({ onPosted }: { onPosted?: () => void }) => {
  const { user } = useAuth();
  const { profile } = useMyProfile();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => { urls.forEach(URL.revokeObjectURL); };
  }, [files]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.size <= 25 * 1024 * 1024);
    if (incoming.length !== list.length) toast.error("Some files exceeded 25MB and were skipped");
    setFiles((prev) => [...prev, ...incoming].slice(0, 4));
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!user) return;
    if (!content.trim() && files.length === 0) { toast.error("Write something or add media"); return; }
    if (content.length > 2000) { toast.error("Post too long (max 2000)"); return; }
    setBusy(true);
    try {
      const { data: post, error } = await supabase
        .from("posts")
        .insert({ author_id: user.id, content: content.trim() })
        .select()
        .single();
      if (error || !post) throw error;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${post.id}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("social-media").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("social-media").getPublicUrl(path);
        await supabase.from("post_media").insert({
          post_id: post.id,
          url: pub.publicUrl,
          media_type: file.type.startsWith("video") ? "video" : "image",
          position: i,
        });
      }

      setContent(""); setFiles([]);
      toast.success("Posted ✨");
      onPosted?.();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <div className="flex gap-3">
        <Avatar className="h-11 w-11 border-2 border-primary/20">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="bg-gradient-sunset text-primary-foreground">
            {profile.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${profile.display_name.split(" ")[0]}?`}
            maxLength={2000}
            rows={3}
            className="resize-none border-0 bg-secondary/50 text-base focus-visible:ring-1"
          />
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative overflow-hidden rounded-xl">
                  {files[i].type.startsWith("video") ? (
                    <video src={src} className="h-40 w-full object-cover" />
                  ) : (
                    <img src={src} alt="" className="h-40 w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-2 top-2 rounded-full bg-foreground/70 p-1 text-background hover:bg-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <input ref={fileRef} type="file" accept="image/*" multiple hidden
                onChange={(e) => addFiles(e.target.files)} />
              <input ref={videoRef} type="file" accept="video/*" hidden
                onChange={(e) => addFiles(e.target.files)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />Photo
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => videoRef.current?.click()}>
                <Video className="h-4 w-4" />Video
              </Button>
            </div>
            <Button onClick={submit} disabled={busy} variant="hero" size="sm" className="rounded-full px-6">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
