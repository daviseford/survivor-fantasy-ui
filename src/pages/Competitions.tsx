import { Alert, Center, Loader, Table, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useMyCompetitions } from "../hooks/useMyCompetitions";
import { useUser } from "../hooks/useUser";

export const Competitions = () => {
  const { user } = useUser();

  const navigate = useNavigate();

  const { data: competitions, isLoading } = useMyCompetitions();

  console.log({ competitions, user });

  const rows = competitions?.map((x) => {
    return (
      <Table.Tr onClick={() => navigate(`/competitions/${x.id}`)} key={x.id}>
        <Table.Td>{x.draft_id.slice(-4)}</Table.Td>
        <Table.Td>{x.competition_name}</Table.Td>
        <Table.Td>{x.season_num}</Table.Td>
        <Table.Td>
          {x.participants.map((x) => x.displayName ?? x.email).join(", ")}
        </Table.Td>
        <Table.Td>
          {x.participants.find((p) => p.uid === x.creator_uid)?.displayName}
        </Table.Td>
        {/* <Table.Td>TODO</Table.Td> */}
        {/* <Table.Td>{String(x.finished)}</Table.Td> */}
      </Table.Tr>
    );
  });

  if (!user) {
    return <Alert>Please register or log in to view your competitions!</Alert>;
  }

  return (
    <div>
      <Title order={2} pl={"xl"}>
        Competitions
      </Title>

      {isLoading && (
        <Center>
          <Loader size={"xl"} />
        </Center>
      )}

      {!isLoading && (
        <Table highlightOnHover m={"xl"}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Season</Table.Th>
              <Table.Th>Participants</Table.Th>
              <Table.Th>Creator</Table.Th>

              {/* TODO */}
              {/* <Table.Th>Current Episode</Table.Th> */}
              {/* <Table.Th>Finished?</Table.Th> */}
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      )}
    </div>
  );
};
