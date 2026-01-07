import { useEffect, useState } from "react";
import { supabase, supabasePublic } from "@/lib/supabase";

type UseRecipeLikeOptions = {
  onAuthRequired?: () => void;
};

export function useRecipeLike(recipeId: string, options?: UseRecipeLikeOptions) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function getUserId() {
    const { data, error } = await supabase.auth.getUser();
    return { uid: data?.user?.id ?? null, error };
  }

  async function fetchPublicLikeCount() {
    const response = await fetch(
      `/api/recipe-likes-count?recipeId=${encodeURIComponent(recipeId)}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch public like count (${response.status})`);
    }
    const payload = (await response.json()) as { count?: number };
    if (typeof payload.count !== "number") {
      throw new Error("Public like count response missing count");
    }
    return payload.count;
  }

  async function refresh() {
    setLoading(true);
    try {
      const { uid, error: userErr } = await getUserId();
      if (userErr) {
        console.warn("Failed to read auth user for likes:", userErr.message);
      }

      let resolvedCount: number | null = null;
      if (!uid) {
        try {
          resolvedCount = await fetchPublicLikeCount();
        } catch (err) {
          console.warn("Failed to fetch public like count:", err);
        }
      } else {
        const { count: totalCount, error: countErr } = await supabasePublic
          .from("recipe_likes")
          .select("recipe_id", { count: "exact", head: true })
          .eq("recipe_id", recipeId);

        if (countErr) {
          console.warn("Failed to fetch like count:", {
            message: countErr.message,
            details: (countErr as any).details,
            hint: (countErr as any).hint,
            code: (countErr as any).code,
          });
        } else {
          resolvedCount = totalCount ?? 0;
        }
      }

      if (resolvedCount !== null) {
        console.info("Like count for recipe:", recipeId, resolvedCount);
        setCount(resolvedCount);
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
    const { uid } = await getUserId();
    if (!uid) {
      options?.onAuthRequired?.();
      throw new Error("Not authenticated");
    }

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
