import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useCreateDraft } from "../hooks/useCreateDraft";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Players } from "./Players";

export const SingleSeason = () => {
  const navigate = useNavigate();

  const { data: season, isLoading } = useSeason();
  const { slimUser } = useUser();
  const { createDraft } = useCreateDraft();

  const handleCreateDraft = async () => {
    const draftId = await createDraft();
    navigate(`/seasons/${season?.id}/draft/${draftId}`);
  };

  const handleManageSeason = async () => {
    if (!slimUser?.isAdmin) return;
    navigate(`/seasons/${season?.id}/manage`);
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  if (!season) return <div>Error: Missing season data</div>;

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-3xl font-bold">Season {season?.order}</h1>

      {slimUser?.isAdmin && (
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Admin Controls</h2>
          <Button onClick={handleManageSeason}>Manage Season</Button>
        </div>
      )}

      {slimUser && (
        <div className="flex items-center gap-4 pb-4">
          <h4 className="text-lg font-semibold">Want to play along?</h4>
          <Button onClick={handleCreateDraft}>Create a New Draft</Button>
        </div>
      )}

      <Players />
    </div>
  );
};
