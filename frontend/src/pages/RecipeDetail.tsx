import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toTitleCase, normalizeTag } from "@/constants/tags";
import { useRecipeLike } from "@/hooks/useRecipeLike";
import { Heart } from "lucide-react";

const displayTag = (t: string) => `#${toTitleCase(normalizeTag(t))}`;

function TagPill({
  tag,
  onClick,
  variant = "secondary",
}: {
  tag: string;
  onClick?: () => void;
  variant?: "secondary" | "outline" | "default";
}) {
  return (
    <Badge
      variant={variant}
      className="font-medium rounded-full px-2.5 py-1 cursor-pointer"
      onClick={onClick}
      title={displayTag(tag)}
    >
      {displayTag(tag)}
    </Badge>
  );
}

function SaveToggle({ recipeId }: { recipeId: string }) {
  const { liked, count, loading, toggle } = useRecipeLike(recipeId);

  async function onClick() {
    try {
      await toggle();
      // Let other parts of the app (ProfileSheet -> Favorites) refresh automatically
      window.dispatchEvent(new Event("likes-changed"));
    } catch (e) {
      console.error("Failed to toggle like:", e);
    }
  }

  return (
    <Button
      variant={liked ? "secondary" : "default"}
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2"
      title={liked ? "Unsave from favorites" : "Save to favorites"}
    >
      <Heart
        className={liked ? "text-red-500" : "text-muted-foreground"}
        fill={liked ? "currentColor" : "none"}
        strokeWidth={liked ? 0 : 2}
        size={16}
      />
      {loading ? (liked ? "Unsaving…" : "Saving…") : liked ? "Unsave" : "Save"}
      {typeof count === "number" && (
        <span className="text-xs tabular-nums opacity-80">({count})</span>
      )}
    </Button>
  );
}



type RecipeRow = {
  id: string;
  title: string;
  image: string | null;
  minutes: number | null;
  difficulty: "Easy" | "Medium" | "Hard" | null;
  tags: string[] | null;
  created_at?: string | null;

  description?: unknown;
  ingredients?: unknown;
  steps?: unknown;

  author_id?: string | null;
};

type OrderedText = { text: string; order?: number | null };

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=1400&q=80";

function maybeParseJSON<T = unknown>(val: unknown): T | unknown {
  if (typeof val === "string") {
    try {
      const trimmed = val.trim();
      if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        trimmed.startsWith('"')
      ) {
        return JSON.parse(val) as T;
      }
    } catch {

    }
  }
  return val;
}

function normalizeText(val: unknown): string | null {
  const parsed = maybeParseJSON(val);
  if (parsed == null) return null;
  if (typeof parsed === "string") return parsed;
  if (typeof parsed === "object" && parsed && "text" in (parsed as any)) {
    const t = (parsed as any).text;
    return typeof t === "string" ? t : JSON.stringify(parsed);
  }

  if (typeof parsed === "object") return JSON.stringify(parsed);
  return String(parsed);
}

function normalizeList(val: unknown): string[] {
  const parsed = maybeParseJSON(val);

  if (Array.isArray(parsed)) {
    const items = parsed.slice();

    const hasObjects = items.some(
      (it) => it && typeof it === "object" && "text" in (it as any)
    );

    if (hasObjects) {
      const asOrdered: OrderedText[] = items
        .filter((it) => it && typeof it === "object" && "text" in (it as any))
        .map((it) => {
          const o = it as any;
          return { text: String(o.text ?? ""), order: typeof o.order === "number" ? o.order : null };
        });

      asOrdered.sort((a, b) => {
        const ao = a.order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.order ?? Number.MAX_SAFE_INTEGER;
        return ao - bo;
      });

      return asOrdered
        .map((o) => (o.text?.trim() ? o.text : ""))
        .filter(Boolean);
    }

    return items
      .map((it) => (typeof it === "string" ? it : normalizeText(it) ?? ""))
      .filter((s) => s && s.trim().length > 0);
  }

  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return [];
    if (trimmed.includes("\n")) {
      return trimmed.split("\n").map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }

  if (parsed && typeof parsed === "object" && "text" in (parsed as any)) {
    const t = normalizeText(parsed);
    return t ? [t] : [];
  }

  return [];
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setErr("Missing recipe id.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr(null);

      try {
        const { data: sessionRes, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        if (!sessionRes.session) {
          navigate("/login");
          return;
        }
        const uid = sessionRes.session.user.id;

        const { data, error } = await supabase
          .from("recipes")
          .select(
            `
            id,
            title,
            image,
            minutes,
            difficulty,
            tags,
            created_at,
            description,
            ingredients,
            steps,
            author_id
          `
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!mounted) return;

        setRecipe(data as RecipeRow);
        setIsOwner((data?.author_id ?? "") === uid);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Failed to load recipe.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  const createdAt = useMemo(() => {
    if (!recipe?.created_at) return null;
    try {
      return new Date(recipe.created_at).toLocaleDateString();
    } catch {
      return null;
    }
  }, [recipe?.created_at]);

  const safeDescription = normalizeText(recipe?.description);
  const safeIngredients = normalizeList(recipe?.ingredients);
  const safeSteps = normalizeList(recipe?.steps);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
            <span className="text-sm text-muted-foreground">Loading…</span>
            <div />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
          <Card className="overflow-hidden">
            <div className="aspect-[16/9] w-full bg-muted animate-pulse" />
            <CardHeader>
              <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (err || !recipe) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
            <div />
            <div />
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-10">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Couldn’t load recipe</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {err ?? "Unknown error."}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => window.location.reload()}>Retry</Button>
              <Button variant="secondary" onClick={() => navigate("/")}>Go home</Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button onClick={() => navigate(`/create?id=${recipe.id}`)}>
                Edit
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate("/")}>
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <Card className="overflow-hidden">
          {/* Cover image */}
          <motion.div
            layoutId={`image-${recipe.id}`}
            className="aspect-[16/9] w-full overflow-hidden"
          >
            <img
              src={recipe.image || PLACEHOLDER_IMAGE}
              alt={recipe.title}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </motion.div>

          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{recipe.title}</CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {recipe.difficulty ? <Badge variant="outline">{recipe.difficulty}</Badge> : null}
                  {recipe.minutes != null ? (
                    <>
                      <span>•</span>
                      <span>{recipe.minutes} min</span>
                    </>
                  ) : null}
                  {createdAt ? (
                    <>
                      <span>•</span>
                      <span>Posted {createdAt}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {recipe?.id ? <SaveToggle recipeId={recipe.id} /> : null}
              </div>
            </div>

            {Array.isArray(recipe.tags) && recipe.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {recipe.tags.map((t) => {
                  const tag = String(t);
                  return (
                    <TagPill
                      key={tag}
                      tag={tag}
                      onClick={() =>
                        navigate(`/search?q=${encodeURIComponent('#' + normalizeTag(tag))}`)
                      }
                    />
                  );
                })}
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-6">
            {safeDescription ? (
              <section className="space-y-2">
                <h3 className="text-lg font-semibold">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {safeDescription}
                </p>
              </section>
            ) : null}

            <Separator />

            <div className="grid md:grid-cols-2 gap-6">
              <section className="space-y-2">
                <h3 className="text-lg font-semibold">Ingredients</h3>
                {safeIngredients.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {safeIngredients.map((ing, i) => (
                      <li key={`${ing}-${i}`}>{ing}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No ingredients listed.</p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-semibold">Steps</h3>
                {safeSteps.length > 0 ? (
                  <ol className="list-decimal pl-5 space-y-2 text-sm">
                    {safeSteps.map((s, i) => (
                      <li key={i} className="whitespace-pre-wrap">{s}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No steps provided.</p>
                )}
              </section>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Back
            </Button>
            {isOwner ? (
              <Button onClick={() => navigate(`/create?id=${recipe.id}`)}>
                Edit recipe
              </Button>
            ) : (
              <div />
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
