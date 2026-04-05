import { useParams } from "react-router-dom";
import { Competition } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useCompetition = (id?: Competition["id"]) => {
  const { competitionId } = useParams();
  const key = id ?? competitionId;

  const { data } = useSharedSnapshot("competitions", key);
  return { data: data as Competition | undefined };
};
