import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";

const CHART_COLORS = [
  "oklch(0.646 0.222 41.116)",
  "oklch(0.6 0.118 184.714)",
  "oklch(0.398 0.07 227.392)",
  "oklch(0.828 0.189 84.429)",
  "oklch(0.769 0.188 70.08)",
  "oklch(0.488 0.243 264.376)",
  "oklch(0.696 0.17 162.48)",
  "oklch(0.627 0.265 303.9)",
  "oklch(0.645 0.246 16.439)",
  "oklch(0.75 0.18 50)",
  "oklch(0.55 0.2 140)",
  "oklch(0.7 0.15 250)",
  "oklch(0.65 0.22 330)",
  "oklch(0.58 0.19 100)",
  "oklch(0.72 0.16 200)",
  "oklch(0.6 0.24 280)",
  "oklch(0.68 0.2 20)",
  "oklch(0.52 0.15 170)",
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

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    playerNames.forEach((name, i) => {
      config[name] = {
        label: name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return config;
  }, [playerNames]);

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 12, right: 12 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="episode_num"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {playerNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
};
