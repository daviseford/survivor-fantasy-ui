// Create a reference to the seasons collection
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Episode, Season } from "../types";

export const SingleSeason = () => {
  const { season } = useParams();

  const [data, setData] = useState<
    { season: Season; episodes: Episode[] } | undefined
  >();

  console.log({ season });

  useEffect(() => {
    const seasonsDbRef = collection(db, "seasons");
    const _season = query(seasonsDbRef, where("id", "==", "season_" + season));

    const episodesDbRef = doc(db, "episodes", "season_" + season);
    // const _episode = query(
    //   episodesDbRef,
    //   where("id", "==", "/seasons/season_" + season),
    //   // where("season_id", "==", "/seasons/season_" + season),
    // );

    const a = async () => {
      const _seasonDocs = await getDocs(_season);
      const _episodeDocs = (await getDoc(episodesDbRef)).data() as Record<
        string,
        Episode
      >;

      const thisSeason = _seasonDocs.docs.map((x) => x.data())?.[0] as Season;

      setData({
        season: thisSeason,
        episodes: Object.values(_episodeDocs),
        // episodes not working yet
        // episodes: theseEpisodes,
      });
    };

    a();
  }, [season]);

  console.log({ data });

  return <div></div>;
};
