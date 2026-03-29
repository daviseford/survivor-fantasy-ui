import { doc, setDoc } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { db } from "../../firebase";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { GameEvent } from "../../types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export const GameEventsCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: events } = useEvents(season?.id);
  const { slimUser } = useUser();
  const [deleteTarget, setDeleteTarget] = useState<GameEvent | null>(null);

  const handleDelete = async () => {
    if (!slimUser?.isAdmin || !deleteTarget) return;

    const ref = doc(db, `events/${season?.id}`);
    const newEvents = { ...events };
    delete newEvents[deleteTarget.id];
    await setDoc(ref, newEvents);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Multiplier</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Episode</TableHead>
              {slimUser?.isAdmin && <TableHead>Delete</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(events || {})
              .sort((a, b) => b.episode_num - a.episode_num)
              .map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.action}</TableCell>
                  <TableCell>{e.multiplier || "-"}</TableCell>
                  <TableCell>{e.player_name}</TableCell>
                  <TableCell>{e.episode_id}</TableCell>
                  {slimUser?.isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Do you want to delete this event?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <pre className="overflow-auto rounded bg-muted p-3 text-xs">
                {JSON.stringify(deleteTarget, null, 2)}
              </pre>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
