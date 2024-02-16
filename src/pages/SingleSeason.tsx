import { Players } from "./Players";
import { useSeason } from "../hooks/useSeason";

export const SingleSeason = () => {
  const { season } = useSeason();

  if (!season) return <div>Error: Missing data</div>;

  return (
    <div>
      <h1>Season {season?.order}</h1>
      <Players />
    </div>
  );
};
