import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon } from "lucide-react";

interface Row { id: string; username: string; display_name: string; avatar_url: string | null; bio: string | null; }

const Search = () => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRows([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(20);
      setRows((data as any) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <h1 className="mb-6 font-display text-4xl font-black">Find people</h1>
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @username"
          className="h-12 rounded-full pl-11 text-base" />
      </div>
      <div className="mt-6 space-y-2">
        {rows.map((r) => (
          <Link key={r.id} to={`/u/${r.username}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition-smooth hover:shadow-soft">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={r.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-sunset text-primary-foreground">
                {r.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.display_name}</p>
              <p className="truncate text-xs text-muted-foreground">@{r.username}{r.bio ? ` · ${r.bio}` : ""}</p>
            </div>
          </Link>
        ))}
        {q.trim().length >= 2 && rows.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No users found.</p>
        )}
      </div>
    </div>
  );
};

export default Search;
