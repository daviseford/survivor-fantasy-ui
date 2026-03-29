import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { SlimUser } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

export const PlayerGroup = ({ uid }: { uid: SlimUser["uid"] }) => {
  const { survivorsByUserUid, eliminatedSurvivors } = useCompetitionMeta();

  const userSurvivors = survivorsByUserUid[uid];

  if (!userSurvivors?.length) return null;

  return (
    <div className="flex -space-x-2">
      {userSurvivors?.map((p) => {
        const isEliminated = eliminatedSurvivors.includes(p.name);

        const label = `${p.name}${isEliminated ? " (Eliminated)" : ""}`;

        return (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={p.img}
                  className={isEliminated ? "grayscale" : ""}
                />
                <AvatarFallback>{p.name[0]}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
