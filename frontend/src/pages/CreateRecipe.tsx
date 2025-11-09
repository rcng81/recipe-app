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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TAG_OPTIONS, normalizeTag, toTitleCase } from "@/constants/tags";

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

  // auth guard (simple)
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) navigate("/login");
    })();
  }, [navigate]);

  // Form state
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState<number | "">("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const previewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  // Tags
  const [tags, setTags] = useState<string[]>([]);

  // Ingredients (chip-style add)
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");

  // Steps (rich list)
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
      (ingredients.length > 0 ||
        steps.some((s) => s.text.trim().length > 0)) // at least something meaningful
    );
  }, [title, minutes, ingredients, steps]);

  // --- Tag handlers ---
  function toggleTag(tag: string) {
  setTags((prev) => {
    const norm = normalizeTag(tag);
    const set = new Set(prev.map(normalizeTag));
    if (set.has(norm)) {
      // remove
      return prev.filter((t) => normalizeTag(t) !== norm);
    } else {
      // add
      return [...prev, tag];
    }
  });
}



  // --- Ingredient (chip) handlers ---
  function handleAddIngredient() {
    const val = ingredientInput.trim();
    if (!val) return;
    setIngredients((prev) => [...prev, { id: crypto.randomUUID(), text: val }]);
    setIngredientInput("");
  }
  function handleRemoveIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  // --- Step handlers ---
  function addStepRow() {
    setSteps((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);
  }
  function removeStepRow(id: string) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    const errs: string[] = [];
    if (title.trim().length < 3) errs.push("Title must be at least 3 characters.");
    if (typeof minutes !== "number" || minutes <= 0)
      errs.push("Minutes must be a positive number.");
    if (ingredients.length === 0 && !steps.some((s) => s.text.trim().length > 0))
      errs.push("Add at least one ingredient or one step.");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Not authenticated.");

      let uploadedUrl: string | null = null;
      if (imageFile) {
        setUploading(true);
        const ext = imageFile.name.split(".").pop() || "jpg";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `recipes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(filePath);

        uploadedUrl = publicUrlData.publicUrl;
        setUploading(false);
      }

      // Build payload
      const payload = {
        title: title.trim(),
        minutes,
        difficulty,
        image: uploadedUrl,
        tags,
        ingredients: ingredients.map((i) => i.text.trim()).filter(Boolean),
        steps: steps
          .map((s, idx) => ({ order: idx + 1, text: s.text.trim() }))
          .filter((s) => s.text.length > 0),
        created_at: new Date().toISOString(),
      };
      console.log("Testing Supabase insert...");
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("SESSION USER:", sessionData?.session?.user?.id);

      const { data: s } = await supabase.auth.getSession();
      const uid = s?.session?.user?.id;
      if (!uid) {
        setErrors(["You must be signed in."]);
        setSubmitting(false);
        return;
      }

      // Upsert profile row (id must equal auth.uid())
      const { error: upsertProfileErr } = await supabase
        .from("profiles")
        .upsert({ id: uid }, { onConflict: "id" });
      if (upsertProfileErr) {
        setErrors([`Profile setup failed: ${upsertProfileErr.message}`]);
        setSubmitting(false);
        return;
      }


  // Insert the real recipe (no more "RLS Smoke Test")
  const { data, error } = await supabase
    .from("recipes")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("❌ Insert failed:", error.message);
    setErrors([error.message]);
    setSubmitting(false);
    return;
  }

console.log("✅ Insert succeeded:", data);

// If you DON'T have a /recipe/:id page yet, go home for now:
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
                <Button type="submit" disabled={!canSubmit || submitting || uploading}>
                  {submitting ? "Saving..." : uploading ? "Uploading..." : "Publish"}
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

              {/* Meta */}
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

              {/* Image upload */}
              <div className="space-y-2">
                <Label htmlFor="image-file">Upload image (optional)</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImageFile(file);
                  }}
                />
                {previewUrl && (
                  <div className="mt-2 overflow-hidden rounded-md border">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Ingredients (chip add) */}
              <div className="space-y-2">
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
                  <Button type="button" onClick={handleAddIngredient}>
                    Add
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

              {/* Tags (fixed set) */}
              <div className="space-y-2">
                <Label className="text-base">Tags</Label>

                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((t) => {
                    const active = tags.map(normalizeTag).includes(normalizeTag(t));
                    return (
                      <Button
                        key={t}
                        type="button"
                        variant={active ? "default" : "secondary"}
                        className="rounded-full h-8 px-3"
                        onClick={() => toggleTag(t)}
                      >
                        {t}
                      </Button>
                    );
                  })}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="cursor-default">
                        #{toTitleCase(normalizeTag(t))}
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
              <Button type="submit" disabled={!canSubmit || submitting || uploading}>
                {submitting ? "Saving..." : uploading ? "Uploading..." : "Publish"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
}
