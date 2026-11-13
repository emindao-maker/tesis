/* Escudo de Tesis: se carga antes que todo lo demás */
(function () {
  /* 1. Anti-clickjacking: la página no se deja mostrar dentro de otra web */
  try {
    if (window.top !== window.self) {
      document.documentElement.style.display = "none";
      window.top.location.replace(window.self.location.href);
    }
  } catch (e) {
    document.documentElement.style.display = "none";
  }

  /* 2. Solo HTTPS (GitHub Pages ya lo fuerza; esto cubre enlaces viejos) */
  if (location.protocol === "http:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    location.replace("https://" + location.host + location.pathname + location.search + location.hash);
  }

  /* 3. Aviso contra estafas de "pega este código en la consola" */
  try {
    var t = "font:700 28px sans-serif;color:#C0392B";
    var p = "font:400 15px sans-serif;color:#0F1E3A";
    console.log("%c¡Alto!", t);
    console.log("%cEsta herramienta es para desarrolladores. Si alguien te pidió copiar y pegar algo aquí para \"activar\" una función o \"ver un documento gratis\", es una estafa y podría robar tu cuenta.", p);
    console.log("%cTesis nunca te pedirá esto. Reporta cualquier intento al WhatsApp 098 556 8519.", p);
  } catch (e) {}
})();
