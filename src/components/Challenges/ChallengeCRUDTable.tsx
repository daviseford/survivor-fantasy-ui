import { doc, setDoc } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { db } from "../../firebase";
import { useChallenges } from "../../hooks/useChallenges";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { Challenge } from "../../types";
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

export const ChallengeCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: challenges } = useChallenges(season?.id);
  const { slimUser } = useUser();
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);

  const handleDelete = async () => {
    if (!slimUser?.isAdmin || !deleteTarget) return;

    const ref = doc(db, `challenges/${season?.id}`);
    const newEvents = { ...challenges };
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
              <TableHead>Order</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Winning Player(s)</TableHead>
              <TableHead>Episode</TableHead>
              {slimUser?.isAdmin && <TableHead>Delete</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(challenges || {})
              .sort((a, b) => b.order - a.order)
              .map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.order}</TableCell>
                  <TableCell>{e.variant}</TableCell>
                  <TableCell>{e.winning_players.join(", ")}</TableCell>
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
              Do you want to delete this challenge?
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
