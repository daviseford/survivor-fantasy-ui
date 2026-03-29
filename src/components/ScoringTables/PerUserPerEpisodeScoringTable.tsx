import { useCompetition } from "../../hooks/useCompetition";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export const PerUserPerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);

  const { pointsByUserPerEpisodeWithPropBets } = useScoringCalculations();

  const rows = Object.entries(pointsByUserPerEpisodeWithPropBets)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([uid, values], i) => {
      const user = competition?.participants.find((x) => x.uid === uid);

      return (
        <TableRow key={uid}>
          <TableCell>{i + 1}</TableCell>
          <TableCell>{user?.displayName || user?.email}</TableCell>
          <TableCell>{values.total}</TableCell>

          {values.episodePoints.map((x, idx) => (
            <TableCell key={idx}>{x}</TableCell>
          ))}

          {competition?.prop_bets && (
            <TableCell>{values.propBetPoints}</TableCell>
          )}
        </TableRow>
      );
    });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>User Name</TableHead>
            <TableHead>Total</TableHead>
            {season?.episodes.map((x) => (
              <TableHead key={x.id}>Ep. {x.order}</TableHead>
            ))}
            {competition?.prop_bets && <TableHead>Prop Bet Points</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
    </div>
  );
};
