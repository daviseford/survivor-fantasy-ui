import { PropBetsQuestions } from "../../data/propbets";
import { useDraft } from "../../hooks/useDraft";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export const PostDraftPropBetTable = () => {
  const { draft } = useDraft();

  if (!draft?.prop_bets) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead></TableHead>
          <TableHead>
            {PropBetsQuestions.propbet_first_vote.description}
          </TableHead>
          <TableHead>{PropBetsQuestions.propbet_ftc.description}</TableHead>
          <TableHead>{PropBetsQuestions.propbet_idols.description}</TableHead>
          <TableHead>
            {PropBetsQuestions.propbet_immunities.description}
          </TableHead>
          <TableHead>
            {PropBetsQuestions.propbet_medical_evac.description}
          </TableHead>
          <TableHead>{PropBetsQuestions.propbet_winner.description}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {draft.prop_bets.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <strong>{p.user_name}</strong>
            </TableCell>
            <TableCell>{p.values.propbet_first_vote}</TableCell>
            <TableCell>{p.values.propbet_ftc}</TableCell>
            <TableCell>{p.values.propbet_idols}</TableCell>
            <TableCell>{p.values.propbet_immunities}</TableCell>
            <TableCell>{p.values.propbet_medical_evac}</TableCell>
            <TableCell>{p.values.propbet_winner}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
