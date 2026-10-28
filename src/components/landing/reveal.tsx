"use client";

import { useEffect } from "react";

/**
 * Marks every `.reveal` element as it scrolls into view; CSS does the motion.
 * Nothing is hidden without JavaScript: the hiding rule only applies once `html.js-reveal` is set here.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const els = document.querySelectorAll<HTMLElement>(".reveal:not([data-in])");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    // Anything already on screen shows at once; only what is below the fold waits to rise.
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.setAttribute("data-in", "");
      else io.observe(el);
    });
    root.classList.add("js-reveal");
    return () => io.disconnect();
  }, []);
  return null;
}
