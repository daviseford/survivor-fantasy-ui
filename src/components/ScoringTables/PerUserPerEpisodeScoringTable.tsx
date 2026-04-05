import { Table, Text, Tooltip } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { PropBetQuestionKey, PropBetsQuestions } from "../../data/propbets";
import { useCompetition } from "../../hooks/useCompetition";
import { useDragScroll } from "../../hooks/useDragScroll";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useUser } from "../../hooks/useUser";
import { PropBetScores } from "../../utils/propBetUtils";
import classes from "./ScoringTables.module.css";

const STICKY_OFFSETS = { rank: 0, total: 50, participant: 130 } as const;

export const PerUserPerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { slimUser } = useUser();

  const {
    activePropBetKeys,
    filteredEpisodes,
    pointsByUserPerEpisodeWithPropBets,
    propBetScores,
  } = useScoringCalculations();

  const scrollRef = useRef<HTMLDivElement>(null);
  useDragScroll(scrollRef);
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      ".mantine-ScrollArea-viewport",
    );
    if (viewport) {
      viewport.scrollLeft = viewport.scrollWidth;
    }
  }, [filteredEpisodes.length]);

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
      <Table.Tr
        key={uid}
        style={{
          backgroundColor: bgColor ?? "var(--mantine-color-body)",
        }}
      >
        <Table.Td
          fw={600}
          ta="center"
          className={classes.stickyCell}
          style={{ left: STICKY_OFFSETS.rank }}
        >
          {isLeader ? (
            <span aria-label="1st place">
              <IconTrophy
                size={16}
                color="var(--mantine-color-yellow-6)"
                style={{ verticalAlign: "middle" }}
              />
            </span>
          ) : (
            <Text span c="dimmed" size="sm">
              {i + 1}
            </Text>
          )}
        </Table.Td>
        <Table.Td
          ta="center"
          className={classes.stickyCell}
          style={{ left: STICKY_OFFSETS.total }}
        >
          <Text span fw={700} size="sm">
            {values.total}
          </Text>
        </Table.Td>
        <Table.Td
          fw={isLeader ? 700 : 500}
          className={`${classes.stickyCell} ${classes.stickyDivider}`}
          style={{ left: STICKY_OFFSETS.participant }}
        >
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

  if (filteredEpisodes.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        Advance to Episode 1 to see standings
      </Text>
    );
  }

  return (
    <Table.ScrollContainer minWidth={300} ref={scrollRef}>
      <Table
        withColumnBorders
        highlightOnHover
        verticalSpacing="sm"
        style={{ width: "auto" }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th
              w={50}
              ta="center"
              className={classes.stickyHeaderCell}
              style={{ left: STICKY_OFFSETS.rank }}
            >
              #
            </Table.Th>
            <Table.Th
              w={80}
              ta="center"
              className={classes.stickyHeaderCell}
              style={{ left: STICKY_OFFSETS.total }}
            >
              Total
            </Table.Th>
            <Table.Th
              w={150}
              className={`${classes.stickyHeaderCell} ${classes.stickyDivider}`}
              style={{ left: STICKY_OFFSETS.participant }}
            >
              Participant
            </Table.Th>
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
