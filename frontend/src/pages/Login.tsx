import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/services/auth";

export default function AuthCard() {
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        console.log("Logged in!");
      } else {
        const data = await signUp(email, password, name);
        console.log("SignUp result:", data?.user?.id, data?.user?.email);
        setInfoMsg("Check your inbox to confirm your email, then log in.");
        setIsLogin(true);
      }

    } catch (err: any) {
      setErrMsg(err.message ?? "Something went wrong.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen grid grid-cols-2 bg-background text-foreground">
      {/* Auth Portion */}
      <section className="flex items-center justify-center p-8">
        <Card className="w-full max-w-sm shadow-xl border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {isLogin ? "Log in" : "Sign up"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4">
              {/* Name (sign-up only) */}
              {!isLogin && (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>


              <Button type="submit" className="w-full" disabled={loading}>
                {isLogin ? "Log in" : "Create account"}
              </Button>

              {/* Optional: show basic error in console-only UI */}
              {errMsg && (
                <span className="sr-only">{errMsg}</span>
              )}
            </form>
          </CardContent>

          <CardFooter className="text-sm text-muted-foreground justify-center">
            {isLogin ? (
              <>
                Don’t have an account?
                <span
                  className="ml-1 underline underline-offset-4 cursor-pointer"
                  onClick={() => setIsLogin(false)}
                >
                  Sign up
                </span>
              </>
            ) : (
              <>
                Already have an account?
                <span
                  className="ml-1 underline underline-offset-4 cursor-pointer"
                  onClick={() => setIsLogin(true)}
                >
                  Log in
                </span>
              </>
            )}
          </CardFooter>
        </Card>
      </section>

      {/* Image Portion */}
      <section className="relative">
        <img
          src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=1600&auto=format&fit=crop"
          alt="Delicious food"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end p-8">
          <h2 className="text-white/90 text-xl font-semibold drop-shadow">
            Discover & share recipes 🍝
          </h2>
        </div>
      </section>
    </div>
  );
}
function setInfoMsg(arg0: string) {
  throw new Error("Function not implemented.");
}

