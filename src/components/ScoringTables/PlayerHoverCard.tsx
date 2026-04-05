import { Avatar, Divider, Group, HoverCard, Stack, Text } from "@mantine/core";
import { ReactNode } from "react";
import { CastawayId, Challenge, Player } from "../../types";
import { EnhancedScores } from "../../utils/scoringUtils";

type Props = {
  playerData: Player | undefined;
  castawayId: CastawayId;
  total: number;
  episodeScores: EnhancedScores[];
  challenges: Challenge[];
  eliminationLabel: string | null;
  isNonVotedOut: boolean;
  children: ReactNode;
};

function countChallengeWins(
  challenges: Challenge[],
  castawayId: CastawayId,
  variant: Challenge["variant"],
) {
  return challenges.filter(
    (c) =>
      c.variant === variant &&
      c.winning_castaways.includes(castawayId as never),
  ).length;
}

export const PlayerHoverCard = ({
  playerData,
  castawayId,
  total,
  episodeScores,
  challenges,
  eliminationLabel,
  isNonVotedOut,
  children,
}: Props) => {
  const bestEpisode = episodeScores.reduce<{
    ep: number;
    pts: number;
  } | null>((best, s, i) => {
    if (s.total > (best?.pts ?? 0)) return { ep: i + 1, pts: s.total };
    return best;
  }, null);

  const teamImmunities = countChallengeWins(
    challenges,
    castawayId,
    "team_immunity",
  );
  const teamRewards = countChallengeWins(challenges, castawayId, "team_reward");
  const individualImmunities = countChallengeWins(
    challenges,
    castawayId,
    "immunity",
  );
  const individualRewards = countChallengeWins(
    challenges,
    castawayId,
    "reward",
  );

  const bioSegments = [
    playerData?.age && `${playerData.age}`,
    playerData?.profession,
    playerData?.hometown,
  ].filter(Boolean);

  return (
    <HoverCard
      width={280}
      shadow="md"
      openDelay={300}
      closeDelay={150}
      position="right-start"
      withinPortal
    >
      <HoverCard.Target>{children}</HoverCard.Target>
      <HoverCard.Dropdown>
        <Group gap="sm" wrap="nowrap" mb="xs">
          <Avatar
            src={playerData?.img}
            size={48}
            radius={48}
            style={{ flexShrink: 0 }}
          />
          <div>
            <Text fw={600} fz="sm" lh={1.3}>
              {playerData?.full_name ?? castawayId}
            </Text>
            {bioSegments.length > 0 && (
              <Text fz="xs" c="dimmed" lh={1.3}>
                {bioSegments.join(" · ")}
              </Text>
            )}
          </div>
        </Group>

        <Divider mb="xs" />

        <Stack gap={4}>
          {bestEpisode && bestEpisode.pts > 0 && (
            <StatRow
              label="Best Episode"
              value={`Ep ${bestEpisode.ep} (${bestEpisode.pts} pts)`}
            />
          )}
          <StatRow label="Team Immunities" value={String(teamImmunities)} />
          <StatRow label="Team Rewards" value={String(teamRewards)} />
          {individualImmunities > 0 && (
            <StatRow
              label="Individual Immunities"
              value={String(individualImmunities)}
            />
          )}
          {individualRewards > 0 && (
            <StatRow
              label="Individual Rewards"
              value={String(individualRewards)}
            />
          )}
          {eliminationLabel && (
            <StatRow
              label="Status"
              value={eliminationLabel}
              valueColor={isNonVotedOut ? "red.6" : undefined}
            />
          )}
          <Divider my={2} />
          <StatRow label="Total Points" value={String(total)} bold />
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};

function StatRow({
  label,
  value,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <Group justify="space-between" gap="xs">
      <Text fz="xs" c="dimmed">
        {label}
      </Text>
      <Text fz="xs" fw={bold ? 700 : 500} c={valueColor}>
        {value}
      </Text>
    </Group>
  );
}
