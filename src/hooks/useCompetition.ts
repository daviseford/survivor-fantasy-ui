import { useParams } from "react-router-dom";
import { Competition } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useCompetition = (id?: Competition["id"]) => {
  const { competitionId } = useParams();
  const key = id ?? competitionId;

  return useSharedSnapshot<Competition | undefined>(
    "competitions",
    key,
    undefined,
  );
};
