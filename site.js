// site.js
// Two independent pieces of behavior for the site, combined into one file:
//   1. Scroll-reveal — fades/rises .reveal and .reveal-stagger elements
//      into place as they scroll into the viewport.
//   2. AJAX navigation — intercepts clicks on local .html links, fetches
//      the destination page, and swaps its #page-content into the current
//      document instead of doing a full browser reload, so moving between
//      pages feels instant and continuous.

// ---- 1. Scroll reveal ------------------------------------------------
// Exposed as window.initScrollReveal so it can be re-run after the AJAX
// navigation below swaps in new page content (DOMContentLoaded only fires
// once, but new .reveal elements show up on every navigation).
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
// ---- 2. AJAX navigation -----------------------------------------------
// Keeps the nav/footer persistent and swaps only the main content between
// pages. Each file remains a complete, independently-valid page, so direct
// visits and the W3C validator still work normally.
(function () {
  var main = document.getElementById("page-content");
  if (!main) return;

  function currentFile() {
    var path = window.location.pathname.split("/").pop();
    return path === "" ? "index.html" : path;
  }

  function isLocalPageLink(link) {
    var href = link.getAttribute("href");
    if (!href) return false;
    if (
      href.indexOf("http") === 0 ||
      href.indexOf("mailto:") === 0 ||
      href.indexOf("#") === 0
    ) {
      return false;
    }
    return href.slice(-5) === ".html";
  }

  function setActiveNav(url) {
    document.querySelectorAll(".nav-link").forEach(function (a) {
      if (a.getAttribute("href") === url) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      } else {
        a.classList.remove("active");
        a.removeAttribute("aria-current");
      }
    });
  }

  function loadPage(url, addToHistory) {
    main.classList.add("page-fade-out");

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load " + url);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var newMain = doc.getElementById("page-content");
        var newTitle = doc.querySelector("title");

        window.setTimeout(function () {
          if (newMain) {
            main.innerHTML = newMain.innerHTML;
          }
          if (newTitle) {
            document.title = newTitle.textContent;
          }

          setActiveNav(url);
          window.scrollTo({ top: 0, behavior: "smooth" });

          main.classList.remove("page-fade-out");
          main.classList.add("page-fade-in");
          window.setTimeout(function () {
            main.classList.remove("page-fade-in");
          }, 300);

          if (window.initScrollReveal) {
            window.initScrollReveal();
          }
        }, 180);

        if (addToHistory) {
          history.pushState({ url: url }, "", url);
        }
      })
      .catch(function (err) {
        console.error(err);
        window.location.href = url; // fall back to a normal page load
      });
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (!link || !isLocalPageLink(link)) return;

    var url = link.getAttribute("href");
    if (url === currentFile()) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    loadPage(url, true);
  });

  window.addEventListener("popstate", function () {
    loadPage(currentFile(), false);
  });
})();
