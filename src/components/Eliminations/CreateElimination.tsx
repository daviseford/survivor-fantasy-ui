import { doc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { last, orderBy } from "lodash-es";
import { FormEvent, useEffect, useState } from "react";
import { v4 } from "uuid";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { Elimination, EliminationVariants } from "../../types";
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

const dropdownOptions = EliminationVariants.slice().reverse();

export const CreateElimination = () => {
  const { data: season, isLoading } = useSeason();
  const { data: eliminations } = useEliminations(season?.id);

  const [formId, setFormId] = useState(`elimination_${v4()}`);
  const [episodeNum, setEpisodeNum] = useState(1);
  const [order, setOrder] = useState(0);
  const [variant, setVariant] = useState<string>(dropdownOptions[0]);
  const [playerName, setPlayerName] = useState("");
  const [playerError, setPlayerError] = useState("");

  useEffect(() => {
    if (season && eliminations) {
      const nextOrder =
        (last(orderBy(eliminations, (x) => x.order))?.order || 0) + 1;
      const ep = season.episodes.length;
      setEpisodeNum(ep);
      setOrder(nextOrder);
    }
  }, [season, eliminations]);

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
        Create an Episode first before adding eliminations
      </p>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName) {
      setPlayerError("Select a player");
      return;
    }
    setPlayerError("");

    const values: Elimination = {
      id: formId as Elimination["id"],
      season_num: season.order,
      season_id: season.id,
      episode_id: `episode_${episodeNum}` as Elimination["episode_id"],
      episode_num: episodeNum,
      player_name: playerName,
      variant: variant as Elimination["variant"],
      order,
    };

    const ref = doc(db, `eliminations/${season?.id}`);
    await setDoc(ref, { [values.id]: values }, { merge: true });

    setFormId(`elimination_${v4()}`);
    setPlayerName("");
  };

  const eliminatedPlayers = Object.values(eliminations).map(
    (x) => x.player_name,
  );
  const playerNames = season?.players
    .map((x) => x.name)
    .filter((x) => !eliminatedPlayers.includes(x));

  const formValues = {
    id: formId,
    season_num: season.order,
    season_id: season.id,
    episode_id: `episode_${episodeNum}`,
    episode_num: episodeNum,
    player_name: playerName,
    variant,
    order,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new Elimination</CardTitle>
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
              <Label>Elimination Variant</Label>
              <Select value={variant} onValueChange={setVariant}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Eliminated Player</Label>
              <Select
                value={playerName}
                onValueChange={(v) => { setPlayerName(v); setPlayerError(""); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {playerNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {playerError && (
                <p className="text-sm text-destructive">
                  {playerError}
                </p>
              )}
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
