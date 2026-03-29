import { useCompetition } from "../../hooks/useCompetition";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { Card, CardContent } from "../ui/card";
import { PlayerGroup } from "./PlayerGroup";

export const PlayerGroupGrid = () => {
  const { data: competition } = useCompetition();

  const { survivorsByUserUid, eliminatedSurvivors } = useCompetitionMeta();

  if (!competition) return null;

  const numParticipants = competition.participant_uids.length;

  const gridClass =
    numParticipants === 2 || numParticipants === 3
      ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
      : "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

  return (
    <div className={gridClass}>
      {competition.participants.map((x) => {
        const userSurvivors = survivorsByUserUid[x.uid];

        const numDrafted = userSurvivors.length;
        const numEliminated = userSurvivors.filter((s) =>
          eliminatedSurvivors.includes(s.name),
        ).length;

        const areAllEliminated = numEliminated === numDrafted;
        const isOne = numDrafted - numEliminated === 1;

        return (
          <Card key={x.uid}>
            <CardContent className="flex flex-col items-center gap-1 pt-4">
              <h4 className="text-center font-semibold">{x.displayName}</h4>
              <p
                className={`text-center text-sm ${areAllEliminated ? "text-muted-foreground" : ""}`}
              >
                {numDrafted - numEliminated}{" "}
                {isOne ? "active player" : "active players"}
              </p>
              <PlayerGroup uid={x.uid} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
