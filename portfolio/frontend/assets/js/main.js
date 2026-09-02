document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-loaded");

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Menu mobile
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Active link corresponding to the visible section
  const sections = document.querySelectorAll("main section[id]");
  const navLinkEls = document.querySelectorAll("[data-nav-link]");

  if (sections.length && navLinkEls.length && "IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id");
            navLinkEls.forEach((link) => {
              link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
            });
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  // Reveal on scroll (includes .about-facts and .skills-table so the internal stagger works)
  const revealEls = document.querySelectorAll(".reveal, .about-facts, .skills-table");
  if (revealEls.length && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Scroll progress bar
  const progressBar = document.getElementById("scrollProgress");
  if (progressBar) {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${pct}%`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  // The crosshair follows the mouse within the hero.
  const hero = document.querySelector(".hero");
  const crosshair = document.getElementById("heroCrosshair");
  if (hero && crosshair && window.matchMedia("(hover: hover)").matches) {
    hero.addEventListener("mousemove", (event) => {
      const rect = hero.getBoundingClientRect();
      crosshair.style.left = `${event.clientX - rect.left - 12}px`;
      crosshair.style.top = `${event.clientY - rect.top - 12}px`;
    });
  }

  // Subtle 3D tilt on project cards
  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("mousemove", (event) => {
      const card = event.target.closest(".project-card");
      document.querySelectorAll(".project-card").forEach((c) => {
        if (c !== card) c.style.transform = "";
      });
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    document.addEventListener("mouseleave", (event) => {
      if (event.target.classList && event.target.classList.contains("project-card")) {
        event.target.style.transform = "";
      }
    }, true);
  }

  // Dynamic tab title: grabs attention when the user switches to another tab.
  (function () {
    let storedTitle = document.title;
    let timeoutId = null;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        storedTitle = document.title;
        const lang = typeof i18n !== "undefined" && typeof i18n.getLang === "function" ? i18n.getLang() : "pt";
        document.title = lang === "en" ? "👋 Come back!" : "👋 Volta aqui!";
        if (timeoutId) clearTimeout(timeoutId);
      } else {
        document.title = storedTitle;
      }
    });
  })();

  // Custom cursor (desktop only)
  const cursorDot = document.getElementById("cursorDot");
  if (cursorDot && window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("mousemove", (event) => {
      cursorDot.style.left = `${event.clientX}px`;
      cursorDot.style.top = `${event.clientY}px`;
      cursorDot.classList.add("is-active");
    });

    document.addEventListener("mouseleave", () => {
      cursorDot.classList.remove("is-active");
    });

    const interactiveSelector = "a, button, input, textarea, [role='button']";
    document.addEventListener("mouseover", (event) => {
      cursorDot.classList.toggle("is-pointer", Boolean(event.target.closest(interactiveSelector)));
    });
  }

  // Typing effect on the system-panel values (runs once on load)
  const panelValues = document.querySelectorAll(".system-panel-value");
  if (panelValues.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    panelValues.forEach((el, rowIndex) => {
      const fullText = el.textContent;
      el.textContent = "";
      el.classList.add("is-typing");

      let charIndex = 0;
      const startDelay = rowIndex * 220;
      const typeChar = () => {
        el.textContent = fullText.slice(0, charIndex);
        charIndex += 1;
        if (charIndex <= fullText.length) {
          setTimeout(typeChar, 22);
        } else {
          el.classList.remove("is-typing");
        }
      };
      setTimeout(typeChar, startDelay);
    });
  }
});