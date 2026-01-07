import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UseRecipeLikeOptions = {
  onAuthRequired?: () => void;
  initialCount?: number | null;
};

export function useRecipeLike(recipeId: string, options?: UseRecipeLikeOptions) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(options?.initialCount ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof options?.initialCount === "number") {
      setCount(options.initialCount);
    }
  }, [options?.initialCount]);

  async function refresh() {
    setLoading(true);
    try {
      const { count: totalCount, error: countErr } = await supabase
        .from("recipe_likes")
        .select("*", { count: "exact", head: true })
        .eq("recipe_id", recipeId);

      if (countErr) {
        console.warn("Failed to fetch like count:", countErr.message);
      } else {
        setCount(totalCount ?? 0);
      }

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      if (userErr) {
        console.warn("Failed to read auth user for likes:", userErr.message);
      }

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      if (userErr) {
        console.warn("Failed to read auth user for likes:", userErr.message);
      }

      if (uid) {
        const { count: userCount, error: likedErr } = await supabase
          .from("recipe_likes")
          .select("*", { count: "exact", head: true })
          .eq("recipe_id", recipeId)
          .eq("user_id", uid);

        if (likedErr) throw likedErr;
        setLiked((userCount ?? 0) > 0);
      } else {
        setLiked(false);
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error?.message ||
        (typeof err === "string" ? err : JSON.stringify(err));
      console.error("Failed to refresh like state:", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [recipeId]);

  async function toggle() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      options?.onAuthRequired?.();
      throw new Error("Not authenticated");
    }
    const uid = user.id;

    try {
      if (liked) {
        const { error } = await supabase
          .from("recipe_likes")
          .delete()
          .eq("user_id", uid)
          .eq("recipe_id", recipeId);

        if (error) {
          console.error("Supabase delete error:", {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
          });
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("recipe_likes")
          .insert([{ user_id: uid, recipe_id: recipeId }]);

        if (error && (error as any).code !== "23505") {
          console.error("Supabase insert error:", {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
          });
          throw error;
        }
      }
    } finally {
      await refresh();
      window.dispatchEvent(new CustomEvent("likes-changed"));
    }
  }

  return { liked, count, loading, toggle, refresh };
}
