import { Alert, Center, Loader, Table, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useCompetitions } from "../hooks/useCompetitions";
import { useIsMobile } from "../hooks/useIsMobile";
import { useMyCompetitions } from "../hooks/useMyCompetitions";
import { useUser } from "../hooks/useUser";

export const Competitions = () => {
  const { slimUser } = useUser();

  const isMobile = useIsMobile();

  const navigate = useNavigate();

  const { data: competitions, isLoading } = useMyCompetitions();
  const { data: allCompetitions } = useCompetitions();

  // prefer all comps if admin has access is in it
  const _comps =
    (allCompetitions?.length ? allCompetitions : competitions) || [];

  const rows = _comps?.map((x) => {
    return (
      <Table.Tr onClick={() => navigate(`/competitions/${x.id}`)} key={x.id}>
        <Table.Td>{x.competition_name}</Table.Td>
        <Table.Td>{x.season_num}</Table.Td>
        <Table.Td>
          {x.participants.map((x) => x.displayName ?? x.email).join(", ")}
        </Table.Td>

        {!isMobile && (
          <>
            <Table.Td>
              {x.participants.find((p) => p.uid === x.creator_uid)?.displayName}
            </Table.Td>
            <Table.Td>{x.draft_id.slice(-4)}</Table.Td>
          </>
        )}
      </Table.Tr>
    );
  });

  if (!slimUser) {
    return <Alert>Please register or log in to view your competitions!</Alert>;
  }

  return (
    <div>
      <Title order={2}>Competitions</Title>

      {isLoading && (
        <Center>
          <Loader size={"xl"} />
        </Center>
      )}

      {!isLoading && (
        <Table.ScrollContainer minWidth={300}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Season</Table.Th>
                <Table.Th>Participants</Table.Th>

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
    </div>
  );
};
