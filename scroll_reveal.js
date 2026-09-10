// Fades/rises .reveal and .reveal-stagger elements into place as they
// scroll into the viewport. Uses IntersectionObserver so it's cheap and
// doesn't run on every scroll event.
document.addEventListener("DOMContentLoaded", function () {
  var targets = document.querySelectorAll(".reveal, .reveal-stagger");

  if (!("IntersectionObserver" in window) || targets.length === 0) {
    // Fallback: just show everything immediately
    targets.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  );

  targets.forEach(function (el) {
    observer.observe(el);
  });
});
