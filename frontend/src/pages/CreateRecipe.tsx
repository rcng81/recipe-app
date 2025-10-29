import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function CreateRecipe() {
  const navigate = useNavigate();

  // (Optional) simple auth guard like Home()
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/login");
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create a recipe</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Empty for now — we'll build the form here next */}
            <p className="text-sm text-muted-foreground">
              Coming soon: title, ingredients, steps, tags, image upload…
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
