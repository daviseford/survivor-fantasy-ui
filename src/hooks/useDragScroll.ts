import { RefObject, useEffect } from "react";

/**
 * Enables click-and-drag horizontal scrolling on a Mantine ScrollArea.
 * Attaches to the `.mantine-ScrollArea-viewport` inside the given ref.
 * A 3px dead-zone prevents accidental drags from stealing clicks.
 */
export function useDragScroll(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const viewport = ref.current?.querySelector<HTMLDivElement>(
      ".mantine-ScrollArea-viewport",
    );
    if (!viewport) return;

    let isDown = false;
    let isDragging = false;
    let startX = 0;
    let scrollStart = 0;

    const DRAG_THRESHOLD = 3;

    const onMouseDown = (e: MouseEvent) => {
      // only primary button, ignore interactive elements
      if (e.button !== 0) return;
      const tag = (e.target as HTMLElement).closest(
        "button, a, input, [data-no-drag]",
      );
      if (tag) return;

      isDown = true;
      isDragging = false;
      startX = e.clientX;
      scrollStart = viewport.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;

      if (!isDragging && Math.abs(dx) >= DRAG_THRESHOLD) {
        isDragging = true;
        viewport.style.cursor = "grabbing";
        viewport.style.userSelect = "none";
      }

      if (isDragging) {
        viewport.scrollLeft = scrollStart - dx;
      }
    };

    const onMouseUp = () => {
      if (isDragging) {
        // Block the click that follows a drag
        const blockClick = (e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
        };
        viewport.addEventListener("click", blockClick, {
          capture: true,
          once: true,
        });
      }
      isDown = false;
      isDragging = false;
      viewport.style.cursor = "grab";
      viewport.style.userSelect = "";
    };

    viewport.style.cursor = "grab";

    viewport.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      viewport.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      viewport.style.cursor = "";
    };
  }, [ref]);
}
