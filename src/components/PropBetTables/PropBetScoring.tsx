import { Badge, Group, Table, Text } from "@mantine/core";
import { PropBetsQuestions } from "../../data/propbets";
import { usePropBetScoring } from "../../hooks/useGetPropBetScoring";
import { useUser } from "../../hooks/useUser";
import { PropBetAnswer } from "../../utils/propBetUtils";

const AnswerTd = ({ score }: { score: PropBetAnswer }) => {
  return (
    <Table.Td>
      <Group gap={"md"}>
        <Text
          c={!score.correct ? "dimmed" : ""}
          fw={score.correct ? "bolder" : ""}
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

  const scores = usePropBetScoring();

  if (!slimUser) return null;

  const rows = Object.entries(scores).map(([uid, s]) => (
    <Table.Tr key={uid}>
      <Table.Td>
        <strong>{s.propbet_first_vote.user_name}</strong>
      </Table.Td>
      <AnswerTd score={s.propbet_first_vote} />
      <AnswerTd score={s.propbet_ftc} />
      <AnswerTd score={s.propbet_idols} />
      <AnswerTd score={s.propbet_immunities} />
      <AnswerTd score={s.propbet_medical_evac} />
      <AnswerTd score={s.propbet_winner} />
    </Table.Tr>
  ));

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th></Table.Th>
          <Table.Th>
            {PropBetsQuestions.propbet_first_vote.description}
          </Table.Th>
          <Table.Th>{PropBetsQuestions.propbet_ftc.description}</Table.Th>
          <Table.Th>{PropBetsQuestions.propbet_idols.description}</Table.Th>
          <Table.Th>
            {PropBetsQuestions.propbet_immunities.description}
          </Table.Th>
          <Table.Th>
            {PropBetsQuestions.propbet_medical_evac.description}
          </Table.Th>
          <Table.Th>{PropBetsQuestions.propbet_winner.description}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
