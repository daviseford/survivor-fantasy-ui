import { doc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { v4 } from "uuid";
import { BASE_PLAYER_SCORING } from "../../data/scoring";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { GameEvent, GameEventActions } from "../../types";
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

export const CreateGameEvent = () => {
  const { data: season, isLoading } = useSeason();
  const { data: eliminations } = useEliminations(season?.id);

  const [formId, setFormId] = useState(`event_${v4()}`);
  const [episodeNum, setEpisodeNum] = useState(1);
  const [action, setAction] = useState<string>(GameEventActions[0]);
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerError, setPlayerError] = useState("");

  useEffect(() => {
    if (season) {
      const ep = season.episodes.length;
      setEpisodeNum(ep);
    }
  }, [season]);

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

  const currentAction = BASE_PLAYER_SCORING.find((x) => x.action === action);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName) {
      setPlayerError("Select a player");
      return;
    }
    setPlayerError("");

    const values: GameEvent = {
      id: formId as GameEvent["id"],
      season_num: season.order,
      season_id: season.id,
      episode_id: `episode_${episodeNum}` as GameEvent["episode_id"],
      episode_num: episodeNum,
      action: action as GameEvent["action"],
      multiplier: currentAction?.multiplier ? multiplier : null,
      player_name: playerName,
    };

    console.log({ values });

    const ref = doc(db, `events/${season?.id}`);
    await setDoc(ref, { [values.id]: values }, { merge: true });

    setFormId(`event_${v4()}`);
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
    action,
    multiplier: currentAction?.multiplier ? multiplier : null,
    player_name: playerName,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new Event</CardTitle>
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
              <Label>Player Name</Label>
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
              <Label>Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GameEventActions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentAction?.description && (
                <p className="text-xs text-muted-foreground">
                  {currentAction.description}
                </p>
              )}
            </div>
            {currentAction?.multiplier && (
              <div className="space-y-1">
                <Label>How many?</Label>
                <Input
                  type="number"
                  value={multiplier ?? ""}
                  onChange={(e) =>
                    setMultiplier(e.target.value ? Number(e.target.value) : null)
                  }
                />
              </div>
            )}
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
