import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PlayerGroupGrid } from "../components/MyPlayers";
import { PropBetScoring } from "../components/PropBetTables";
import {
  PerSurvivorPerEpisodeDetailedScoringTable,
  PerUserPerEpisodeScoringTable,
  ScoringLegendTable,
} from "../components/ScoringTables";
import { useCompetition } from "../hooks/useCompetition";
import { useSeason } from "../hooks/useSeason";

export const SingleCompetition = () => {
  const { data: competition } = useCompetition();

  const { data: season } = useSeason(competition?.season_id);

  if (!competition || !season) return null;

  return (
    <div>
      <div className="p-4">
        <p className="text-muted-foreground">
          Season {competition.season_num}
        </p>
        <h2 className="mb-4 text-2xl font-bold">
          {competition.competition_name}
        </h2>
        <PlayerGroupGrid />
      </div>

      <div className="space-y-4 p-4">
        <GridCard title="Season Scores">
          <PerUserPerEpisodeScoringTable />
        </GridCard>

        {competition.prop_bets && (
          <GridCard title="Prop Bets">
            <PropBetScoring />
          </GridCard>
        )}

        <GridCard title="Survivor Scores">
          <PerSurvivorPerEpisodeDetailedScoringTable />
        </GridCard>

        <GridCard title="Scoring Values">
          <ScoringLegendTable />
        </GridCard>
      </div>
    </div>
  );
};

const GridCard = ({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
