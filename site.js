// site.js
// Treats the 5 pages as one continuous sequence: Home, Experience, Projects,
// Skills, Contact. As the person scrolls to the bottom of the current
// content, the next page in line is fetched and appended below it, so the
// whole site reads as one long scrolling page even though it's really 5
// separate files. Clicking a nav link loads (if needed) everything up to
// that page and jumps straight to it.

(function () {
  var PAGE_ORDER = [
    "index.html",
    "experience.html",
    "projects.html",
    "skills.html",
    "contact.html",
  ];

  var PAGE_TITLES = {
    "index.html": "Xavier Guinness Stout — Software Engineer",
    "experience.html": "Experience — Xavier Guinness Stout",
    "projects.html": "Projects — Xavier Guinness Stout",
    "skills.html": "Skills — Xavier Guinness Stout",
    "contact.html": "Contact — Xavier Guinness Stout",
  };

  var stream = document.getElementById("page-stream");
  if (!stream) return;

  // Tracks which pages have been appended, in order.
  var loaded = [currentFile()];
  var isLoadingNext = false;

  function currentFile() {
    var path = window.location.pathname.split("/").pop();
    return path === "" || !path ? "index.html" : path;
  }

  function pageIndex(file) {
    return PAGE_ORDER.indexOf(file);
  }

  function lastLoadedFile() {
    return loaded[loaded.length - 1];
  }

  function setActiveNav(file) {
    document.querySelectorAll(".nav-link").forEach(function (a) {
      if (a.getAttribute("href") === file) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      } else {
        a.classList.remove("active");
        a.removeAttribute("aria-current");
      }
    });
  }

  // Fetches one page and appends its .page-block to the stream.
  // Returns the appended element (or the existing one if already loaded).
  function loadPageBlock(file) {
    var existing = stream.querySelector(
      '.page-block[data-page="' + file + '"]',
    );
    if (existing) return Promise.resolve(existing);

    return fetch(file)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load " + file);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var block = doc.querySelector('.page-block[data-page="' + file + '"]');
        if (!block) throw new Error("No .page-block found in " + file);

        stream.appendChild(block);
        loaded.push(file);

        if (window.initScrollReveal) {
          window.initScrollReveal();
        }
        observeBlock(block);

        return block;
      })
      .catch(function (err) {
        console.error(err);
        return null;
      });
  }

  // Loads every page between the last-loaded one and the target, in order.
  function ensureLoadedThrough(targetFile) {
    var targetIdx = pageIndex(targetFile);
    if (targetIdx === -1) return Promise.resolve(null);

    var chain = Promise.resolve();
    var lastIdx = pageIndex(lastLoadedFile());

    if (targetIdx <= lastIdx) {
      return Promise.resolve(
        stream.querySelector('.page-block[data-page="' + targetFile + '"]'),
      );
    }

    for (var i = lastIdx + 1; i <= targetIdx; i++) {
      (function (file) {
        chain = chain.then(function () {
          return loadPageBlock(file);
        });
      })(PAGE_ORDER[i]);
    }
    return chain;
  }

  // ---- Nav / footer link clicks: jump straight to a page -------------
  function isSequencedLink(link) {
    var href = link.getAttribute("href");
    return href && PAGE_ORDER.indexOf(href) !== -1;
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (!link || !isSequencedLink(link)) return;

    var target = link.getAttribute("href");
    e.preventDefault();

    // Pages before where we currently are aren't kept loaded going
    // backwards, so just do a normal navigation to them.
    if (
      pageIndex(target) < pageIndex(currentFile()) &&
      !loaded.includes(target)
    ) {
      window.location.href = target;
      return;
    }

    ensureLoadedThrough(target).then(function (block) {
      if (!block) return;
      block.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState({}, "", target);
      document.title = PAGE_TITLES[target] || document.title;
      setActiveNav(target);
    });
  });

  // ---- Continuous scroll: auto-load the next page near the bottom ----
  var scrollTicking = false;

  function maybeLoadNext() {
    var lastIdx = pageIndex(lastLoadedFile());
    if (lastIdx === PAGE_ORDER.length - 1 || isLoadingNext) return;

    var nearBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;

    if (nearBottom) {
      isLoadingNext = true;
      loadPageBlock(PAGE_ORDER[lastIdx + 1]).then(function () {
        isLoadingNext = false;
      });
    }
  }

  window.addEventListener("scroll", function () {
    if (!scrollTicking) {
      window.requestAnimationFrame(function () {
        maybeLoadNext();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });

  // ---- Track which section is on screen, update URL + active nav -----
  var sectionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var file = entry.target.getAttribute("data-page");
          setActiveNav(file);
          document.title = PAGE_TITLES[file] || document.title;
          history.replaceState({}, "", file);
        }
      });
    },
    { threshold: 0.4 },
  );

  function observeBlock(block) {
    sectionObserver.observe(block);
  }

  // ---- Init: observe whichever block is already on the page ----------
  document.querySelectorAll(".page-block").forEach(observeBlock);
  setActiveNav(currentFile());
})();

// ---- Scroll reveal ------------------------------------------------
// Fades/rises .reveal and .reveal-stagger elements into place as they
// scroll into the viewport. Exposed as window.initScrollReveal so it can
// be re-run whenever new content is appended to the page stream above.
(function () {
  var currentObserver = null;

  function initScrollReveal() {
    var targets = document.querySelectorAll(".reveal, .reveal-stagger");

    if (currentObserver) {
      currentObserver.disconnect();
    }

    if (!("IntersectionObserver" in window) || targets.length === 0) {
      targets.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    currentObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach(function (el) {
      if (!el.classList.contains("is-visible")) {
        currentObserver.observe(el);
      }
    });
  }

  window.initScrollReveal = initScrollReveal;
  document.addEventListener("DOMContentLoaded", initScrollReveal);
})();
