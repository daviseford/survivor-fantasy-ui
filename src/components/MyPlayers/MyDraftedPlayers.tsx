import { useDraft } from "../../hooks/useDraft";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

export const MyDraftedPlayers = () => {
  const { slimUser } = useUser();

  const isMobile = useIsMobile();

  const { draft } = useDraft();
  const { data: season } = useSeason(draft?.season_id);

  const myPlayerNames = (draft?.draft_picks || [])
    .filter((x) => x.user_uid === slimUser?.uid)
    .map((x) => x.player_name);

  const myPlayerInfo = (season?.players || []).filter((p) =>
    myPlayerNames.includes(p.name),
  );

  if (!myPlayerInfo?.length) return null;

  return (
    <div className="flex items-center gap-4">
      <h3 className="text-lg font-semibold">My Players</h3>
      <div className="flex -space-x-2">
        {myPlayerInfo?.map((p) => (
          <Tooltip key={p.name}>
            <TooltipTrigger asChild>
              <Avatar
                className={isMobile ? "h-10 w-10" : "h-14 w-14"}
              >
                <AvatarImage src={p.img} />
                <AvatarFallback>{p.name[0]}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{p.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
