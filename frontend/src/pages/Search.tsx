import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useRecipeLike } from "@/hooks/useRecipeLike";

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

type SortKey = "relevance" | "newest" | "oldest" | "timeAsc" | "timeDesc";

export default function Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initialQ = (params.get("q") || "").trim();
  const [qInput, setQInput] = useState(initialQ);
  const [diffs, setDiffs] = useState<Set<Recipe["difficulty"]>>(new Set());
  const [maxMinutes, setMaxMinutes] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortKey>("relevance");

  const [results, setResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pageSize = 12;
  const page = Math.max(1, Number(params.get("page") || 1));
  const offset = (page - 1) * pageSize;
  const [total, setTotal] = useState<number>(0);

  const queryFromURL = (params.get("q") || "").trim();

  useEffect(() => {
    setQInput(queryFromURL);
  }, [queryFromURL]);

  const isTagSearch = useMemo(() => {
    return queryFromURL.startsWith("#") && queryFromURL.slice(1).trim().length > 0;
  }, [queryFromURL]);

  async function runSearch() {
    setLoading(true);
    setErr(null);
    try {
      let query = supabase
        .from("recipes")
        .select("id, title, minutes, difficulty, image, tags, created_at", { count: "exact" });
      const q = queryFromURL;
      if (q) {
        if (isTagSearch) {
          const tag = q.slice(1).trim().toLowerCase();
          query = query.contains("tags", [tag]);
        } else {
          query = query.ilike("title", `%${q}%`);
        }
      }

      if (diffs.size > 0) {
        const ors = Array.from(diffs)
          .map((d) => `difficulty.eq.${encodeURIComponent(d)}`)
          .join(",");
        query = query.or(ors);
      }
      if (typeof maxMinutes === "number") {
        query = query.lte("minutes", maxMinutes);
      }

      if (sortBy === "newest" || (sortBy === "relevance" && (isTagSearch || !q))) {
        query = query.order("created_at", { ascending: false, nullsFirst: false });
      } else if (sortBy === "oldest") {
        query = query.order("created_at", { ascending: true, nullsFirst: false });
      } else if (sortBy === "timeAsc") {
        query = query.order("minutes", { ascending: true, nullsFirst: false });
      } else if (sortBy === "timeDesc") {
        query = query.order("minutes", { ascending: false, nullsFirst: false });
      }

      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const mapped: Recipe[] =
        (data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          minutes: row.minutes,
          difficulty: row.difficulty as Recipe["difficulty"],
          image: row.image || PLACEHOLDER_IMAGE,
          tags: row.tags ?? [],
          created_at: row.created_at,
        })) ?? [];

      setResults(mapped);
      setTotal(count ?? 0);
    } catch (e: any) {
      setErr(e.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch();
  }, [queryFromURL, page, Array.from(diffs).join("|"), maxMinutes, sortBy]);

  function submitNewQuery(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (qInput) {
      next.set("q", qInput);
    } else {
      next.delete("q");
    }
    next.set("page", "1");
    setParams(next, { replace: false });
  }

  function clearAll() {
    setDiffs(new Set());
    setMaxMinutes(undefined);
    setSortBy("relevance");
    const next = new URLSearchParams();
    if (queryFromURL) next.set("q", queryFromURL);
    next.set("page", "1");
    setParams(next, { replace: false });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/")}>Back</Button>
          <form onSubmit={submitNewQuery} className="flex items-center gap-2 w-full max-w-2xl ml-2">
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder='Search recipes (tip: try #vegan, "chicken", or "30 min")'
              name="q"
            />
            <Button type="submit">Search</Button>
          </form>
          <Button className="hidden md:inline-flex" onClick={() => navigate("/create")}>
            New recipe
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Filters row */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filters:</span>

              <DifficultyPills
                value={diffs}
                onChange={(next) => {
                  setDiffs(next);
                  const nextParams = new URLSearchParams(params);
                  nextParams.set("page", "1");
                  setParams(nextParams);
                }}
              />

              <div className="flex items-center gap-2">
                <span className="text-sm">Max minutes</span>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 30"
                  className="w-24"
                  value={typeof maxMinutes === "number" ? maxMinutes : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMaxMinutes(v ? Math.max(1, Number(v)) : undefined);
                    const nextParams = new URLSearchParams(params);
                    nextParams.set("page", "1");
                    setParams(nextParams);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SortSelect value={sortBy} onChange={setSortBy} hasQuery={!!queryFromURL} isTag={isTagSearch} />
              <Button variant="ghost" onClick={clearAll}>Clear</Button>
            </div>
          </div>

          {/* Active chips */}
          <div className="flex flex-wrap gap-2">
            {!!queryFromURL && (
              <Badge variant="secondary">Query: {queryFromURL}</Badge>
            )}
            {diffs.size > 0 &&
              Array.from(diffs).map((d) => (
                <Badge key={d} variant="outline" className="cursor-default">{d}</Badge>
              ))}
            {typeof maxMinutes === "number" && (
              <Badge variant="outline" className="cursor-default">≤ {maxMinutes} min</Badge>
            )}
            {(!queryFromURL && diffs.size === 0 && typeof maxMinutes !== "number") && (
              <span className="text-sm text-muted-foreground">No filters</span>
            )}
          </div>
        </section>

        <Separator />

        {/* Results */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {loading ? "Searching…" : `Results (${total})`}
            </h2>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={(p) => {
                const next = new URLSearchParams(params);
                next.set("page", String(p));
                setParams(next, { replace: false });
              }}
            />
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-muted-foreground"
              >
                Loading recipes…
              </motion.div>
            ) : err ? (
              <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ErrorCard message={err} onRetry={runSearch} />
              </motion.div>
            ) : results.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  title="No results"
                  description="Try a different keyword, remove some filters, or search by tag (e.g. #vegan)."
                  actionLabel="Clear filters"
                  onAction={clearAll}
                />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RecipeGrid
                  recipes={results}
                  onOpen={(id) => navigate(`/recipe/${id}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={(p) => {
                const next = new URLSearchParams(params);
                next.set("page", String(p));
                setParams(next, { replace: false });
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function DifficultyPills({
  value,
  onChange,
}: {
  value: Set<Recipe["difficulty"]>;
  onChange: (next: Set<Recipe["difficulty"]>) => void;
}) {
  const opts: Recipe["difficulty"][] = ["Easy", "Medium", "Hard"];
  return (
    <div className="flex gap-2">
      {opts.map((d) => {
        const active = value.has(d);
        return (
          <Button
            key={d}
            size="sm"
            variant={active ? "default" : "secondary"}
            className="rounded-full"
            onClick={() => {
              const next = new Set(value);
              if (active) next.delete(d);
              else next.add(d);
              onChange(next);
            }}
          >
            {d}
          </Button>
        );
      })}
    </div>
  );
}

function SortSelect({
  value,
  onChange,
  hasQuery,
  isTag,
}: {
  value: SortKey;
  onChange: (s: SortKey) => void;
  hasQuery: boolean;
  isTag: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Sort</span>
      <select
        className="border bg-background text-sm rounded-md px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        title="Sort results"
      >
        <option value="relevance">
          {hasQuery && !isTag ? "Relevance (default)" : "Default"}
        </option>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="timeAsc">Time ↑</option>
        <option value="timeDesc">Time ↓</option>
      </select>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}>
        Prev
      </Button>
      <span className="text-sm tabular-nums">
        {page} / {totalPages}
      </span>
      <Button size="sm" variant="outline" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
        Next
      </Button>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Search error</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {message}
      </CardContent>
      <CardFooter>
        <Button onClick={onRetry}>Retry</Button>
      </CardFooter>
    </Card>
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
      <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
      <CardFooter>
        <Button onClick={onAction}>{actionLabel}</Button>
      </CardFooter>
    </Card>
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
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 1 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.06, delayChildren: 0.05 },
        },
      }}
    >
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />
      ))}
    </motion.div>
  );
}

function RecipeCard({
  recipe,
  onOpen,
}: {
  recipe: Recipe;
  onOpen: (id: string) => void;
}) {
  const { liked, count, loading, toggle } = useRecipeLike(recipe.id);

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="group"
    >
      <Card className="overflow-hidden transition-shadow group-hover:shadow-lg">
        <div className="aspect-[16/10] w-full overflow-hidden">
          <motion.img
            src={recipe.image || PLACEHOLDER_IMAGE}
            alt={recipe.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.25 }}
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
          <motion.button
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm"
            onClick={() => onOpen(recipe.id)}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.12 }}
          >
            View
          </motion.button>

          <LikeButton
            liked={liked}
            onPress={async () => {
              if (loading) return;
              try {
                await toggle();
              } catch (e) {
                console.error("Failed to toggle like:", e);
              }
            }}
            count={typeof count === "number" ? count : undefined}
          />
        </CardFooter>
      </Card>
    </motion.article>
  );
}

function LikeButton({
  liked,
  onPress,
  count,
}: {
  liked: boolean;
  onPress: () => void;
  count?: number | null;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={liked}
      className="relative inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:text-foreground text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <span>{liked ? "❤️" : "🤍"}</span>
      {typeof count === "number" && <span className="text-xs tabular-nums">{count}</span>}
      <span className="sr-only">{liked ? "Unlike" : "Like"}</span>
    </button>
  );
}
