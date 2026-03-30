import { Box, Group, Paper, Text } from "@mantine/core";
import { arc as d3Arc } from "d3-shape";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  CategoryBreakdown,
  CategoryColors,
  CategoryLabels,
  ScoringCategories,
  ScoringCategory,
} from "../../utils/scoringCategories";
import styles from "./NightingaleRose.module.css";

export type RoseDataEntry = {
  name: string;
  categories: CategoryBreakdown[];
};

type TooltipState = {
  name: string;
  category: ScoringCategory;
  points: number;
  x: number;
  y: number;
};

type ArcSegment = {
  category: ScoringCategory;
  points: number;
  innerRadius: number;
  outerRadius: number;
};

type NightingaleRoseProps = {
  data: RoseDataEntry[];
  size: number;
};

const PADDING_ANGLE = 0.02; // radians (~1.1 degrees)
const MIN_RADIUS = 20; // minimum inner radius for visual clarity

export const NightingaleRose = ({ data, size }: NightingaleRoseProps) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const center = size / 2;
  const maxRadius = center - 10; // leave a small margin

  // Find the max total score across all entries for scaling
  const maxTotal = Math.max(
    ...data.map((entry) =>
      entry.categories.reduce((sum, c) => sum + c.points, 0),
    ),
    1, // prevent division by zero
  );

  const anglePerPetal = (2 * Math.PI) / data.length;
  const arcGenerator = d3Arc();

  // Pre-compute geometry for all petals: category → { innerRadius, outerRadius }
  const petalGeometry = useMemo(() => {
    const availableRadius = maxRadius - MIN_RADIUS;
    return data.map((entry) => {
      const segments: ArcSegment[] = [];
      let currentInner = MIN_RADIUS;

      for (const { category, points } of entry.categories) {
        if (points <= 0) continue;
        const radialExtent = (points / maxTotal) * availableRadius;
        segments.push({
          category,
          points,
          innerRadius: currentInner,
          outerRadius: currentInner + radialExtent,
        });
        currentInner += radialExtent;
      }
      return segments;
    });
  }, [data, maxTotal, maxRadius]);

  const getRelativePos = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [],
  );

  const handleMouseEnter = useCallback(
    (
      e: React.MouseEvent<SVGPathElement>,
      name: string,
      category: ScoringCategory,
      points: number,
    ) => {
      const pos = getRelativePos(e);
      if (!pos) return;
      setTooltip({ name, category, points, ...pos });
    },
    [getRelativePos],
  );

  const handleClick = useCallback(
    (
      e: React.MouseEvent<SVGPathElement>,
      name: string,
      category: ScoringCategory,
      points: number,
    ) => {
      e.stopPropagation();
      const pos = getRelativePos(e);
      if (!pos) return;
      setTooltip((prev) =>
        prev?.name === name && prev?.category === category
          ? null
          : { name, category, points, ...pos },
      );
    },
    [getRelativePos],
  );

  const handleDismiss = useCallback(() => setTooltip(null), []);

  return (
    <div>
      <div
        ref={containerRef}
        className={styles.container}
        onClick={handleDismiss}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          style={{ maxWidth: size, display: "block", margin: "0 auto" }}
        >
          <g transform={`translate(${center},${center})`}>
            {data.map((entry, i) => {
              // Start from top (-PI/2), go clockwise
              const startAngle =
                -Math.PI / 2 + i * anglePerPetal + PADDING_ANGLE / 2;
              const endAngle =
                -Math.PI / 2 +
                (i + 1) * anglePerPetal -
                PADDING_ANGLE / 2;

              const segments = petalGeometry[i];

              return (
                <g key={entry.name}>
                  {segments.map(
                    ({ category, points, innerRadius, outerRadius }) => {
                      const path = arcGenerator({
                        innerRadius,
                        outerRadius,
                        startAngle: startAngle + Math.PI / 2,
                        endAngle: endAngle + Math.PI / 2,
                      });

                      if (!path) return null;

                      return (
                        <path
                          key={category}
                          d={path}
                          fill={CategoryColors[category]}
                          stroke="var(--mantine-color-body)"
                          strokeWidth={1}
                          className={styles.segment}
                          onMouseEnter={(e) =>
                            handleMouseEnter(e, entry.name, category, points)
                          }
                          onMouseLeave={handleDismiss}
                          onClick={(e) =>
                            handleClick(e, entry.name, category, points)
                          }
                        />
                      );
                    },
                  )}
                  {/* Name label at the outer edge of the petal */}
                  {data.length <= 10 && (
                    <text
                      x={
                        (maxRadius + 8) *
                        Math.cos((startAngle + endAngle) / 2)
                      }
                      y={
                        (maxRadius + 8) *
                        Math.sin((startAngle + endAngle) / 2)
                      }
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={size <= 300 ? 8 : 10}
                      fill="var(--mantine-color-text)"
                      className={styles.label}
                    >
                      {entry.name.split(" ")[0]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {tooltip && (
          <Paper
            className={styles.tooltip}
            p="xs"
            shadow="md"
            radius="sm"
            withBorder
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            <Text size="sm" fw={600}>
              {tooltip.name}
            </Text>
            <Group gap={4}>
              <Box
                w={10}
                h={10}
                style={{
                  borderRadius: 2,
                  backgroundColor: CategoryColors[tooltip.category],
                }}
              />
              <Text size="xs" c="dimmed">
                {CategoryLabels[tooltip.category]}: {tooltip.points} pts
              </Text>
            </Group>
          </Paper>
        )}
      </div>

      {/* Legend */}
      <Group gap="md" justify="center" mt="sm">
        {ScoringCategories.map((category) => (
          <Group key={category} gap={4}>
            <Box
              w={12}
              h={12}
              style={{
                borderRadius: 2,
                backgroundColor: CategoryColors[category],
              }}
            />
            <Text size="xs">{CategoryLabels[category]}</Text>
          </Group>
        ))}
      </Group>
    </div>
  );
};
