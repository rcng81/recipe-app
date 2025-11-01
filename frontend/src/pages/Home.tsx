import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type Recipe = {
  id: string;
  title: string;
  minutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  image: string;
  tags: string[];
  created_at?: string;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=1400&q=80";

export default function Home() {
  const navigate = useNavigate();
  const [loadingUser, setLoadingUser] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const [latest, setLatest] = useState<Recipe[]>([]);
  const [trending, setTrending] = useState<Recipe[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  function mapRowToRecipe(row: any): Recipe {
    return {
      id: row.id,
      title: row.title,
      minutes: row.minutes,
      difficulty: row.difficulty as Recipe["difficulty"],
      image: row.image || PLACEHOLDER_IMAGE,
      tags: row.tags ?? [],
      created_at: row.created_at,
    };
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session) {
        navigate("/login");
        return;
      }

      const name =
        (session.user.user_metadata?.name as string | undefined) ??
        session.user.email?.split("@")[0] ??
        null;

      if (mounted) {
        setDisplayName(name);
        setLoadingUser(false);
        setLoadingFeed(true);
        setFeedError(null);
        try {
          const { data: latestRows, error: latestErr } = await supabase
            .from("recipes")
            .select("id, title, minutes, difficulty, image, tags, created_at")
            .order("created_at", { ascending: false })
            .limit(12);
          if (latestErr) throw latestErr;

          const latestMapped = (latestRows ?? []).map(mapRowToRecipe);
          setLatest(latestMapped);
          setTrending(latestMapped);
        } catch (err: any) {
          setFeedError(err.message ?? "Failed to load recipes.");
        } finally {
          setLoadingFeed(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const initials = useMemo(() => {
    if (!displayName) return "U";
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [displayName]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = (formData.get("q") as string)?.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          {/* Avatar opens Profile Sheet */}
          <ProfileSheet
            initials={initials}
            displayName={displayName ?? "Chef"}
            onSignOut={handleSignOut}
            onDisplayNameUpdated={setDisplayName}
          />

          <div className="mr-auto">
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <p className="text-sm font-medium">{displayName ?? "Chef"}</p>
          </div>

          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
            <Input
              name="q"
              placeholder="Search recipes, ingredients, tags…"
              className="w-72"
            />
            <Button type="submit">Search</Button>
          </form>
          <Button className="hidden md:inline-flex" onClick={() => navigate("/create")}>
            New recipe
          </Button>

          {/*Mobile button display*/}
          <Button size="icon" className="md:hidden" onClick={() => navigate("/create")}>
            +
          </Button>

          <Button variant="outline" className="ml-2" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-8">
        {/* Hero / CTA */}
        <section className="grid md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-2xl">Discover & share recipes 🍝</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Search thousands of community recipes, save your favorites, and
                publish your own.
              </p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  name="q"
                  placeholder="Try “chicken”, “vegan pasta”, or “30 min dinner”"
                />
                <div className="flex gap-2">
                  <Button type="submit">Search</Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => (window.location.href = "/create")}
                  >
                    Create a recipe
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <QuickTag tag="Pasta" />
                <QuickTag tag="Vegetarian" />
                <QuickTag tag="High Protein" />
                <QuickTag tag="Air Fryer" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border">
            <CardContent className="p-0">
              <img
                src="https://images.unsplash.com/photo-1478144592103-25e218a04891?auto=format&fit=crop&w=1400&q=80"
                alt=""
                className="h-full w-full object-cover"
              />
            </CardContent>
          </Card>
        </section>

        {/* Categories */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Popular categories</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Breakfast",
              "Lunch",
              "Dinner",
              "Dessert",
              "Vegan",
              "Gluten-Free",
              "Keto",
              "Air Fryer",
              "BBQ",
              "Meal Prep",
            ].map((c) => (
              <Button
                key={c}
                variant="secondary"
                className="rounded-full"
                onClick={() => navigate(`/search?q=${encodeURIComponent(c)}`)}
              >
                {c}
              </Button>
            ))}
          </div>
        </section>

        <Separator />

        {/* Feed */}
        <section className="space-y-4">
          <Tabs defaultValue="trending" className="w-full">
            {/* Title + Tabs in one row */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Explore</h2>
              <TabsList className="hidden md:inline-flex">
                <TabsTrigger value="trending" className="data-[state=active]:font-semibold">
                  Trending
                </TabsTrigger>
                <TabsTrigger value="new" className="data-[state=active]:font-semibold">
                  New
                </TabsTrigger>
                <TabsTrigger value="saved" className="data-[state=active]:font-semibold">
                  Saved
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Mobile tabs list */}
            <TabsList className="md:hidden mt-2">
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
            </TabsList>

            <TabsContent value="trending" className="mt-4">
              {loadingFeed ? (
                <span className="text-sm text-muted-foreground">Loading recipes…</span>
              ) : feedError ? (
                <EmptyState
                  title="Couldn’t load recipes"
                  description={feedError}
                  actionLabel="Retry"
                  onAction={() => window.location.reload()}
                />
              ) : trending.length === 0 ? (
                <EmptyState
                  title="No recipes yet"
                  description="Be the first to add one!"
                  actionLabel="Create a recipe"
                  onAction={() => navigate("/create")}
                />
              ) : (
                <RecipeGrid recipes={trending} onOpen={(id) => navigate(`/recipe/${id}`)} />
              )}
            </TabsContent>

            <TabsContent value="new" className="mt-4">
              {loadingFeed ? (
                <span className="text-sm text-muted-foreground">Loading recipes…</span>
              ) : feedError ? (
                <EmptyState
                  title="Couldn’t load recipes"
                  description={feedError}
                  actionLabel="Retry"
                  onAction={() => window.location.reload()}
                />
              ) : latest.length === 0 ? (
                <EmptyState
                  title="No recent recipes"
                  description="Try again later or publish one now."
                  actionLabel="Create a recipe"
                  onAction={() => navigate("/create")}
                />
              ) : (
                <RecipeGrid recipes={latest} onOpen={(id) => navigate(`/recipe/${id}`)} />
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              <EmptyState
                title="No saved recipes yet"
                description="Save recipes you love and they’ll show up here."
                actionLabel="Browse recipes"
                onAction={() => navigate("/search")}
              />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}

function ProfileSheet({
  initials,
  displayName,
  onSignOut,
  onDisplayNameUpdated,
}: {
  initials: string;
  displayName: string;
  onSignOut: () => void;
  onDisplayNameUpdated: (name: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [message, setMessage] = useState<string | null>(null);

  // --- My Recipes state ---
  const [tab, setTab] = useState<"profile" | "mine" | "favorites" | "signout">("profile");
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [mineError, setMineError] = useState<string | null>(null);

  function mapRowToRecipe(row: any): Recipe {
    return {
      id: row.id,
      title: row.title,
      minutes: row.minutes,
      difficulty: row.difficulty as Recipe["difficulty"],
      image: row.image || PLACEHOLDER_IMAGE,
      tags: row.tags ?? [],
      created_at: row.created_at,
    };
  }

  async function loadMyRecipes() {
    setLoadingMine(true);
    setMineError(null);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not authenticated.");

      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, minutes, difficulty, image, tags, created_at, author_id")
        .eq("author_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyRecipes((data ?? []).map(mapRowToRecipe));
    } catch (err: any) {
      setMineError(err.message ?? "Failed to load your recipes.");
    } finally {
      setLoadingMine(false);
    }
  }
  useEffect(() => {
    if (open && tab === "mine") {
      loadMyRecipes();
    }
  }, [open, tab]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not authenticated.");

      const { error } = await supabase.auth.updateUser({
        data: { name: nameInput.trim() || null },
      });
      if (error) throw error;

      onDisplayNameUpdated(nameInput.trim() || null);
      setMessage("Profile updated!");
    } catch (err: any) {
      setMessage(err.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Avatar className="h-9 w-9 cursor-pointer">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </SheetTrigger>

      <SheetContent side="left" className="w-[320px] p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-left">Your Profile</SheetTitle>
          <SheetDescription className="sr-only">
            Manage your account, view your recipes, favorites, and sign out.
          </SheetDescription>
        </SheetHeader>
        <Separator />

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          defaultValue="profile"
          className="w-full"
        >
          <div className="px-4 pt-3">
            <TabsList
              className="
                grid w-full h-full
                [grid-template-columns:repeat(4,minmax(0,1fr))]
                gap-2
              "
            >
              {[
                ["profile", "Profile"],
                ["mine", "My Recipes"],
                ["favorites", "Favorites"],
                ["signout", "Sign out"],
              ].map(([val, label]) => (
                <TabsTrigger
                  key={val}
                  value={val}
                  className="
                    w-full min-w-0
                    min-h-12 py-2 px-3
                    inline-flex items-center justify-center text-center
                    rounded-md text-xs sm:text-sm leading-snug
                    break-words whitespace-normal
                    data-[state=active]:bg-primary
                    data-[state=active]:text-primary-foreground
                    data-[state=active]:font-semibold
                  "
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(100dvh-140px)] px-4 py-3">
            {/* Profile tab */}
            <TabsContent value="profile" className="mt-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <form className="space-y-3" onSubmit={saveProfile}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Display name</label>
                      <Input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Your name"
                      />
                      <p className="text-xs text-muted-foreground">
                        This shows in the app and is saved to your Supabase user metadata.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setNameInput(displayName)}
                        disabled={saving}
                      >
                        Reset
                      </Button>
                    </div>
                    {message && (
                      <p className="text-xs text-muted-foreground">{message}</p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Recipes tab */}
            <TabsContent value="mine" className="mt-2">
              {loadingMine ? (
                <span className="text-sm text-muted-foreground">Loading your recipes…</span>
              ) : mineError ? (
                <EmptyState
                  title="Couldn’t load your recipes"
                  description={mineError}
                  actionLabel="Retry"
                  onAction={loadMyRecipes}
                />
              ) : myRecipes.length === 0 ? (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">My Recipes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>You haven’t published any recipes yet.</p>
                    <Button
                      onClick={() => {
                        window.location.href = "/create";
                      }}
                      size="sm"
                    >
                      Create a recipe
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">My Recipes</h3>
                    <Button variant="ghost" size="sm" onClick={loadMyRecipes}>
                      Refresh
                    </Button>
                  </div>
                  <MyRecipeList
                    recipes={myRecipes}
                    onOpen={(id) => (window.location.href = `/recipe/${id}`)}
                  />
                </div>
              )}
            </TabsContent>

            {/* Favorites tab */}
            <TabsContent value="favorites" className="mt-2">
              <EmptyState
                title="No favorites"
                description="Tap the Save button on any recipe to add it here."
                actionLabel="Explore recipes"
                onAction={() => {
                  window.location.href = "/search";
                }}
              />
            </TabsContent>

            {/* Sign out tab */}
            <TabsContent value="signout" className="mt-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sign out</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    You’ll be returned to the login screen.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onSignOut();
                    }}
                  >
                    Sign out
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Small UI helpers (kept in this file for simplicity) ---------- */

function QuickTag({ tag }: { tag: string }) {
  const navigate = useNavigate();
  return (
    <Badge
      variant="secondary"
      className="cursor-pointer"
      onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
    >
      #{tag}
    </Badge>
  );
}

function RecipeGrid({
  recipes,
  onOpen,
}: {
  recipes: Recipe[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />
      ))}
    </div>
  );
}

function RecipeCard({
  recipe,
  onOpen,
}: {
  recipe: Recipe;
  onOpen: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
    <div className="aspect-[16/10] w-full overflow-hidden">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{recipe.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{recipe.difficulty}</Badge>
          <span>•</span>
          <span>{recipe.minutes} min</span>
          <span>•</span>
          <div className="flex gap-2">
            {recipe.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="font-normal">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button variant="default" onClick={() => onOpen(recipe.id)}>
          View
        </Button>
        <Button variant="ghost">Save</Button>
      </CardFooter>
    </Card>
  );
}

function MyRecipeList({
  recipes,
  onOpen,
}: {
  recipes: Recipe[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-xs text-muted-foreground">
        <span>Title</span>
        <span>Created</span>
      </div>
      <div className="divide-y">
        {recipes.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2"
          >
            <button
              className="text-left truncate font-medium hover:underline"
              onClick={() => onOpen(r.id)}
              title={r.title}
            >
              {r.title}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
              </span>
              <Button size="sm" variant="ghost" onClick={() => onOpen(r.id)}>
                View
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
      <CardFooter>
        <Button onClick={onAction}>{actionLabel}</Button>
      </CardFooter>
    </Card>
  );
}
