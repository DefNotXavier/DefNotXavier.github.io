// site.js — treats the 5 pages as one scrollable sequence (Home, Experience,
// Projects, Skills, Contact). Scrolling near the bottom loads the next page;
// nav links jump straight to a page, loading anything missing along the way.

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
  const sentinel = document.getElementById("load-sentinel");
  if (!stream || !sentinel) return;

  const currentFile = () =>
    window.location.pathname.split("/").pop() || "index.html";
  const loaded = [currentFile()];
  let isLoadingNext = false;

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

  // Fetches one page, inserts its .page-block above the sentinel.
  function loadPageBlock(file) {
    const existing = stream.querySelector(`.page-block[data-page="${file}"]`);
    if (existing) return Promise.resolve(existing);

    return fetch(file)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(file))))
      .then((html) => {
        const block = new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector(`.page-block[data-page="${file}"]`);
        if (!block) throw new Error("missing block: " + file);
        stream.insertBefore(block, sentinel);
        loaded.push(file);
        initReveal();
        sectionObserver.observe(block);
        return block;
      })
      .catch((err) => (console.error(err), null));
  }

  // Loads every page between the last-loaded one and the target, in order.
  function ensureLoadedThrough(target) {
    const targetIdx = PAGES.indexOf(target);
    const lastIdx = PAGES.indexOf(loaded[loaded.length - 1]);
    if (targetIdx <= lastIdx)
      return Promise.resolve(
        stream.querySelector(`.page-block[data-page="${target}"]`),
      );

    let chain = Promise.resolve();
    for (let i = lastIdx + 1; i <= targetIdx; i++) {
      const file = PAGES[i];
      chain = chain.then(() => loadPageBlock(file));
    }
    return chain;
  }

  // Nav/footer link clicks: jump straight to a page.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    const target = link && link.getAttribute("href");
    if (!target || PAGES.indexOf(target) === -1) return;
    e.preventDefault();

    if (
      PAGES.indexOf(target) < PAGES.indexOf(currentFile()) &&
      !loaded.includes(target)
    ) {
      window.location.href = target;
      return;
    }

    ensureLoadedThrough(target).then((block) => {
      if (!block) return;
      block.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState({}, "", target);
      document.title = TITLES[target] || document.title;
      setActiveNav(target);
    });
  });

  // Continuous scroll: sentinel triggers loading the next page.
  const sentinelObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting || isLoadingNext) return;
        const lastIdx = PAGES.indexOf(loaded[loaded.length - 1]);
        if (lastIdx >= PAGES.length - 1) return sentinelObserver.disconnect();
        isLoadingNext = true;
        loadPageBlock(PAGES[lastIdx + 1]).then(() => (isLoadingNext = false));
      }),
    { rootMargin: "600px 0px 600px 0px" },
  );
  sentinelObserver.observe(sentinel);

  document
    .querySelectorAll(".page-block")
    .forEach((b) => sectionObserver.observe(b));
  setActiveNav(currentFile());
  document.addEventListener("DOMContentLoaded", initReveal);
})();
