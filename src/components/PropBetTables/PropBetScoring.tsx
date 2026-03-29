import { PropBetQuestionObj, PropBetsQuestions } from "../../data/propbets";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { usePropBetScoring } from "../../hooks/useGetPropBetScoring";
import { useUser } from "../../hooks/useUser";
import { PropBetAnswer } from "../../utils/propBetUtils";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const AnswerTd = ({
  score,
  strikethrough = false,
}: {
  score: PropBetAnswer;
  strikethrough?: boolean;
}) => {
  return (
    <TableCell>
      <div className="flex items-center gap-3">
        <span
          className={`${!score.correct ? "text-muted-foreground" : "font-bold"} ${strikethrough ? "line-through" : ""}`}
        >
          {score.answer}
        </span>
        {score.correct && (
          <Badge className="bg-green-600">+{score.points_awarded}</Badge>
        )}
      </div>
    </TableCell>
  );
};

export const PropBetScoring = () => {
  const { slimUser } = useUser();

  const { data: scores } = usePropBetScoring();

  const { data: competition } = useCompetition();
  const { data: eliminations } = useEliminations(competition?.season_id);

  const _elims = Object.values(eliminations);

  if (!slimUser) return null;

  const firstElim = _elims.find((x) => x.order === 1)?.player_name;

  const rows = Object.entries(scores).map(([uid, s]) => (
    <TableRow key={uid}>
      <TableCell>
        <strong>{s.propbet_first_vote.user_name}</strong>
      </TableCell>

      <AnswerTd
        score={s.propbet_first_vote}
        strikethrough={Boolean(
          firstElim && firstElim !== s.propbet_first_vote.answer,
        )}
      />

      <AnswerTd
        score={s.propbet_ftc}
        strikethrough={_elims.some(
          (x) =>
            x.player_name === s.propbet_ftc.answer &&
            x.variant !== "final_tribal_council",
        )}
      />

      <AnswerTd
        score={s.propbet_idols}
        strikethrough={
          _elims.some((x) => x.player_name === s.propbet_idols.answer) &&
          !s.propbet_idols.correct
        }
      />

      <AnswerTd
        score={s.propbet_immunities}
        strikethrough={
          _elims.some((x) => x.player_name === s.propbet_immunities.answer) &&
          !s.propbet_immunities.correct
        }
      />

      <AnswerTd
        score={s.propbet_medical_evac}
        strikethrough={
          _elims.some((x) => x.variant === "medical") &&
          !s.propbet_medical_evac.correct
        }
      />

      <AnswerTd
        score={s.propbet_winner}
        strikethrough={_elims.some(
          (x) => x.player_name === s.propbet_winner.answer,
        )}
      />
    </TableRow>
  ));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <Th {...PropBetsQuestions.propbet_first_vote} />
            <Th {...PropBetsQuestions.propbet_ftc} />
            <Th {...PropBetsQuestions.propbet_idols} />
            <Th {...PropBetsQuestions.propbet_immunities} />
            <Th {...PropBetsQuestions.propbet_medical_evac} />
            <Th {...PropBetsQuestions.propbet_winner} />
          </TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
    </div>
  );
};

const Th = ({ description, point_value }: PropBetQuestionObj) => {
  return (
    <TableHead>
      <span className="font-bold">
        {description}{" "}
        <span className="text-xs text-muted-foreground">(+{point_value})</span>
      </span>
    </TableHead>
  );
};
