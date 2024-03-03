import { LineChart } from "@mantine/charts";
import { random, shuffle } from "lodash-es";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";

export const SurvivorPerEpisodeScoringChart = () => {
  //   const {} = useCompetition();

  const { survivorPointsByEpisode } = useScoringCalculations();

  const data = Object.entries(survivorPointsByEpisode).reduce(
    (accum, [survivorName, scores]) => {
      scores.forEach((s) => {
        const idx = s.episode_num - 1;

        const prevScoreTotal = accum?.[idx - 1]?.[survivorName] || 0;

        if (survivorName === "Pearl Dale")
          console.log({ prevScoreTotal, currentEp: s.episode_num });

        accum[idx] = {
          ...(accum[idx] || {}),
          [survivorName]: s.total + prevScoreTotal,
          episode_num: s.episode_num,
        };
      });

      return accum;
    },

    [] as { episode_num: number; [x: string]: number }[],
  );

  console.log({ data });

  const series = Object.keys(survivorPointsByEpisode).map((x) => ({
    name: x,
    color: `${shuffle(["indigo", "blue", "red", "gray"])[0]}.${random(0, 6)}`,
  }));

  return (
    <LineChart h={300} data={data} series={series} dataKey="episode_num" />
  );
};
