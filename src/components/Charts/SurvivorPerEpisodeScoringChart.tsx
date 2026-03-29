import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";

const lineColors = [
  "#e57373",
  "#ef5350",
  "#f44336",
  "#ba68c8",
  "#ab47bc",
  "#9c27b0",
  "#7986cb",
  "#5c6bc0",
  "#3f51b5",
  "#f06292",
  "#ec407a",
  "#e91e63",
  "#4dd0e1",
  "#26c6da",
  "#00bcd4",
  "#aed581",
  "#9ccc65",
  "#8bc34a",
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

  const playerNames = Object.keys(survivorPointsByEpisode);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="episode_num" />
        <YAxis />
        <Tooltip />
        <Legend />
        {playerNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={lineColors[i % lineColors.length]}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
