import { useParams } from "react-router-dom";
import { Season } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useSeason = (id?: Season["id"]) => {
  const { seasonId } = useParams();
  const key = (id ?? seasonId) || undefined;

  const { data } = useSharedSnapshot<Season | undefined>(
    "seasons",
    key,
    undefined,
  );

  return { data, isLoading: !!key && !data };
};
