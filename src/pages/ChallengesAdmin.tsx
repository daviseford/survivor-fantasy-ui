import { ChallengeCRUDTable, CreateChallenge } from "../components/Challenges";

export const ChallengesAdmin = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Manage Challenges</h2>
      <CreateChallenge />
      <ChallengeCRUDTable />
    </div>
  );
};
