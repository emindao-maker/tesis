/* Cinta de contacto: el WhatsApp que se arrastra sacando chispas */
(function () {
  var zona = document.querySelector(".cz");
  if (!zona) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var lienzo = zona.querySelector(".cz-chispas");
  var pieza = zona.querySelector(".cz-arrastre");
  var punto = zona.querySelector(".cz-punto");
  var bola = zona.querySelector(".cz-bola");
  var cinta = zona.querySelector(".cz-a");
  if (!lienzo || !pieza || !cinta || !lienzo.getContext) return;
  zona.classList.add("cz-js");

  var ctx = lienzo.getContext("2d");
  var dpr = 1, ancho = 0, alto = 0;
  var chispas = [];
  var enPantalla = false, pestana = true, visible = false, corriendo = false;
  var x = 0, pausa = 0, ultimo = 0;
  var PENDIENTE = Math.tan(2.5 * Math.PI / 180);

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    ancho = zona.clientWidth; alto = zona.clientHeight;
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function reiniciar() { x = cinta.clientWidth + 40; pausa = 0; }

  function soltar(px, py, n, tipo) {
    for (var i = 0; i < n; i++) {
      var ang, vel;
      if (tipo === "golpe") { ang = Math.PI + Math.random() * Math.PI; vel = 1.5 + Math.random() * 3.5; }
      else { ang = -Math.PI * (0.02 + Math.random() * 0.42); vel = 3 + Math.random() * 9; }
      chispas.push({
        x: px, y: py, px: px, py: py,
        vx: Math.cos(ang) * vel + (tipo === "golpe" ? 0 : 1.5),
        vy: Math.sin(ang) * vel,
        vida: 1, gasto: 0.012 + Math.random() * 0.03,
        suelo: py, tono: tipo === "golpe" ? (Math.random() < 0.5 ? 145 : 42) : 28 + Math.random() * 28,
        rebotes: 0, tipo: tipo
      });
    }
    if (chispas.length > 700) chispas.splice(0, chispas.length - 700);
  }

  function cuadro(t) {
    if (!visible) { corriendo = false; return; }
    var dt = Math.min((t - (ultimo || t)) / 16.67, 3); ultimo = t;
    var caja = zona.getBoundingClientRect();

    /* Movimiento de la pieza de derecha a izquierda */
    if (pausa > 0) { pausa -= dt; }
    else {
      x -= 4.2 * dt;
      var vib = Math.sin(t / 22) * 1.1;
      var tilt = 9 + Math.sin(t / 47) * 2.2;
      pieza.style.transform = "translate(" + x.toFixed(1) + "px," + (-pieza.offsetHeight - 2 + vib).toFixed(1) + "px) rotate(" + tilt.toFixed(1) + "deg)";
      if (x < -pieza.offsetWidth - 60) { pausa = 70; reiniciar(); }
      else {
        var r = punto.getBoundingClientRect();
        var cx = r.left - caja.left, cy = r.top - caja.top;
        if (cx > -20 && cx < ancho + 20) {
          soltar(cx, cy, 3 + Math.floor(Math.random() * 4), "roce");
          /* brillo en el punto de roce */
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34);
          g.addColorStop(0, "rgba(255,240,200,.95)"); g.addColorStop(.3, "rgba(255,170,60,.45)"); g.addColorStop(1, "rgba(255,120,0,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, 6.3); ctx.fill();
          ctx.restore();
        }
      }
    }

    /* Rastro: se borra a medias para que las chispas dejen estela */
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (var i = chispas.length - 1; i >= 0; i--) {
      var c = chispas[i];
      c.px = c.x; c.py = c.y;
      c.vy += 0.32 * dt; c.vx *= 0.985;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vida -= c.gasto * dt;
      if (c.tipo === "roce") {
        /* la cinta sube un poco hacia la derecha */
        c.suelo -= (c.x - c.px) * PENDIENTE;
        if (c.y > c.suelo && c.vy > 0 && c.rebotes < 2) { c.y = c.suelo; c.vy *= -0.38; c.vx *= 0.7; c.rebotes++; }
      }
      if (c.vida <= 0 || c.y > alto + 20 || c.x > ancho + 40) { chispas.splice(i, 1); continue; }
      var luz = 55 + c.vida * 40;
      ctx.strokeStyle = "hsla(" + c.tono + ",100%," + luz + "%," + Math.min(1, c.vida * 1.4) + ")";
      ctx.lineWidth = 0.6 + c.vida * 2.2;
      ctx.beginPath(); ctx.moveTo(c.px - c.vx * 0.6, c.py - c.vy * 0.6); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    ctx.restore();
    requestAnimationFrame(cuadro);
  }

  /* Cada vez que el ícono grande toca el piso, salta un puñado de chispas */
  if (bola) bola.addEventListener("animationiteration", function () {
    if (!visible) return;
    var r = bola.getBoundingClientRect(), caja = zona.getBoundingClientRect();
    soltar(r.left - caja.left + r.width / 2, r.bottom - caja.top, 14, "golpe");
  });

  function arrancar() { if (visible && !corriendo) { corriendo = true; ultimo = 0; requestAnimationFrame(cuadro); } }

  medir(); reiniciar();
  window.addEventListener("resize", function () { medir(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { enPantalla = e[0].isIntersecting; visible = enPantalla && pestana; arrancar(); }, { rootMargin: "100px" }).observe(zona);
  } else { enPantalla = true; visible = true; arrancar(); }
  document.addEventListener("visibilitychange", function () { pestana = !document.hidden; visible = enPantalla && pestana; arrancar(); });
})();
