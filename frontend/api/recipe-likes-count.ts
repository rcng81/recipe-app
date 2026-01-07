import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const recipeId = req.query?.recipeId;
  if (typeof recipeId !== "string" || recipeId.trim().length === 0) {
    res.status(400).json({ error: "Missing recipeId" });
    return;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: "Supabase server env not configured" });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { count, error } = await supabaseAdmin
    .from("recipe_likes")
    .select("recipe_id", { count: "exact", head: true })
    .eq("recipe_id", recipeId);

  if (error) {
    res.status(500).json({
      error: "Failed to fetch like count",
      details: error.message,
    });
    return;
  }

  res.status(200).json({ count: count ?? 0 });
}
