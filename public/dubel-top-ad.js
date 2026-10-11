/*! Dubel top ad — Monetag In-Page Push, zone 11100824. ONE format only. */
(function () {
  "use strict";

  // ===== MASTER SWITCH — change this one word to turn ads ON/OFF =====
  var ADS_ENABLED = true;   // true = ads on, false = ads off
  // ===================================================================

  var ZONE = "11100824";
  var SRC = "https://nap5k.com/tag.min.js";
  var ID = "dubel-top-ad";

  if (!ADS_ENABLED) return;
  if (document.getElementById(ID)) return;

  function go() {
    if (document.body && document.body.hasAttribute("data-no-ads")) return;
    var s = document.createElement("script");
    s.id = ID;
    s.async = true;
    s.src = SRC;
    s.setAttribute("data-zone", ZONE);
    s.setAttribute("data-cfasync", "false");
    document.body.appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
  else go();
})();
