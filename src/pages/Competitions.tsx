import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconLogin,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompetitions } from "../hooks/useCompetitions";
import { useIsMobile } from "../hooks/useIsMobile";
import { useMyCompetitions } from "../hooks/useMyCompetitions";
import { useUser } from "../hooks/useUser";
import { Competition } from "../types";
import classes from "./Competitions.module.css";

type SortField = "name" | "season" | "participants";
type SortDir = "asc" | "desc";

const SortableHeader = ({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) => {
  const isActive = sortField === field;
  const Icon = isActive && sortDir === "desc" ? IconChevronDown : IconChevronUp;
  const ariaSortValue = isActive
    ? sortDir === "asc"
      ? "ascending"
      : "descending"
    : undefined;
  return (
    <Table.Th aria-sort={ariaSortValue}>
      <UnstyledButton
        onClick={() => onSort(field)}
        className={classes.sortButton}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isActive && <Icon size={14} />}
      </UnstyledButton>
    </Table.Th>
  );
};

export const Competitions = () => {
  const { slimUser } = useUser();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const { data: competitions, isLoading } = useMyCompetitions();
  const { data: allCompetitions } = useCompetitions();

  const [sortField, setSortField] = useState<SortField>("season");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const _comps = useMemo(
    () => (allCompetitions?.length ? allCompetitions : competitions) || [],
    [allCompetitions, competitions],
  );

  const sorted = useMemo(() => {
    const compareFn = (a: Competition, b: Competition) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.competition_name.localeCompare(b.competition_name);
          break;
        case "season":
          cmp = a.season_num - b.season_num;
          break;
        case "participants":
          cmp = a.participants.length - b.participants.length;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    };
    return _comps.slice().sort(compareFn);
  }, [_comps, sortField, sortDir]);

  const formatParticipants = (comp: Competition) => {
    const names = comp.participants.map((p) => p.displayName ?? p.email);
    const maxShow = isMobile ? 2 : names.length;
    const shown = names.slice(0, maxShow).join(", ");
    const remaining = names.length - maxShow;
    if (remaining > 0) {
      return `${shown} +${remaining} more`;
    }
    return shown;
  };

  const rows = sorted.map((x) => (
    <Table.Tr
      onClick={() => navigate(`/competitions/${x.id}`)}
      key={x.id}
      className={classes.clickableRow}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          navigate(`/competitions/${x.id}`);
        }
      }}
    >
      <Table.Td>
        <Text fw={600} size="sm">
          {x.competition_name}
        </Text>
        <Text size="xs" c="dimmed">
          {x.participants.find((p) => p.uid === x.creator_uid)?.displayName}
        </Text>
      </Table.Td>
      <Table.Td>
        <Tooltip label={`Season ${x.season_num}`}>
          <Badge variant="light" size="sm">
            S{x.season_num}
          </Badge>
        </Tooltip>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatParticipants(x)}</Text>
      </Table.Td>
      <Table.Td w={36}>
        <IconChevronRight size={16} className={classes.chevron} />
      </Table.Td>
    </Table.Tr>
  ));

  if (!slimUser) {
    return (
      <Center py="xl">
        <Stack align="center" gap="md">
          <Alert title="Sign in to see your competitions">
            Competitions track your draft scores against friends across a whole
            season. Log in to view yours or start a new one.
          </Alert>
          <Button
            leftSection={<IconLogin size={18} />}
            onClick={() =>
              modals.openContextModal({
                modal: "AuthModal",
                innerProps: {},
              })
            }
          >
            Log in
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Competitions</Title>
          <Text c="dimmed" size="sm">
            {sorted.length > 0
              ? `${sorted.length} competition${sorted.length === 1 ? "" : "s"}`
              : "Your active and past competitions"}
          </Text>
        </div>
        <Button
          component={Link}
          to="/seasons"
          variant="light"
          size="compact-sm"
        >
          Browse seasons
        </Button>
      </Group>

      {isLoading && (
        <Stack gap="xs">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      )}

      {!isLoading && sorted.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Text c="dimmed" ta="center">
              No competitions yet.
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Start a draft from a season page to create your first competition.
            </Text>
          </Stack>
        </Center>
      )}

      {!isLoading && sorted.length > 0 && (
        <Table.ScrollContainer minWidth={300}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <SortableHeader
                  label="Name"
                  field="name"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Season"
                  field="season"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Participants"
                  field="participants"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <Table.Th />
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
};
