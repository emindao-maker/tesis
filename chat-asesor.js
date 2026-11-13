/* Chat "Asesor en línea · Arley Ortiz": lo que se escribe aquí se abre en WhatsApp */
(function () {
  var NUMERO = "593985568519";
  var chat = document.getElementById("ch");
  if (!chat) return;
  var cuerpo = document.getElementById("ch-cuerpo");
  var estado = document.getElementById("ch-estado");
  var form = document.getElementById("ch-form");
  var campo = document.getElementById("ch-texto");
  var rapidas = document.getElementById("ch-rapidas");
  var aviso = document.getElementById("ch-aviso");
  var botonFlotante = document.querySelector(".float-wa");
  var saludado = false, abierto = false, ultimoFoco = null;

  /* ---------- Sonidos (se crean en el navegador, sin archivos) ---------- */
  var audio = null;
  function ac() {
    if (!audio) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; audio = new C(); }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  function nota(a, frec, ini, dur, vol, tipo, frecFin) {
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + ini;
    o.type = tipo || "sine";
    o.frequency.setValueAtTime(frec, t);
    if (frecFin) o.frequency.exponentialRampToValueAtTime(frecFin, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var sonido = {
    abrir: function () { var a = ac(); if (!a) return;
      nota(a, 520, 0, 0.09, 0.18, "sine", 900);          /* pop */
      nota(a, 1318.5, 0.07, 0.35, 0.16, "sine");          /* mi */
      nota(a, 1760, 0.17, 0.5, 0.14, "sine");             /* la */
      nota(a, 2637, 0.17, 0.3, 0.04, "triangle"); },
    recibir: function () { var a = ac(); if (!a) return;
      nota(a, 880, 0, 0.12, 0.13, "sine", 1040);
      nota(a, 1175, 0.1, 0.22, 0.12, "sine"); },
    enviar: function () { var a = ac(); if (!a) return;
      nota(a, 600, 0, 0.16, 0.12, "sine", 1500); }
  };

  /* ---------- Utilidades ---------- */
  function hora() { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function abajo() { cuerpo.scrollTop = cuerpo.scrollHeight; }
  function enlace(texto) { return "https://wa.me/" + NUMERO + "?text=" + encodeURIComponent(texto); }
  var PALOMAS = '<svg class="ch-palomas" viewBox="0 0 16 11" aria-hidden="true"><path fill="currentColor" d="M11.07.65 4.85 7.4 2.1 4.6l-.97.95 3.75 3.8L12.06 1.6zM14.9.65 8.67 7.4l-.62-.63-.96.96 1.6 1.62L15.88 1.6z"/></svg>';

  function burbuja(quien, html, cola) {
    var d = document.createElement("div");
    d.className = "ch-msj " + quien + (cola ? " ch-cola" : "");
    d.innerHTML = html + '<time>' + hora() + (quien === "yo" ? PALOMAS : "") + '</time>';
    cuerpo.appendChild(d); abajo();
    return d;
  }
  function texto(t) { var p = document.createElement("p"); p.textContent = t; return p.outerHTML; }

  var cola = Promise.resolve();
  function escribe(html, espera, primera) {
    cola = cola.then(function () {
      return new Promise(function (listo) {
        estado.textContent = "escribiendo…"; estado.classList.add("ch-escribe");
        var puntos = document.createElement("div");
        puntos.className = "ch-puntos"; puntos.innerHTML = "<span></span><span></span><span></span>";
        cuerpo.appendChild(puntos); abajo();
        setTimeout(function () {
          puntos.remove();
          estado.textContent = "en línea"; estado.classList.remove("ch-escribe");
          burbuja("el", html, primera); sonido.recibir();
          setTimeout(listo, 250);
        }, espera);
      });
    });
    return cola;
  }

  function saludar() {
    if (saludado) return; saludado = true;
    escribe('<span class="ch-firma">Arley Ortiz · Asesor</span>' + texto("¡Hola! 👋 Soy Arley, asesor de Tesis."), 1100, true);
    escribe(texto("Cuéntame qué necesitas: tesis, ensayo, proyecto, demanda o un curso del aula virtual. Escríbelo aquí y tu mensaje me llega directo a WhatsApp."), 1500, false)
      .then(function () { rapidas.hidden = false; abajo(); });
  }

  /* ---------- Abrir y cerrar ---------- */
  function abrir(e) {
    if (e) e.preventDefault();
    sonido.abrir();
    if (abierto) { campo.focus(); return; }
    abierto = true; ultimoFoco = document.activeElement;
    aviso.hidden = true;
    chat.classList.remove("ch-cierra"); chat.hidden = false;
    if (botonFlotante) botonFlotante.classList.remove("ch-con-num"), botonFlotante.classList.add("ch-abierto"), botonFlotante.setAttribute("aria-expanded", "true");
    try { sessionStorage.setItem("ch-visto", "1"); } catch (err) {}
    saludar();
    setTimeout(function () { if (window.innerWidth > 760) campo.focus(); }, 300);
  }
  function cerrar() {
    if (!abierto) return; abierto = false;
    chat.classList.add("ch-cierra");
    setTimeout(function () { chat.hidden = true; chat.classList.remove("ch-cierra"); }, 220);
    if (botonFlotante) botonFlotante.classList.remove("ch-abierto"), botonFlotante.setAttribute("aria-expanded", "false");
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  document.querySelectorAll("[data-chat]").forEach(function (b) { b.addEventListener("click", function (e) { if (abierto && b === botonFlotante) { e.preventDefault(); cerrar(); } else abrir(e); }); });
  document.getElementById("ch-cerrar").addEventListener("click", cerrar);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && abierto) cerrar(); });
  aviso.addEventListener("click", function (e) { if (e.target.closest(".ch-x")) { aviso.hidden = true; return; } abrir(e); });

  /* ---------- Enviar a WhatsApp ---------- */
  function enviar(t) {
    t = (t || "").trim();
    if (!t) { campo.focus(); return; }
    var url = enlace(t);
    var ventana = window.open(url, "_blank");
    if (ventana) { try { ventana.opener = null; } catch (err) {} }
    var btn = form.querySelector(".ch-enviar");
    btn.classList.remove("ch-vuela"); void btn.offsetWidth; btn.classList.add("ch-vuela");
    sonido.enviar();
    var b = burbuja("yo", texto(t));
    setTimeout(function () { var p = b.querySelector(".ch-palomas"); if (p) p.classList.add("leido"); }, 900);
    campo.value = ""; ajustar(); rapidas.hidden = true;
    escribe(texto("¡Recibido! Se abrió WhatsApp con tu mensaje: solo toca enviar y te respondo por ahí. ✅") +
      '<a class="ch-ir" href="' + url + '" target="_blank" rel="noopener noreferrer"><svg aria-hidden="true"><use href="#i-wa"/></svg>Abrir WhatsApp otra vez</a>', 1300, false);
    if (!ventana) { setTimeout(function () { location.href = url; }, 600); }
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); enviar(campo.value); });
  campo.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(campo.value); } });
  function ajustar() { campo.style.height = "38px"; campo.style.height = Math.min(campo.scrollHeight, 110) + "px"; }
  campo.addEventListener("input", ajustar);
  rapidas.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    enviar(b.getAttribute("data-msj"));
  });

  /* ---------- Aviso "Asesor en línea" a los pocos segundos ---------- */
  var visto = false;
  try { visto = sessionStorage.getItem("ch-visto") === "1"; } catch (err) {}
  if (!visto) setTimeout(function () {
    if (abierto) return;
    aviso.hidden = false;
    if (botonFlotante) botonFlotante.classList.add("ch-con-num");
  }, 4000);
})();

/* Etiquétanos en tus redes: copiar hashtags */
(function () {
  var aviso = document.getElementById("ht-ok");
  if (!aviso) return;
  function copiar(texto, listo) {
    var plan = function () {
      var t = document.createElement("textarea"); t.value = texto; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); try { document.execCommand("copy"); listo(); } catch (e) {} t.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(listo, plan); else plan();
  }
  document.querySelectorAll(".ht-chip").forEach(function (b) {
    b.addEventListener("click", function () {
      var tag = b.getAttribute("data-tag");
      copiar(tag, function () {
        b.classList.add("ok"); b.querySelector("i").textContent = "¡Copiado!";
        aviso.textContent = tag + " copiado. Pégalo en tu publicación.";
        setTimeout(function () { b.classList.remove("ok"); b.querySelector("i").textContent = "Copiar"; }, 1600);
      });
    });
  });
  var todos = document.getElementById("ht-todos");
  if (todos) todos.addEventListener("click", function () {
    var tags = [].map.call(document.querySelectorAll(".ht-chip"), function (b) { return b.getAttribute("data-tag"); }).join(" ");
    copiar("Asesoría de tesis 100 % online con Tesis 👉 https://emindao-maker.github.io/tesis/ " + tags, function () {
      aviso.textContent = "Listo: copiaste los 5 hashtags con el enlace de la página.";
    });
  });
})();
