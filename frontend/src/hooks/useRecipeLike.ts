import { useEffect, useState, useCallback } from "react";
import { fetchIsLiked, fetchLikesCount, likeRecipe, unlikeRecipe } from "@/services/likes";

export function useRecipeLike(recipeId: string) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [isLiked, total] = await Promise.all([
          fetchIsLiked(recipeId),
          fetchLikesCount(recipeId),
        ]);
        if (!mounted) return;
        setLiked(isLiked);
        setCount(total);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [recipeId]);

  const toggle = useCallback(async () => {
    // optimistic update
    setLiked((prev) => !prev);
    setCount((prev) => (prev == null ? prev : prev + (liked ? -1 : 1)));
    try {
      if (liked) await unlikeRecipe(recipeId);
      else await likeRecipe(recipeId);
    } catch (e) {
      // revert on error
      setLiked((prev) => !prev);
      setCount((prev) => (prev == null ? prev : prev + (liked ? 1 : -1)));
      throw e;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId, liked]);

  return { liked, count, loading, toggle, setLiked, setCount };
}
