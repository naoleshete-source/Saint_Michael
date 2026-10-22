// JavaScript Document
/* Site search for Saint Michael
   Searches the main content of every page listed below and shows the
   matches in a drop-down under the search bar in the menu. */

(function () {
  // Add a page here when you add one to the menu.
  var PAGES = [
    { url: "home.html",         title: "Home" },
    { url: "aboutus.html",      title: "About Us" },
    { url: "Achievements.html", title: "Achievements" },
    { url: "Help.html",         title: "Help" },
    { url: "contact.html",      title: "Contact" }
  ];

  var form    = document.getElementById("search_form");
  var input   = document.getElementById("search_field");
  var results = document.getElementById("search_results");
  if (!form || !input || !results) return;

  var index = null;   // filled in the first time someone searches

  // Read the text of each page once, then reuse it.
  function loadIndex() {
    if (index) return index;
    index = Promise.all(PAGES.map(function (page) {
      return fetch(page.url)
        .then(function (res) { return res.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var content = doc.getElementById("content") || doc.body;
          return { url: page.url, title: page.title, text: clean(content.textContent) };
        })
        .catch(function () {
          // Pages opened straight from disk can't read each other,
          // so fall back to searching the page that is open.
          if (location.pathname.split("/").pop() !== page.url) return null;
          var content = document.getElementById("content") || document.body;
          return { url: page.url, title: page.title, text: clean(content.textContent) };
        });
    })).then(function (pages) { return pages.filter(Boolean); });
    return index;
  }

  function clean(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // A short piece of text around the first match, with the match highlighted.
  function snippet(text, query) {
    var at = text.toLowerCase().indexOf(query.toLowerCase());
    var start = Math.max(0, at - 50);
    var end = Math.min(text.length, at + query.length + 70);
    var piece = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
    var safe = escapeHtml(piece);
    var pattern = new RegExp(escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return safe.replace(pattern, function (m) { return "<mark>" + m + "</mark>"; });
  }

  function search(query) {
    query = query.trim();
    if (query.length < 2) { hide(); return; }

    loadIndex().then(function (pages) {
      var q = query.toLowerCase();
      var hits = pages.filter(function (p) {
        return p.title.toLowerCase().indexOf(q) !== -1 || p.text.toLowerCase().indexOf(q) !== -1;
      });

      if (!hits.length) {
        results.innerHTML = '<p class="no_results">No results for "' + escapeHtml(query) + '"</p>';
      } else {
        results.innerHTML = hits.map(function (p) {
          // #:~:text= scrolls to and highlights the words on the page it opens
          var link = p.url + "#:~:text=" + encodeURIComponent(query);
          var inText = p.text.toLowerCase().indexOf(q) !== -1;
          return '<a href="' + link + '"><strong>' + escapeHtml(p.title) + "</strong>" +
                 (inText ? "<span>" + snippet(p.text, query) + "</span>" : "") + "</a>";
        }).join("");
      }
      results.style.display = "block";
    });
  }

  function hide() {
    results.style.display = "none";
  }

  var timer;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { search(input.value); }, 200);
  });

  // Pressing Enter opens the first result.
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var first = results.querySelector("a");
    if (first) location.href = first.getAttribute("href");
    else search(input.value);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { hide(); input.blur(); }
  });

  document.addEventListener("click", function (e) {
    if (!form.contains(e.target)) hide();
  });

  input.addEventListener("focus", function () {
    if (input.value.trim().length >= 2) search(input.value);
  });
})();
