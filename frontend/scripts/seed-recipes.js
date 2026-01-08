import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

console.log("SUPABASE_URL:", process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
console.log("HAS_SERVICE_ROLE:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("HAS_ANON:", !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY));


const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
};

const countArg = Number(getArg("--count") ?? "200");
const count = Number.isFinite(countArg) && countArg > 0 ? countArg : 200;
const authorId = getArg("--author-id") ?? process.env.SUPABASE_SEED_AUTHOR_ID ?? null;
const dryRun = args.includes("--dry-run");

if (!authorId && !dryRun) {
  console.error(
    "Missing author id. Set SUPABASE_SEED_AUTHOR_ID in .env.local (recommended)."
  );
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const adjectives = [
  "Crispy",
  "Zesty",
  "Smoky",
  "Creamy",
  "Herby",
  "Spicy",
  "Tangy",
  "Golden",
  "Rustic",
  "Bright",
  "Garlicky",
  "Sweet",
];

const mains = [
  "Lemon Chicken",
  "Roasted Veggie Bowl",
  "Tomato Basil Pasta",
  "Miso Salmon",
  "Chickpea Curry",
  "Mushroom Risotto",
  "Thai Noodles",
  "BBQ Tofu",
  "Shrimp Tacos",
  "Beef Stir-Fry",
  "Quinoa Salad",
  "Pesto Gnocchi",
];

const tagPool = [
  "quick",
  "healthy",
  "comfort",
  "vegan",
  "gluten-free",
  "dairy-free",
  "high-protein",
  "family",
  "weeknight",
  "meal-prep",
  "spicy",
  "low-carb",
];

const ingredientPool = [
  "olive oil",
  "garlic",
  "onion",
  "salt",
  "black pepper",
  "lemon",
  "fresh basil",
  "parsley",
  "cumin",
  "paprika",
  "chili flakes",
  "soy sauce",
  "coconut milk",
  "ginger",
  "bell pepper",
  "zucchini",
  "carrot",
  "spinach",
  "parmesan",
  "chicken breast",
  "salmon fillet",
  "tofu",
  "chickpeas",
  "rice",
  "pasta",
];

const stepTemplates = [
  "Prep all ingredients and preheat the pan over medium heat.",
  "Sauté aromatics until fragrant, about 2 minutes.",
  "Add the main ingredient and cook until browned.",
  "Stir in seasonings and simmer until flavors meld.",
  "Finish with fresh herbs and adjust seasoning to taste.",
  "Serve warm with your favorite side.",
];

const images = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1400&q=80",
];

const difficulties = ["Easy", "Medium", "Hard"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickMany = (arr, count) => {
  const copy = [...arr];
  const chosen = [];
  while (chosen.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    chosen.push(copy.splice(idx, 1)[0]);
  }
  return chosen;
};

const buildRecipe = (index) => {
  const title = `${pick(adjectives)} ${pick(mains)}`;
  const minutes = Math.floor(Math.random() * 50) + 15;
  const difficulty = pick(difficulties);
  const tags = pickMany(tagPool, Math.floor(Math.random() * 3) + 2);
  const ingredients = pickMany(ingredientPool, Math.floor(Math.random() * 6) + 6);
  const steps = pickMany(stepTemplates, Math.floor(Math.random() * 3) + 4).map(
    (text, idx) => ({
      order: idx + 1,
      text,
    })
  );
  const description = `Batch recipe ${index + 1}: ${title} with ${tags.join(", ")}.`;
  const created_at = new Date(Date.now() - Math.floor(Math.random() * 1209600000)).toISOString();

  const recipe = {
  title,
  minutes,
  difficulty,
  image: pick(images),
  tags,
  ingredients,
  steps,
  description,
  created_at,
  author_id: authorId,
  created_by: authorId,
};

return recipe;



};

console.log("AUTHOR_ID:", authorId);


const buildRecipes = (total) => Array.from({ length: total }, (_, i) => buildRecipe(i));

const insertBatch = async (batch) => {
  const { error } = await supabase.from("recipes").insert(batch);
  if (error) {
    throw error;
  }
};

const run = async () => {
  const recipes = buildRecipes(count);
  if (dryRun) {
    console.log("Dry run enabled. Sample payload:");
    console.log(JSON.stringify(recipes[0], null, 2));
    return;
  }

  const batchSize = 50;
  for (let i = 0; i < recipes.length; i += batchSize) {
    const batch = recipes.slice(i, i + batchSize);
    await insertBatch(batch);
    console.log(`Inserted ${Math.min(i + batch.length, recipes.length)} / ${recipes.length}`);
  }

  console.log(`Done! Inserted ${recipes.length} recipes.`);
};

run().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});