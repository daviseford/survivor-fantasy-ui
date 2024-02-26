import { Center, Loader, Table, Title } from "@mantine/core";
import { useFirestoreQueryData } from "@react-query-firebase/firestore";
import { collection, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useUser } from "../hooks/useUser";
import { Competition } from "../types";

export const Competitions = () => {
  const { user } = useUser();

  const navigate = useNavigate();

  const ref = collection(db, "competitions");

  const _query = query(
    ref,
    where("participant_uids", "array-contains", user?.uid || ""),
  );

  const { data: competitions, isLoading } = useFirestoreQueryData<
    Competition[],
    Competition[]
  >(
    ["competitions", user?.uid],
    // @ts-expect-error asd
    _query,
    {},
    { enabled: Boolean(user?.uid) },
  );

  console.log({ competitions, user });

  const rows = competitions?.map((x) => {
    return (
      <Table.Tr onClick={() => navigate(`/competitions/${x.id}`)}>
        <Table.Td>{x.draft_id.slice(-4)}</Table.Td>
        <Table.Td>{x.season_id}</Table.Td>
        <Table.Td>
          {x.participants.map((x) => x.displayName ?? x.email).join(", ")}
        </Table.Td>
        <Table.Td>
          {x.participants.find((p) => p.uid === x.creator)?.displayName}
        </Table.Td>
        <Table.Td>TODO</Table.Td>
        <Table.Td>TODO</Table.Td>
      </Table.Tr>
    );
  });

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
            <Table.Th>ID</Table.Th>
            <Table.Th>Season</Table.Th>
            <Table.Th>Participants</Table.Th>
            <Table.Th>Creator</Table.Th>

            {/* TODO */}
            <Table.Th>Current Episode</Table.Th>
            <Table.Th>Finished?</Table.Th>
          </Table.Thead>

          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      )}
    </div>
  );
};
