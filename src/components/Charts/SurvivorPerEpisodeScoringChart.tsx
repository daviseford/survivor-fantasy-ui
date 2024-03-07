import { LineChart } from "@mantine/charts";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";

const lineColors = [
  "red.1",
  "red.2",
  "red.3",
  "grape.1",
  "grape.2",
  "grape.3",
  "violet.1",
  "violet.2",
  "violet.3",
  "pink.1",
  "pink.2",
  "pink.3",
  "cyan.1",
  "cyan.2",
  "cyan.3",
  "lime.1",
  "lime.2",
  "lime.3",
];

export const SurvivorPerEpisodeScoringChart = () => {
  const { survivorPointsByEpisode } = useScoringCalculations();

  const data = Object.entries(survivorPointsByEpisode).reduce(
    (accum, [survivorName, scores]) => {
      scores.forEach((s) => {
        const idx = s.episode_num - 1;

        const prevScoreTotal = accum?.[idx - 1]?.[survivorName] || 0;

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

  const series = Object.keys(survivorPointsByEpisode).map((name, i) => ({
    name: name,
    color: lineColors[i],
  }));

  return (
    <LineChart h={300} data={data} series={series} dataKey="episode_num" />
  );
};
