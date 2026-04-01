import { Badge, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCrown, IconDice5 } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlimUser } from "../../types";
import classes from "./DraftOrderReveal.module.css";

type Props = {
  pickOrder: SlimUser[];
  onComplete: () => void;
};

/** How often names shuffle (ms) */
const SHUFFLE_INTERVAL = 80;

/** Base delay before the first slot locks (ms) */
const INITIAL_DELAY = 3500;

/** Max stagger between sequential slot locks (ms) — compressed for large groups */
const MAX_STAGGER = 500;

/** Pause after all slots lock before calling onComplete (ms) */
const COMPLETION_PAUSE = 1000;

function getDisplayName(user: SlimUser): string {
  return user.displayName || user.email || user.uid;
}

export const DraftOrderReveal = ({ pickOrder, onComplete }: Props) => {
  const [lockedSlots, setLockedSlots] = useState<boolean[]>(
    () => new Array(pickOrder.length).fill(false) as boolean[],
  );
  const [displayNames, setDisplayNames] = useState<string[]>(
    () => new Array(pickOrder.length).fill("") as string[],
  );
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const completedRef = useRef(false);

  const allNames = pickOrder.map(getDisplayName);

  const getRandomName = useCallback(
    (excludeIndex?: number) => {
      if (allNames.length <= 1) return allNames[0] ?? "";
      let name: string;
      do {
        name = allNames[Math.floor(Math.random() * allNames.length)];
      } while (excludeIndex !== undefined && name === allNames[excludeIndex]);
      return name;
    },
    [allNames],
  );

  useEffect(() => {
    const slotCount = pickOrder.length;
    if (slotCount === 0) {
      onComplete();
      return;
    }

    // Compute stagger so lock-in phase scales with group size
    const stagger = Math.min(MAX_STAGGER, 3000 / slotCount);

    // Start shuffling all slots
    const intervals: ReturnType<typeof setInterval>[] = [];
    for (let i = 0; i < slotCount; i++) {
      const interval = setInterval(() => {
        setDisplayNames((prev) => {
          const next = [...prev];
          next[i] = getRandomName(i);
          return next;
        });
      }, SHUFFLE_INTERVAL);
      intervals.push(interval);
    }
    intervalsRef.current = intervals;

    // Stagger the lock-in for each slot
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < slotCount; i++) {
      const lockDelay = INITIAL_DELAY + i * stagger;
      const timeout = setTimeout(() => {
        // Stop shuffling this slot
        clearInterval(intervals[i]);

        // Set the final name
        setDisplayNames((prev) => {
          const next = [...prev];
          next[i] = getDisplayName(pickOrder[i]);
          return next;
        });

        // Mark as locked
        setLockedSlots((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });

        // If this is the last slot, schedule onComplete
        if (i === slotCount - 1 && !completedRef.current) {
          completedRef.current = true;
          const completionTimeout = setTimeout(() => {
            onComplete();
          }, COMPLETION_PAUSE);
          timeouts.push(completionTimeout);
        }
      }, lockDelay);
      timeouts.push(timeout);
    }
    timeoutsRef.current = timeouts;

    // Cleanup on unmount
    return () => {
      intervals.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Paper p="xl" radius="md" withBorder>
      <Stack gap="lg" align="center" className={classes.container}>
        <ThemeIcon size={56} radius="xl" variant="light" color="blue">
          <IconDice5 size={30} />
        </ThemeIcon>
        <div className={classes.title}>
          <Title order={2} ta="center">
            Shuffling draft order...
          </Title>
          <Text size="sm" c="dimmed" ta="center" mt={4}>
            Who picks first? Let's find out!
          </Text>
        </div>

        <div className={classes.slotList}>
          {pickOrder.map((_, index) => {
            const isLocked = lockedSlots[index];
            const isFirst = isLocked && index === 0;
            const allLocked = lockedSlots.every(Boolean);
            const isFirstPicker = isFirst && allLocked;

            const slotClasses = [
              classes.slot,
              !isLocked ? classes.shuffling : "",
              isLocked && !isFirstPicker ? classes.locked : "",
              isFirstPicker ? classes.firstPicker : "",
            ]
              .filter(Boolean)
              .join(" ");

            const nameClasses = [
              classes.slotName,
              !isLocked ? classes.shufflingText : classes.lockedText,
            ].join(" ");

            return (
              <div key={index} className={slotClasses}>
                <Badge
                  className={classes.slotNumber}
                  variant={isFirstPicker ? "filled" : "light"}
                  color={isFirstPicker ? "yellow" : isLocked ? "blue" : "gray"}
                  size="lg"
                  circle
                >
                  {index + 1}
                </Badge>
                <span className={nameClasses}>
                  {displayNames[index] || "\u00A0"}
                </span>
                {isFirstPicker && (
                  <ThemeIcon
                    size={28}
                    radius="xl"
                    variant="filled"
                    color="yellow"
                  >
                    <IconCrown size={16} />
                  </ThemeIcon>
                )}
              </div>
            );
          })}
        </div>
      </Stack>
    </Paper>
  );
};
