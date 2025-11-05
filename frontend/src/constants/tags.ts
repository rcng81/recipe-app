
export const TAG_OPTIONS = [
  "Breakfast", "Lunch", "Dinner", "Dessert",
  "Pasta", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto",
  "High Protein", "Low Carb", "Healthy", "Comfort Food", "Meal Prep",
  "Air Fryer", "BBQ", "One-Pot", "Slow Cooker", "Quick"
];

// A small subset to showcase on Home
export const TOP_TAGS = [
  "Breakfast", "Lunch", "Dinner", "Vegetarian", "High Protein", "Air Fryer", "Meal Prep", "Dessert"
];

// Re-usable helpers
export const normalizeTag = (t: string) => t.trim().toLowerCase();

export const toTitleCase = (t: string) =>
  t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
