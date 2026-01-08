import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import RotatingImage from "@/components/RotatingImage";

export default function AuthCard() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrMsg(null);
    setInfoMsg(null);
  }, [isLogin]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        console.log("Logged in!");
        navigate("/");
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
    <div className="min-h-screen bg-background text-foreground">
      {/* 1 col on mobile, 2 cols from md and up */}
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* Auth Portion */}
        <section className="flex items-center justify-center px-4 py-10 sm:px-8">
          <Card className="w-full max-w-sm sm:max-w-md shadow-xl border border-border bg-card">
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
                {isLogin && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/")}
                  >
                    Browse as guest
                  </Button>
                )}

                {/* Accessible error/info messages */}
                {errMsg && <span className="sr-only">{errMsg}</span>}
                {errMsg && (
                  <p role="alert" className="text-sm text-red-600">
                    {errMsg}
                  </p>
                )}
                {infoMsg && (
                  <p role="status" className="text-sm text-green-600">
                    {infoMsg}
                  </p>
                )}
              </form>
            </CardContent>

            <CardFooter className="justify-center text-sm text-muted-foreground">
              {isLogin ? (
                <>
                  Don’t have an account?
                  <button
                    type="button"
                    className="ml-1 underline underline-offset-4"
                    onClick={() => setIsLogin(false)}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?
                  <button
                    type="button"
                    className="ml-1 underline underline-offset-4"
                    onClick={() => setIsLogin(true)}
                  >
                    Log in
                  </button>
                </>
              )}
            </CardFooter>
          </Card>
        </section>

        {/* Image Portion – hidden on small screens */}
        <section className="relative hidden md:block">
          <RotatingImage intervalMs={10000} />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-black/0" />

          <div className="absolute inset-0 flex items-end p-8">
            <h2 className="text-xl font-semibold text-white/90 drop-shadow">
              Discover &amp; share recipes 🍝
            </h2>
          </div>
        </section>
      </div>
    </div>
  );
}
