import { Badge, Group, Table, TableScrollContainer, Text } from "@mantine/core";
import { PropBetQuestionObj, PropBetsQuestions } from "../../data/propbets";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { usePropBetScoring } from "../../hooks/useGetPropBetScoring";
import { useUser } from "../../hooks/useUser";
import { PropBetAnswer } from "../../utils/propBetUtils";

const AnswerTd = ({
  score,
  strikethrough = false,
}: {
  score: PropBetAnswer;
  strikethrough?: boolean;
}) => {
  return (
    <Table.Td>
      <Group gap={"md"}>
        <Text
          c={!score.correct ? "dimmed" : ""}
          fw={score.correct ? "bolder" : ""}
          td={strikethrough ? "line-through" : ""}
        >
          {score.answer}
        </Text>
        {score.correct && <Badge color="green">+{score.points_awarded}</Badge>}
      </Group>
    </Table.Td>
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
    <Table.Tr key={uid}>
      <Table.Td>
        <strong>{s.propbet_first_vote.user_name}</strong>
      </Table.Td>

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
    </Table.Tr>
  ));

  return (
    <TableScrollContainer minWidth={300}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th></Table.Th>
            <Th {...PropBetsQuestions.propbet_first_vote} />
            <Th {...PropBetsQuestions.propbet_ftc} />
            <Th {...PropBetsQuestions.propbet_idols} />
            <Th {...PropBetsQuestions.propbet_immunities} />
            <Th {...PropBetsQuestions.propbet_medical_evac} />
            <Th {...PropBetsQuestions.propbet_winner} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};

const Th = ({ description, point_value }: PropBetQuestionObj) => {
  return (
    <Table.Th>
      <Text fw={700} span>
        {description}
        {"  "}
        <Text c="dimmed" size="xs" span>
          (+{point_value})
        </Text>
      </Text>
    </Table.Th>
  );
};
