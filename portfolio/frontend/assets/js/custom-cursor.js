document.addEventListener("DOMContentLoaded", () => {
  const cursorDot = document.getElementById("cursorDot");

  if (!cursorDot || !window.matchMedia("(hover: hover)").matches) {
    return;
  }

  document.addEventListener("mousemove", (event) => {
    cursorDot.style.left = `${event.clientX}px`;
    cursorDot.style.top = `${event.clientY}px`;
    cursorDot.classList.add("is-active");
  });

  document.addEventListener("mouseleave", () => {
    cursorDot.classList.remove("is-active");
  });

  const interactiveSelector =
    "a, button, input, textarea, select, [role='button']";

  document.addEventListener("mouseover", (event) => {
    cursorDot.classList.toggle(
      "is-pointer",
      Boolean(event.target.closest(interactiveSelector))
    );
  });
});