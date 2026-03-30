import { Check, Pencil, Trash2, X } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { Episode } from "../../types";
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
import { Badge } from "../ui/badge";
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

export const EpisodeCRUDTable = () => {
  const { data: season } = useSeason();
  const { slimUser } = useUser();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Episode | null>(null);

  const handleDelete = async (episode: Episode) => {
    if (!slimUser?.isAdmin || !season) return;

    try {
      const ref = doc(db, "seasons", season.id);
      const updated = season.episodes.filter((e) => e.id !== episode.id);
      await updateDoc(ref, { episodes: updated });
      toast.success(`Episode ${episode.order} removed`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete episode",
      );
    }
  };

  const startEdit = (episode: Episode) => {
    setEditingId(episode.id);
    setEditValues({ ...episode });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEdit = async () => {
    if (!season || !editValues) return;

    try {
      const ref = doc(db, "seasons", season.id);
      const updated = season.episodes.map((e) =>
        e.id === editValues.id ? editValues : e,
      );
      await updateDoc(ref, { episodes: updated });

      toast.success(`Episode ${editValues.order} saved`);

      setEditingId(null);
      setEditValues(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update episode",
      );
    }
  };

  const episodes = [...(season?.episodes ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Episode #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Flags</TableHead>
            {slimUser?.isAdmin && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {episodes.map((e) => {
            const isEditing = editingId === e.id;

            if (isEditing && editValues) {
              return (
                <TableRow key={e.id}>
                  <TableCell>{e.order}</TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-40"
                      value={editValues.name}
                      onChange={(ev) =>
                        setEditValues({
                          ...editValues,
                          name: ev.target.value,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={editValues.merge_occurs}
                          onChange={(ev) =>
                            setEditValues({
                              ...editValues,
                              merge_occurs: ev.target.checked,
                            })
                          }
                        />
                        Merge
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={editValues.post_merge}
                          onChange={(ev) =>
                            setEditValues({
                              ...editValues,
                              post_merge: ev.target.checked,
                            })
                          }
                        />
                        Post-merge
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={editValues.finale}
                          onChange={(ev) =>
                            setEditValues({
                              ...editValues,
                              finale: ev.target.checked,
                            })
                          }
                        />
                        Finale
                      </label>
                    </div>
                  </TableCell>
                  {slimUser?.isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600"
                          onClick={saveEdit}
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
              <TableRow key={e.id}>
                <TableCell>{e.order}</TableCell>
                <TableCell>{e.name || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {e.merge_occurs && (
                      <Badge variant="outline" className="text-orange-600">
                        Merge
                      </Badge>
                    )}
                    {e.post_merge && (
                      <Badge variant="outline" className="text-blue-600">
                        Post-merge
                      </Badge>
                    )}
                    {e.finale && (
                      <Badge variant="outline" className="text-red-600">
                        Finale
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {slimUser?.isAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-blue-600"
                        onClick={() => startEdit(e)}
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
                              Delete Episode {e.order}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              <pre className="mt-2 rounded bg-muted p-2 text-xs">
                                {JSON.stringify(e, null, 2)}
                              </pre>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(e)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
