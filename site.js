// site.js — treats the 5 pages as one scrollable sequence (Home, Experience,
// Projects, Skills, Contact). Scrolling near the bottom loads the next page;
// scrolling near the top loads the previous one; nav links jump straight to
// a page, loading anything missing along the way (forward or backward).

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

(function () {
  const PAGES = [
    "index.html",
    "experience.html",
    "projects.html",
    "skills.html",
    "contact.html",
  ];
  const TITLES = {
    "index.html": "Xavier Guinness Stout — Software Engineer",
    "experience.html": "Experience — Xavier Guinness Stout",
    "projects.html": "Projects — Xavier Guinness Stout",
    "skills.html": "Skills — Xavier Guinness Stout",
    "contact.html": "Contact — Xavier Guinness Stout",
  };

  const stream = document.getElementById("page-stream");
  const topSentinel = document.getElementById("load-sentinel-top");
  const bottomSentinel = document.getElementById("load-sentinel-bottom");
  if (!stream || !topSentinel || !bottomSentinel) return;

  const currentFile = () =>
    window.location.pathname.split("/").pop() || "index.html";

  let firstIdx = PAGES.indexOf(currentFile());
  let lastIdx = firstIdx;
  let isLoadingNext = false;
  let isLoadingPrev = false;

  const setActiveNav = (file) =>
    document.querySelectorAll(".nav-link").forEach((a) => {
      const active = a.getAttribute("href") === file;
      a.classList.toggle("active", active);
      active
        ? a.setAttribute("aria-current", "page")
        : a.removeAttribute("aria-current");
    });

  // Reveal-on-scroll: fades/rises .reveal / .reveal-stagger elements in.
  let revealObserver;
  function initReveal() {
    const targets = document.querySelectorAll(".reveal, .reveal-stagger");
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            revealObserver.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    targets.forEach(
      (el) =>
        !el.classList.contains("is-visible") && revealObserver.observe(el),
    );
  }

  // Tracks which page-block is on screen; keeps URL/title/nav in sync.
  const sectionObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const file = e.target.dataset.page;
        setActiveNav(file);
        document.title = TITLES[file] || document.title;
        history.replaceState({}, "", file);
      }),
    { threshold: 0.4 },
  );

  function fetchBlock(file) {
    return fetch(file)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(file))))
      .then((html) => {
        const block = new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector(`.page-block[data-page="${file}"]`);
        if (!block) throw new Error("missing block: " + file);
        return block;
      });
  }

  // Appends the next page in sequence just above the bottom sentinel.
  function appendNext() {
    if (isLoadingNext || lastIdx >= PAGES.length - 1)
      return Promise.resolve(null);
    isLoadingNext = true;
    return fetchBlock(PAGES[lastIdx + 1])
      .then((block) => {
        stream.insertBefore(block, bottomSentinel);
        lastIdx++;
        initReveal();
        sectionObserver.observe(block);
        return block;
      })
      .catch((err) => (console.error(err), null))
      .finally(() => (isLoadingNext = false));
  }

  // Prepends the previous page in sequence just below the top sentinel,
  // then compensates scroll position so the viewport doesn't jump.
  function prependPrev() {
    if (isLoadingPrev || firstIdx <= 0) return Promise.resolve(null);
    isLoadingPrev = true;
    return fetchBlock(PAGES[firstIdx - 1])
      .then((block) => {
        const heightBefore = document.documentElement.scrollHeight;
        stream.insertBefore(block, topSentinel.nextSibling);
        firstIdx--;
        initReveal();
        sectionObserver.observe(block);
        const heightAfter = document.documentElement.scrollHeight;
        window.scrollBy(0, heightAfter - heightBefore);
        return block;
      })
      .catch((err) => (console.error(err), null))
      .finally(() => (isLoadingPrev = false));
  }

  // Loads every page between what's currently loaded and the target, in
  // whichever direction is needed, then resolves with the target's block.
  function ensureLoadedThrough(target) {
    const targetIdx = PAGES.indexOf(target);
    if (targetIdx === -1) return Promise.resolve(null);

    if (targetIdx >= firstIdx && targetIdx <= lastIdx) {
      return Promise.resolve(
        stream.querySelector(`.page-block[data-page="${target}"]`),
      );
    }

    let chain = Promise.resolve();
    if (targetIdx > lastIdx) {
      for (let i = lastIdx; i < targetIdx; i++)
        chain = chain.then(() => appendNext());
    } else {
      for (let i = firstIdx; i > targetIdx; i--)
        chain = chain.then(() => prependPrev());
    }
    return chain.then(() =>
      stream.querySelector(`.page-block[data-page="${target}"]`),
    );
  }

  // Nav/footer link clicks: jump straight to a page, either direction.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    const target = link && link.getAttribute("href");
    if (!target || PAGES.indexOf(target) === -1) return;
    e.preventDefault();

    ensureLoadedThrough(target).then((block) => {
      if (!block) return;
      block.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState({}, "", target);
      document.title = TITLES[target] || document.title;
      setActiveNav(target);
    });
  });

  // Continuous scroll: sentinels trigger loading the next/previous page.
  new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && appendNext()),
    {
      rootMargin: "600px 0px 600px 0px",
    },
  ).observe(bottomSentinel);

  new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && prependPrev()),
    {
      rootMargin: "600px 0px 600px 0px",
    },
  ).observe(topSentinel);

  document
    .querySelectorAll(".page-block")
    .forEach((b) => sectionObserver.observe(b));
  setActiveNav(currentFile());
  document.addEventListener("DOMContentLoaded", initReveal);
})();
