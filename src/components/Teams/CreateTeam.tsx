import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "sonner";
import { v4 } from "uuid";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { Team } from "../../types";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const SURVIVOR_SWATCHES = [
  "#3B82F6",
  "#EF4444",
  "#22C55E",
  "#EAB308",
  "#A855F7",
  "#F97316",
  "#EC4899",
  "#14B8A6",
  "#000000",
];

export const CreateTeam = () => {
  const { data: season, isLoading } = useSeason();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [nameError, setNameError] = useState("");
  const [colorError, setColorError] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!season) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!name.trim()) {
      setNameError("Team name required");
      hasError = true;
    } else {
      setNameError("");
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      setColorError("Valid hex color required");
      hasError = true;
    } else {
      setColorError("");
    }
    if (hasError) return;

    const payload: Team = {
      id: `team_${v4()}`,
      season_id: season.id,
      season_num: season.order,
      name,
      color,
    };

    try {
      const ref = doc(db, `teams/${season.id}`);
      await setDoc(ref, { [payload.id]: payload }, { merge: true });

      toast.success(`Team "${name}" added`);

      setName("");
      setColor("#3B82F6");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create team",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new Team</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
          <div>
            <Label>Season</Label>
            <Input readOnly value={`${season.name} (${season.id})`} />
          </div>

          <div>
            <Label>Team Name *</Label>
            <Input
              placeholder="e.g. Luvu"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
            />
            {nameError && (
              <p className="mt-1 text-xs text-destructive">{nameError}</p>
            )}
          </div>

          <div>
            <Label>Team Color *</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setColorError("");
                }}
                className="h-10 w-10 cursor-pointer rounded border"
              />
              <Input
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setColorError("");
                }}
                className="w-28"
              />
            </div>
            <div className="mt-2 flex gap-1">
              {SURVIVOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: swatch }}
                  onClick={() => {
                    setColor(swatch);
                    setColorError("");
                  }}
                />
              ))}
            </div>
            {colorError && (
              <p className="mt-1 text-xs text-destructive">{colorError}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
