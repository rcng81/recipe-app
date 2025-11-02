import { supabase } from "@/lib/supabase";

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function fetchIsLiked(recipeId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { data, error } = await supabase
    .from("recipe_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function fetchLikesCount(recipeId: string): Promise<number> {
  const { count, error } = await supabase
    .from("recipe_likes")
    .select("*", { count: "exact", head: true })
    .eq("recipe_id", recipeId);

  if (error) throw error;
  return count ?? 0;
}

export async function likeRecipe(recipeId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("recipe_likes")
    .insert({ user_id: userId, recipe_id: recipeId });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function unlikeRecipe(recipeId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("recipe_likes")
    .delete()
    .eq("user_id", userId)
    .eq("recipe_id", recipeId);

  if (error) throw error;
}
