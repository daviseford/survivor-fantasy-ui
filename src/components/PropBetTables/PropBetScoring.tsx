import {
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  TableScrollContainer,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  PropBetQuestionKey,
  PropBetQuestionObj,
  PropBetsQuestions,
} from "../../data/propbets";
import { useCompetition } from "../../hooks/useCompetition";
import { usePropBetScoring } from "../../hooks/useGetPropBetScoring";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import type { CastawayId, CastawayLookup } from "../../types";
import { PropBetAnswer, PropBetScores } from "../../utils/propBetUtils";

/** Resolve a prop bet answer to a display name if it's a castaway ID. */
const resolveAnswer = (answer: string, lookup?: CastawayLookup): string => {
  if (!answer || !lookup) return answer;
  return lookup[answer as CastawayId]?.full_name ?? answer;
};

const AnswerDisplay = ({
  score,
  lookup,
}: {
  score: PropBetAnswer;
  lookup?: CastawayLookup;
}) => {
  const display = resolveAnswer(score.answer, lookup);

  if (score.status === "definitive_correct") {
    return (
      <Group gap="sm" wrap="nowrap">
        <Text size="sm" fw={600}>
          {display}
        </Text>
        <Badge variant="light" color="green" size="sm">
          +{score.points_awarded}
        </Badge>
      </Group>
    );
  }

  if (score.status === "definitive_incorrect") {
    return (
      <Group gap={4} wrap="nowrap">
        <Text size="sm" c="red.4" td="line-through">
          {display}
        </Text>
        <Text size="xs" c="red.4" fw={700} aria-label="Incorrect">
          ✗
        </Text>
      </Group>
    );
  }

  if (score.status === "leading") {
    return (
      <Group gap="sm" wrap="nowrap">
        <Text size="sm" fw={500} c="yellow.6">
          {display}
        </Text>
        <Badge variant="outline" color="yellow" size="xs">
          Leading
        </Badge>
      </Group>
    );
  }

  return (
    <Text size="sm" c="dimmed">
      {display}
    </Text>
  );
};

const AnswerTd = ({
  score,
  lookup,
}: {
  score: PropBetAnswer;
  lookup?: CastawayLookup;
}) => (
  <Table.Td>
    <AnswerDisplay score={score} lookup={lookup} />
  </Table.Td>
);

/** Mobile: one card per user with all their prop bet answers stacked. */
const PropBetCards = ({
  scores,
  activeKeys,
  lookup,
}: {
  scores: Record<string, PropBetScores>;
  activeKeys: PropBetQuestionKey[];
  lookup?: CastawayLookup;
}) => (
  <SimpleGrid cols={1} spacing="md">
    {Object.entries(scores).map(([uid, s]) => {
      const userName = getFirstAnswer(s, activeKeys).user_name;
      return (
        <Paper key={uid} p="sm" radius="md" withBorder>
          <Text fw={700} mb="xs">
            {userName}
          </Text>
          <Stack gap={6}>
            {activeKeys.map((key) => {
              const question = PropBetsQuestions[key];
              const answer = s[key];
              return (
                <Group key={key} justify="space-between" wrap="nowrap" gap="xs">
                  <Text size="xs" c="dimmed" style={{ flex: "0 1 auto" }}>
                    {question.description}
                  </Text>
                  <div style={{ flexShrink: 0 }}>
                    <AnswerDisplay score={answer} lookup={lookup} />
                  </div>
                </Group>
              );
            })}
          </Stack>
        </Paper>
      );
    })}
  </SimpleGrid>
);

/** Desktop: standard table with questions as columns. */
const PropBetTable = ({
  scores,
  activeKeys,
  lookup,
}: {
  scores: Record<string, PropBetScores>;
  activeKeys: PropBetQuestionKey[];
  lookup?: CastawayLookup;
}) => {
  const rows = Object.entries(scores).map(([uid, s]) => (
    <Table.Tr key={uid}>
      <Table.Td>
        <strong>{getFirstAnswer(s, activeKeys).user_name}</strong>
      </Table.Td>
      {activeKeys.map((key) => (
        <AnswerTd key={key} score={s[key]} lookup={lookup} />
      ))}
    </Table.Tr>
  ));

  return (
    <TableScrollContainer minWidth={300}>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th></Table.Th>
            {activeKeys.map((key) => (
              <Th key={key} {...PropBetsQuestions[key]} />
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};

export const PropBetScoring = () => {
  const { slimUser } = useUser();
  const { data: scores, activeKeys } = usePropBetScoring();
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const isMobile = useMediaQuery("(max-width: 48em)");

  if (!slimUser || !competition || activeKeys.length === 0) return null;

  const lookup = season?.castawayLookup;

  if (isMobile) {
    return (
      <PropBetCards scores={scores} activeKeys={activeKeys} lookup={lookup} />
    );
  }

  return (
    <PropBetTable scores={scores} activeKeys={activeKeys} lookup={lookup} />
  );
};

const getFirstAnswer = (
  scores: PropBetScores,
  activeKeys: PropBetQuestionKey[],
): PropBetAnswer => scores[activeKeys[0]];

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
