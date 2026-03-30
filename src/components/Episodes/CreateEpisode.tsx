import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { Episode } from "../../types";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const CreateEpisode = () => {
  const { data: season, isLoading } = useSeason();

  const nextOrder = (season?.episodes?.length ?? 0) + 1;

  const [order, setOrder] = useState(nextOrder);
  const [name, setName] = useState("");
  const userEdited = useRef(false);

  // Sync order from season data when it loads, unless the user manually edited it
  useEffect(() => {
    if (!userEdited.current) {
      setOrder(nextOrder);
    }
  }, [nextOrder]);
  const [finale, setFinale] = useState(false);
  const [postMerge, setPostMerge] = useState(false);
  const [mergeOccurs, setMergeOccurs] = useState(false);

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

    const episode: Episode = {
      id: `episode_${order}`,
      season_id: season.id,
      season_num: season.order,
      order,
      name,
      finale,
      post_merge: postMerge,
      merge_occurs: mergeOccurs,
    };

    try {
      const ref = doc(db, "seasons", season.id);
      await updateDoc(ref, { episodes: arrayUnion(episode) });

      toast.success(`Episode ${order} added`);

      // Reset for next episode
      userEdited.current = false;
      setOrder(order + 1);
      setName("");
      setFinale(false);
      setPostMerge(postMerge || mergeOccurs);
      setMergeOccurs(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create episode",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new Episode</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
          <div>
            <Label>Season</Label>
            <Input
              readOnly
              value={`${season.name} (${season.id})`}
            />
          </div>

          <div>
            <Label>Episode #</Label>
            <Input
              type="number"
              min={1}
              required
              value={order}
              onChange={(e) => {
                userEdited.current = true;
                setOrder(Number(e.target.value));
              }}
            />
          </div>

          <div>
            <Label>Episode Name</Label>
            <Input
              placeholder="e.g. The Marooning"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mergeOccurs}
                onChange={(e) => setMergeOccurs(e.target.checked)}
              />
              Merge occurs
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={postMerge}
                onChange={(e) => setPostMerge(e.target.checked)}
              />
              Post-merge
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={finale}
                onChange={(e) => setFinale(e.target.checked)}
              />
              Finale
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
