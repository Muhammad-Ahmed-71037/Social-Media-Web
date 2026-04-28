import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import authHero from "@/assets/auth-hero.jpg";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const signUpSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  display_name: z.string().trim().min(1, "Required").max(60),
  username: z.string().trim().min(3, "At least 3 chars").max(24).regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, _ only"),
});

const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1, "Required").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate("/", { replace: true }); }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
      display_name: fd.get("display_name"),
      username: (fd.get("username") as string)?.toLowerCase(),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: parsed.data.display_name, username: parsed.data.username },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to Lumen ✨");
    navigate("/", { replace: true });
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate("/", { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={authHero} alt="" className="absolute inset-0 h-full w-full object-cover" width={1280} height={1600} />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-7 w-7" />
            <span className="font-display text-2xl font-bold">Lumen</span>
          </div>
          <div>
            <h1 className="font-display text-5xl font-black leading-tight">A warmer place<br/>to share moments.</h1>
            <p className="mt-4 max-w-md text-lg opacity-90">Connect with friends, share what you love, and stay close — in real time.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-warm p-6">
        <div className="w-full max-w-md animate-float-up">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-2xl font-bold text-sunset">Lumen</span>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-secondary p-1">
              <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-8 space-y-4">
                <h2 className="font-display text-3xl font-bold">Welcome back</h2>
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pw">Password</Label>
                  <Input id="si-pw" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="mt-8 space-y-4">
                <h2 className="font-display text-3xl font-bold">Create your account</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Display name</Label>
                    <Input id="su-name" name="display_name" required maxLength={60} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-user">Username</Label>
                    <Input id="su-user" name="username" required maxLength={24} placeholder="johndoe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" name="password" type="password" required minLength={8} autoComplete="new-password" />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">← Back home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
