import { Check, Pencil, Trash2, X } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "../../firebase";
import { useChallenges } from "../../hooks/useChallenges";
import { useSeason } from "../../hooks/useSeason";
import { useTeamAssignments } from "../../hooks/useTeamAssignments";
import { useTeams } from "../../hooks/useTeams";
import { useUser } from "../../hooks/useUser";
import { Team } from "../../types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

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

export const TeamCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: teams } = useTeams(season?.id);
  const { data: assignments } = useTeamAssignments(season?.id);
  const { data: challenges } = useChallenges(season?.id);
  const { slimUser } = useUser();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string;
    color: string;
  } | null>(null);

  const isTeamReferenced = (teamId: Team["id"]): boolean => {
    for (const snapshot of Object.values(assignments)) {
      for (const assignedTeamId of Object.values(snapshot)) {
        if (assignedTeamId === teamId) return true;
      }
    }
    for (const challenge of Object.values(challenges)) {
      if (challenge.winning_team_id === teamId) return true;
    }
    return false;
  };

  const deleteTeamWithCascade = async (team: Team) => {
    if (!season) return;

    // 1. Cascade team_assignments: null out all references to this team
    const updatedAssignments = { ...assignments };
    let assignmentsChanged = false;
    for (const [episodeKey, snapshot] of Object.entries(updatedAssignments)) {
      const updatedSnapshot = { ...snapshot };
      for (const [playerName, teamId] of Object.entries(updatedSnapshot)) {
        if (teamId === team.id) {
          updatedSnapshot[playerName] = null;
          assignmentsChanged = true;
        }
      }
      updatedAssignments[episodeKey] = updatedSnapshot;
    }
    if (assignmentsChanged) {
      const assignmentsRef = doc(db, `team_assignments/${season.id}`);
      await setDoc(assignmentsRef, updatedAssignments);
    }

    // 2. Cascade challenges: clear winning_team_id where it matches
    const updatedChallenges = { ...challenges };
    let challengesChanged = false;
    for (const challenge of Object.values(updatedChallenges)) {
      if (challenge.winning_team_id === team.id) {
        updatedChallenges[challenge.id] = {
          ...challenge,
          winning_team_id: null,
        };
        challengesChanged = true;
      }
    }
    if (challengesChanged) {
      const challengesRef = doc(db, `challenges/${season.id}`);
      await setDoc(challengesRef, updatedChallenges);
    }

    // 3. Delete the team record itself
    const ref = doc(db, `teams/${season.id}`);
    const newTeams = { ...teams };
    delete newTeams[team.id];
    await setDoc(ref, newTeams);
  };

  const handleDelete = async (team: Team) => {
    if (!slimUser?.isAdmin) return;

    try {
      await deleteTeamWithCascade(team);
      toast.success(`Team "${team.name}" removed`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete team",
      );
    }
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditValues({ name: team.name, color: team.color });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEdit = async (team: Team) => {
    if (!editValues || !season) return;

    try {
      const updated: Team = {
        ...team,
        name: editValues.name,
        color: editValues.color,
      };
      const ref = doc(db, `teams/${season.id}`);
      await setDoc(ref, { [team.id]: updated }, { merge: true });

      toast.success(`Team "${editValues.name}" saved`);

      setEditingId(null);
      setEditValues(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update team",
      );
    }
  };

  const rows = Object.values(teams || {}).map((team) => {
    const isEditing = editingId === team.id;
    const referenced = isTeamReferenced(team.id);

    if (isEditing && editValues) {
      return (
        <TableRow key={team.id}>
          <TableCell>
            <Input
              className="h-8 w-40"
              value={editValues.name}
              onChange={(ev) =>
                setEditValues({ ...editValues, name: ev.target.value })
              }
            />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editValues.color}
                onChange={(e) =>
                  setEditValues({ ...editValues, color: e.target.value })
                }
                className="h-8 w-8 cursor-pointer rounded border"
              />
              <div className="flex gap-0.5">
                {SURVIVOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className="h-5 w-5 rounded border"
                    style={{ backgroundColor: swatch }}
                    onClick={() =>
                      setEditValues({ ...editValues, color: swatch })
                    }
                  />
                ))}
              </div>
            </div>
          </TableCell>
          <TableCell>{team.id}</TableCell>
          {slimUser?.isAdmin && (
            <TableCell>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-green-600"
                  onClick={() => saveEdit(team)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={cancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          )}
        </TableRow>
      );
    }

    return (
      <TableRow key={team.id}>
        <TableCell>{team.name}</TableCell>
        <TableCell>
          <div
            className="h-6 w-6 rounded border"
            style={{ backgroundColor: team.color }}
          />
        </TableCell>
        <TableCell>{team.id}</TableCell>
        {slimUser?.isAdmin && (
          <TableCell>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-blue-600"
                onClick={() => startEdit(team)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {referenced
                        ? "Team is in use -- delete and clean up references?"
                        : `Delete team "${team.name}"?`}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {referenced
                        ? "This team is referenced by episode assignments and/or challenges. Deleting it will set those references to \"No Team\" (null)."
                        : "This action cannot be undone."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDelete(team)}
                    >
                      {referenced ? "Delete and clean up" : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TableCell>
        )}
      </TableRow>
    );
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead>ID</TableHead>
            {slimUser?.isAdmin && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
    </div>
  );
};
