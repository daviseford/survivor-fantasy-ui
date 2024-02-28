import { Stack, Title } from "@mantine/core"; 
import { ChallengeCRUDTable, CreateChallenge } from "../components/Challenges";

export const ChallengesAdmin = () => {
  return (
    <div>
      <Stack gap={"xl"}>
        <Title order={2}>Manage Challenges</Title>
        <CreateChallenge />
        <ChallengeCRUDTable />
      </Stack>
    </div>
  );
};
