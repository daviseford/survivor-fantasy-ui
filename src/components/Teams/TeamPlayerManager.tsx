import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { AlertCircle, Copy, Save } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { useTeamAssignments } from "../../hooks/useTeamAssignments";
import { useTeams } from "../../hooks/useTeams";
import { Team, TeamAssignmentSnapshot } from "../../types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const NO_TEAM_ID = "__no_team__";

const DraggablePlayerCard = ({ playerName }: { playerName: string }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: playerName });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-1 cursor-grab select-none rounded border bg-card p-2 text-sm shadow-sm"
    >
      {playerName}
    </div>
  );
};

const PlayerDragOverlay = ({ playerName }: { playerName: string }) => (
  <div className="rounded border bg-card p-2 text-sm font-semibold shadow-md">
    {playerName}
  </div>
);

type DroppableColumnProps = {
  id: string;
  title: string;
  color: string | null;
  players: string[];
};

const DroppableColumn = ({
  id,
  title,
  color,
  players,
}: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="min-h-[120px] rounded-lg border p-3"
      style={{
        borderColor: isOver
          ? "hsl(var(--primary))"
          : color ?? "hsl(var(--border))",
        borderWidth: color ? 2 : 1,
        backgroundColor: isOver
          ? "hsl(var(--primary) / 0.05)"
          : undefined,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        {color && (
          <div
            className="h-3.5 w-3.5 rounded-sm"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">
          ({players.length})
        </span>
      </div>

      {players.map((name) => (
        <DraggablePlayerCard key={name} playerName={name} />
      ))}

      {players.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Drop players here
        </p>
      )}
    </div>
  );
};

export const TeamPlayerManager = () => {
  const { data: season } = useSeason();
  const { data: teams } = useTeams(season?.id);
  const { data: assignments } = useTeamAssignments(season?.id);
  const { data: eliminations } = useEliminations(season?.id);

  const [episodeNum, setEpisodeNum] = useState<number>(1);
  const [localAssignments, setLocalAssignments] =
    useState<TeamAssignmentSnapshot | null>(null);
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const teamList = Object.values(teams || {});

  // Filter out players eliminated before this episode
  const eliminatedBefore = new Set(
    Object.values(eliminations)
      .filter((e) => e.episode_num < episodeNum)
      .map((e) => e.player_name),
  );
  const playerNames = (season?.players.map((p) => p.name) ?? []).filter(
    (name) => !eliminatedBefore.has(name),
  );

  // Build snapshot: prefer local edits, then saved data, then all null
  const getSnapshot = (): TeamAssignmentSnapshot => {
    if (localAssignments) return localAssignments;

    const saved = assignments[String(episodeNum)];
    if (saved) return saved;

    const snapshot: TeamAssignmentSnapshot = {};
    playerNames.forEach((name) => {
      snapshot[name] = null;
    });
    return snapshot;
  };

  const snapshot = getSnapshot();

  // Group players by team
  const getPlayersByContainer = (): Record<string, string[]> => {
    const groups: Record<string, string[]> = {};

    teamList.forEach((t) => {
      groups[t.id] = [];
    });
    groups[NO_TEAM_ID] = [];

    playerNames.forEach((name) => {
      const teamId = snapshot[name];
      if (teamId && groups[teamId]) {
        groups[teamId].push(name);
      } else {
        groups[NO_TEAM_ID].push(name);
      }
    });

    return groups;
  };

  const playersByContainer = getPlayersByContainer();

  const handleDragStart = (event: DragStartEvent) => {
    setActivePlayer(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlayer(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const targetContainer = over.id as string;

    if (!playersByContainer[targetContainer]) return;

    const newSnapshot = { ...snapshot };
    newSnapshot[activeId] =
      targetContainer === NO_TEAM_ID ? null : (targetContainer as Team["id"]);
    setLocalAssignments(newSnapshot);
  };

  const handleSave = async () => {
    if (!season) return;
    setSaving(true);

    try {
      const ref = doc(db, `team_assignments/${season.id}`);
      await setDoc(ref, { [String(episodeNum)]: snapshot }, { merge: true });

      toast.success(`Episode ${episodeNum} assignments updated`);

      setLocalAssignments(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save team assignments",
      );
    }

    setSaving(false);
  };

  const handleCopyPreviousEpisode = () => {
    const prevEp = episodeNum - 1;
    const prevSnapshot = assignments[String(prevEp)];
    if (prevSnapshot) {
      const merged: TeamAssignmentSnapshot = {};
      playerNames.forEach((name) => {
        merged[name] = prevSnapshot[name] ?? null;
      });
      setLocalAssignments(merged);
    }
  };

  const handleMoveAllToNoTeam = () => {
    const newSnapshot: TeamAssignmentSnapshot = {};
    playerNames.forEach((name) => {
      newSnapshot[name] = null;
    });
    setLocalAssignments(newSnapshot);
  };

  const handleEpisodeChange = (val: string) => {
    if (localAssignments && !confirm("Discard unsaved changes?")) return;
    setEpisodeNum(Number(val));
    setLocalAssignments(null);
  };

  if (!season) return null;

  if (teamList.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Teams</AlertTitle>
        <AlertDescription>
          Create teams above before assigning players.
        </AlertDescription>
      </Alert>
    );
  }

  const currentEpisode = season.episodes.find((e) => e.order === episodeNum);
  const isMergeEpisode =
    currentEpisode?.merge_occurs || currentEpisode?.post_merge;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Assignments by Episode</CardTitle>
        <p className="text-sm text-muted-foreground">
          Drag players between columns to assign them to teams. Save when done.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Episode #</Label>
            <Input
              type="number"
              min={1}
              max={season.episodes.length || undefined}
              value={episodeNum}
              onChange={(e) => handleEpisodeChange(e.target.value)}
              className="w-24"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleCopyPreviousEpisode}
            disabled={
              episodeNum <= 1 || !assignments[String(episodeNum - 1)]
            }
          >
            <Copy className="mr-1 h-4 w-4" />
            Copy from Ep {episodeNum - 1}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {isMergeEpisode && (
          <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle>Merge Episode</AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              <span>
                This is a merge/post-merge episode. Players typically have
                no team.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMoveAllToNoTeam}
              >
                Move all to No Team
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {assignments[String(episodeNum)] && !localAssignments && (
          <Alert className="border-green-300 bg-green-50 dark:bg-green-950/20">
            <AlertDescription>
              Saved assignments loaded for episode {episodeNum}.
            </AlertDescription>
          </Alert>
        )}

        {localAssignments && (
          <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertDescription>You have unsaved changes.</AlertDescription>
          </Alert>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.min(teamList.length + 1, 4)}, minmax(0, 1fr))`,
            }}
          >
            {teamList.map((team) => (
              <DroppableColumn
                key={team.id}
                id={team.id}
                title={team.name}
                color={team.color}
                players={playersByContainer[team.id] || []}
              />
            ))}
            <DroppableColumn
              id={NO_TEAM_ID}
              title="No Team"
              color={null}
              players={playersByContainer[NO_TEAM_ID] || []}
            />
          </div>

          <DragOverlay>
            {activePlayer ? (
              <PlayerDragOverlay playerName={activePlayer} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
};
