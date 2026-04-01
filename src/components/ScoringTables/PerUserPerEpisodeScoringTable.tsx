import { Table, Text, Tooltip } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { PropBetQuestionKey, PropBetsQuestions } from "../../data/propbets";
import { useCompetition } from "../../hooks/useCompetition";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useUser } from "../../hooks/useUser";
import { PropBetScores } from "../../utils/propBetUtils";

export const PerUserPerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { slimUser } = useUser();

  const {
    activePropBetKeys,
    filteredEpisodes,
    pointsByUserPerEpisodeWithPropBets,
    propBetScores,
  } = useScoringCalculations();

  const sortedEntries = Object.entries(pointsByUserPerEpisodeWithPropBets).sort(
    (a, b) => b[1].total - a[1].total,
  );

  const rows = sortedEntries.map(([uid, values], i) => {
    const user = competition?.participants.find((x) => x.uid === uid);
    const isCurrentUser = uid === slimUser?.uid;
    const isLeader = i === 0;

    const bgColor = isLeader
      ? "var(--mantine-color-yellow-light)"
      : isCurrentUser
        ? "var(--mantine-color-blue-light)"
        : undefined;

    return (
      <Table.Tr key={uid} style={{ backgroundColor: bgColor }}>
        <Table.Td fw={600} ta="center">
          {isLeader ? (
            <IconTrophy
              size={16}
              color="var(--mantine-color-yellow-6)"
              style={{ verticalAlign: "middle" }}
            />
          ) : (
            <Text span c="dimmed" size="sm">
              {i + 1}
            </Text>
          )}
        </Table.Td>
        <Table.Td ta="center">
          <Text span fw={700} size="sm">
            {values.total}
          </Text>
        </Table.Td>
        <Table.Td fw={isLeader ? 700 : 500}>
          {user?.displayName || user?.email}
        </Table.Td>

        {values.episodePoints.map((x, idx) => (
          <Table.Td key={idx} ta="center">
            <Text span size="sm" c={x === 0 ? "dimmed" : undefined}>
              {x}
            </Text>
          </Table.Td>
        ))}

        {activePropBetKeys.length > 0 && (
          <Table.Td ta="center">
            <PropBetCell
              points={values.propBetPoints}
              scores={propBetScores[uid]}
              activeKeys={activePropBetKeys}
            />
          </Table.Td>
        )}
      </Table.Tr>
    );
  });

  return (
    <Table.ScrollContainer minWidth={300}>
      <Table
        withColumnBorders
        highlightOnHover
        verticalSpacing="sm"
        style={{ width: "auto" }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={50} ta="center">
              #
            </Table.Th>
            <Table.Th w={80} ta="center">
              Total
            </Table.Th>
            <Table.Th>Participant</Table.Th>
            {filteredEpisodes.map((x) => (
              <Table.Th key={x.id} w={60} ta="center">
                Ep {x.order}
              </Table.Th>
            ))}
            {activePropBetKeys.length > 0 && (
              <Table.Th w={80} ta="center">
                Props
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

function PropBetCell({
  points,
  scores,
  activeKeys,
}: {
  points: number;
  scores?: PropBetScores;
  activeKeys: PropBetQuestionKey[];
}) {
  const correctProps = activeKeys.filter(
    (key) => scores?.[key]?.status === "definitive_correct",
  );

  const label =
    correctProps.length > 0
      ? correctProps
          .map(
            (key) =>
              `${PropBetsQuestions[key].description} (+${PropBetsQuestions[key].point_value})`,
          )
          .join("\n")
      : undefined;

  const content = (
    <Text
      span
      size="sm"
      c={points === 0 ? "dimmed" : undefined}
      style={label ? { cursor: "default" } : undefined}
    >
      {points}
    </Text>
  );

  if (!label) return content;

  return (
    <Tooltip label={label} multiline maw={300} withArrow>
      {content}
    </Tooltip>
  );
}
