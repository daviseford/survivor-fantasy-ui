import { BASE_PLAYER_SCORING } from "../../data/scoring";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export const ScoringLegendTable = () => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Fixed Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {BASE_PLAYER_SCORING.map((x) => (
            <TableRow key={x.action}>
              <TableCell>{x.action}</TableCell>
              <TableCell>{x.description}</TableCell>
              <TableCell>{x.fixed_value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
