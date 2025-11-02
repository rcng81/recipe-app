import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useRecipeLike(recipeId: string) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;

      const { count: totalCount, error: countErr } = await supabase
        .from("recipe_likes")
        .select("*", { count: "exact", head: true })
        .eq("recipe_id", recipeId);

      if (countErr) throw countErr;
      setCount(totalCount ?? 0);

      if (uid) {
        const { count: userCount, error: userErr } = await supabase
          .from("recipe_likes")
          .select("*", { count: "exact", head: true })
          .eq("recipe_id", recipeId)
          .eq("user_id", uid);

        if (userErr) throw userErr;
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
    if (!user) throw new Error("Not authenticated");
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
