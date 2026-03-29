import { DraftPick, Player, SlimUser } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export const DraftTable = ({
  draft_picks,
  participants,
  players,
}: {
  draft_picks: DraftPick[];
  participants: SlimUser[];
  players: Player[];
}) => {
  const rows = !draft_picks
    ? []
    : draft_picks?.map((x) => {
        const player = players?.find((p) => p.name === x.player_name);
        const user = participants?.find((p) => p.uid === x.user_uid);
        return (
          <TableRow key={x.player_name + "draft_table"}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={player!.img} />
                  <AvatarFallback>{x.player_name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{x.player_name}</span>
              </div>
            </TableCell>
            <TableCell>{x.order}</TableCell>
            <TableCell>{user?.displayName || user?.email}</TableCell>
          </TableRow>
        );
      });

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player Name</TableHead>
            <TableHead>Draft Position</TableHead>
            <TableHead>Drafted By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
    </div>
  );
};
