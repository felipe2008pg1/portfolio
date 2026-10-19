document.addEventListener("DOMContentLoaded", () => {
  const cursorDot = document.getElementById("cursorDot");

  if (
    !cursorDot ||
    !window.matchMedia("(hover: hover)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const interactiveSelector =
    "a, button, input, textarea, select, [role='button']";

    let isActive = false;
    let isPointer = false;

  document.addEventListener(
    "mousemove",
    (event) => {
      cursorDot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;

      if (!isActive) {
        isActive = true;
        cursorDot.classList.add("is-active");
      }
    },
    { passive: true }
  );

  document.documentElement.addEventListener("mouseleave", () => {
    isActive = false;
    cursorDot.classList.remove("is-active");
  });

  document.addEventListener(
    "mouseover",
    (event) => {
      const next = Boolean(
        event.target instanceof Element &&
          event.target.closest(interactiveSelector)
      );
      if (next !== isPointer) {
        isPointer = next;
        cursorDot.classList.toggle("is-pointer", next);
      }
    },
    { passive: true }
  );
});