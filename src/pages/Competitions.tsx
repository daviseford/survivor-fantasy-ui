import {
  Alert,
  Badge,
  Center,
  Loader,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompetitions } from "../hooks/useCompetitions";
import { useIsMobile } from "../hooks/useIsMobile";
import { useMyCompetitions } from "../hooks/useMyCompetitions";
import { useUser } from "../hooks/useUser";
import { Competition } from "../types";

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
  return (
    <Table.Th>
      <UnstyledButton
        onClick={() => onSort(field)}
        style={{ display: "flex", alignItems: "center", gap: 4 }}
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

  const rows = sorted.map((x) => (
    <Table.Tr
      onClick={() => navigate(`/competitions/${x.id}`)}
      key={x.id}
      style={{ cursor: "pointer" }}
    >
      <Table.Td fw={600}>{x.competition_name}</Table.Td>
      <Table.Td>
        <Badge variant="light" size="sm">
          S{x.season_num}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {x.participants.map((p) => p.displayName ?? p.email).join(", ")}
        </Text>
      </Table.Td>

      {!isMobile && (
        <>
          <Table.Td>
            <Text size="sm" c="dimmed">
              {x.participants.find((p) => p.uid === x.creator_uid)?.displayName}
            </Text>
          </Table.Td>
          <Table.Td>
            <Text size="xs" c="dimmed" ff="monospace">
              {x.draft_id.slice(-6)}
            </Text>
          </Table.Td>
        </>
      )}
    </Table.Tr>
  ));

  if (!slimUser) {
    return (
      <Center py="xl">
        <Alert>Please register or log in to view your competitions.</Alert>
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="md">
      <div>
        <Title order={2}>Competitions</Title>
        <Text c="dimmed" size="sm">
          Your active and past competitions.
        </Text>
      </div>

      {isLoading && (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
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

                {!isMobile && (
                  <>
                    <Table.Th>Creator</Table.Th>
                    <Table.Th>ID</Table.Th>
                  </>
                )}
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
};
