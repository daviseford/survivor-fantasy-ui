import { doc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { last, orderBy } from "lodash-es";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 } from "uuid";
import { db } from "../../firebase";
import { useChallenges } from "../../hooks/useChallenges";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { Challenge, ChallengeWinAction, ChallengeWinActions } from "../../types";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export const CreateChallenge = () => {
  const { data: season, isLoading } = useSeason();
  const { data: eliminations } = useEliminations(season?.id);
  const { data: challenges } = useChallenges(season?.id);

  const [formId, setFormId] = useState(`challenge_${v4()}`);
  const [episodeNum, setEpisodeNum] = useState(1);
  const [order, setOrder] = useState(0);
  const [variant, setVariant] = useState<ChallengeWinAction>(ChallengeWinActions[0]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerError, setPlayerError] = useState("");

  useEffect(() => {
    if (season && challenges) {
      const nextOrder =
        (last(orderBy(challenges, (x) => x.order))?.order || 0) + 1;
      const ep = season.episodes.length;
      setEpisodeNum(ep);
      setOrder(nextOrder);
    }
  }, [season, challenges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!season?.episodes?.length) {
    return (
      <p className="py-8 text-center">
        Create an Episode first before adding events
      </p>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedPlayers.length === 0) {
      setPlayerError("Add winning player(s)");
      return;
    }
    setPlayerError("");

    const values: Challenge = {
      id: formId as Challenge["id"],
      season_num: season.order,
      season_id: season.id,
      episode_id: `episode_${episodeNum}` as Challenge["episode_id"],
      episode_num: episodeNum,
      variant,
      winning_players: selectedPlayers,
      order,
    };

    try {
      const ref = doc(db, `challenges/${season?.id}`);
      await setDoc(ref, { [values.id]: values }, { merge: true });

      setFormId(`challenge_${v4()}`);
      setSelectedPlayers([]);
      toast.success("Challenge created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create challenge",
      );
    }
  };

  const eliminatedPlayers = Object.values(eliminations).map(
    (x) => x.player_name,
  );
  const playerNames = season?.players
    .map((x) => x.name)
    .filter((x) => !eliminatedPlayers.includes(x));

  const formValues: Challenge = {
    id: formId as Challenge["id"],
    season_num: season.order,
    season_id: season.id,
    episode_id: `episode_${episodeNum}` as Challenge["episode_id"],
    episode_num: episodeNum,
    variant,
    winning_players: selectedPlayers,
    order,
  };

  const togglePlayer = (name: string) => {
    const updated = selectedPlayers.includes(name)
      ? selectedPlayers.filter((p) => p !== name)
      : [...selectedPlayers, name];
    setSelectedPlayers(updated);
    if (updated.length > 0) setPlayerError("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new Challenge</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <form
            onSubmit={onSubmit}
            className="mx-auto max-w-sm space-y-4"
          >
            <div className="space-y-1">
              <Label>Season #</Label>
              <Input readOnly value={season.order} />
            </div>
            <div className="space-y-1">
              <Label>Episode #</Label>
              <Input
                type="number"
                min={1}
                max={season.episodes.length}
                value={episodeNum}
                onChange={(e) => setEpisodeNum(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Order</Label>
              <Input
                type="number"
                min={1}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Winning Players</Label>
              <div className="flex flex-wrap gap-1">
                {playerNames.map((name) => (
                  <Button
                    key={name}
                    type="button"
                    size="sm"
                    variant={
                      selectedPlayers.includes(name) ? "default" : "outline"
                    }
                    onClick={() => togglePlayer(name)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
              {playerError && (
                <p className="text-sm text-destructive">
                  {playerError}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Challenge Variant</Label>
              <Select value={variant} onValueChange={(v) => setVariant(v as Challenge["variant"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ChallengeWinActions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Submit</Button>
            </div>
          </form>
          <div>
            <p className="mb-1 text-sm">Generated Payload:</p>
            <pre className="overflow-auto rounded border bg-muted p-3 text-xs">
              {JSON.stringify(formValues, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
