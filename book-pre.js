/* Prepara el modo libro antes de pintar la página, para evitar parpadeos. */
(function () {
  var h = document.documentElement;
  h.classList.add("libro");
  setTimeout(function () {
    if (!h.classList.contains("libro-listo")) h.classList.remove("libro");
  }, 5000);
})();
