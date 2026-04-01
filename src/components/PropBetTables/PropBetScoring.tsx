import { Badge, Group, Table, TableScrollContainer, Text } from "@mantine/core";
import { PropBetQuestionObj, PropBetsQuestions } from "../../data/propbets";
import { useCompetition } from "../../hooks/useCompetition";
import { usePropBetScoring } from "../../hooks/useGetPropBetScoring";
import { useUser } from "../../hooks/useUser";
import { PropBetAnswer } from "../../utils/propBetUtils";

const AnswerTd = ({ score }: { score: PropBetAnswer }) => {
  return (
    <Table.Td>
      <Group gap="sm">
        {score.status === "definitive_correct" && (
          <>
            <Text size="sm" fw={600}>
              {score.answer}
            </Text>
            <Badge variant="light" color="green" size="sm">
              +{score.points_awarded}
            </Badge>
          </>
        )}

        {score.status === "definitive_incorrect" && (
          <Text size="sm" c="red.4" td="line-through">
            {score.answer}
          </Text>
        )}

        {score.status === "leading" && (
          <>
            <Text size="sm" fw={500} c="yellow.6">
              {score.answer}
            </Text>
            <Badge variant="outline" color="yellow" size="xs">
              Leading
            </Badge>
          </>
        )}

        {score.status === "pending" && (
          <Text size="sm" c="dimmed">
            {score.answer}
          </Text>
        )}
      </Group>
    </Table.Td>
  );
};

export const PropBetScoring = () => {
  const { slimUser } = useUser();
  const { data: scores } = usePropBetScoring();
  const { data: competition } = useCompetition();

  if (!slimUser || !competition) return null;

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
    <TableScrollContainer minWidth={300}>
      <Table highlightOnHover verticalSpacing="sm">
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
