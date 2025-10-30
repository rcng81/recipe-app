import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Difficulty = "Easy" | "Medium" | "Hard";

type Ingredient = {
  id: string;
  text: string;
};

type StepItem = {
  id: string;
  text: string;
};

export default function CreateRecipe() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/login");
    })();
  }, [navigate]);

  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState<number | "">("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);


  const [steps, setSteps] = useState<StepItem[]>([
    { id: crypto.randomUUID(), text: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 2 &&
      typeof minutes === "number" &&
      minutes > 0 &&
      ingredients.length > 0 &&
      steps.some((s) => s.text.trim().length > 0)
    );
  }, [title, minutes, ingredients, steps]);

  function handleAddIngredient() {
    const t = ingredientInput.trim();
    if (!t) return;
    setIngredients((prev) => [...prev, { id: crypto.randomUUID(), text: t }]);
    setIngredientInput("");
  }
  function handleRemoveIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }


  function addStepRow() {
    setSteps((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);
  }
  function removeStepRow(id: string) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }

  function handleAddTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput("");
  }
  function handleRemoveTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    const errs: string[] = [];
    if (title.trim().length < 3) errs.push("Title must be at least 3 characters.");
    if (typeof minutes !== "number" || minutes <= 0) errs.push("Minutes must be a positive number.");
    if (ingredients.length === 0) errs.push("Add at least one ingredient.");
    if (!steps.some((s) => s.text.trim().length > 0)) errs.push("Add at least one step.");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        minutes,
        difficulty,
        image: imageUrl.trim() || null,
        tags,
        ingredients: ingredients
          .map((i) => i.text.trim())
          .filter((t) => t.length > 0),
        steps: steps
          .map((s, idx) => ({ order: idx + 1, text: s.text.trim() }))
          .filter((s) => s.text.length > 0),
        created_at: new Date().toISOString(),
      };

      // TODO: Replace this with a Supabase insert when your table is ready.
      // Example:
      // const { data, error } = await supabase
      //   .from("recipes")
      //   .insert(payload)
      //   .select()
      //   .single();
      // if (error) throw error;
      // navigate(`/recipe/${data.id}`);

      console.log("SUBMIT RECIPE PAYLOAD:", payload);
      // For now, just go back home (or to a preview route if you add one)
      navigate("/");
    } catch (err: any) {
      setErrors([err?.message ?? "Failed to create recipe."]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Create a recipe</CardTitle>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit || submitting}>
                  {submitting ? "Saving..." : "Publish"}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Creamy Garlic Pasta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Meta (minutes + difficulty) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minutes">Minutes</Label>
                  <Input
                    id="minutes"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="e.g., 20"
                    value={minutes}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMinutes(v === "" ? "" : Number(v));
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Image URL (simple for now) */}
              <div className="space-y-2">
                <Label htmlFor="image">Image URL (optional)</Label>
                <Input
                  id="image"
                  placeholder="Paste an image URL or leave blank"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                {imageUrl && (
                  <div className="mt-2 overflow-hidden rounded-md border">
                    <img
                      src={imageUrl}
                      alt="Recipe preview"
                      className="w-full h-48 object-cover"
                      onError={() => {/* ignore preview errors */}}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Ingredients */}
              <div className="space-y-3">
                <Label className="text-base">Ingredients</Label>

                <div className="flex gap-2">
                  <Input
                    placeholder='Type an ingredient and press "Add" (e.g., 200g spaghetti)'
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddIngredient();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddIngredient}>
                    Add ingredient
                  </Button>
                </div>

                {ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ingredients.map((ing) => (
                      <Badge
                        key={ing.id}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        title="Click to remove"
                      >
                        {ing.text}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>


              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Steps</Label>
                  <Button type="button" size="sm" onClick={addStepRow}>
                    Add step
                  </Button>
                </div>

                <div className="space-y-2">
                  {steps.map((stp, idx) => (
                    <div key={stp.id} className="flex items-start gap-2">
                      <div className="h-9 w-9 flex items-center justify-center rounded-md border text-sm text-muted-foreground">
                        {idx + 1}
                      </div>
                      <Textarea
                        placeholder={
                          idx === 0 ? "Describe the first step..." : "Add another step..."
                        }
                        value={stp.text}
                        onChange={(e) =>
                          setSteps((prev) =>
                            prev.map((it) =>
                              it.id === stp.id ? { ...it, text: e.target.value } : it
                            )
                          )
                        }
                        className="min-h-[80px]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStepRow(stp.id)}
                        aria-label="Remove step"
                        disabled={steps.length === 1}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-base">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder='Type a tag and press "Add" (e.g., Vegetarian)'
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(t)}
                        title="Click to remove"
                      >
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <ul className="list-disc pl-5 space-y-1">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Saving..." : "Publish"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
}
