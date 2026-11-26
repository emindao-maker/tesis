/* Tesis · la página web como un libro: portada que se abre, índice y páginas. */
(function () {
  "use strict";
  var d = document, root = d.documentElement, main = d.getElementById("contenido");
  if (!main) { root.classList.remove("libro"); return; }

  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var NOMBRES = {
    inicio: "Inicio", portada: "Portada", fundador: "El fundador", sedes: "Sedes", servicios: "Servicios",
    video: "Servicios en video", proceso: "Cómo trabajamos", niveles: "Niveles de estudio",
    carreras: "Carreras", compromiso: "Nuestro compromiso", campanas: "Publicidad",
    aula: "Aula virtual", trabajos: "Trabajos realizados", comentarios: "Comentarios",
    guias: "Guías", preguntas: "Preguntas frecuentes", pagos: "Pagos", contacto: "Contacto"
  };

  function mk(tag, cls, txt) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  var banner = main.querySelector(":scope > section.banner");
  if (banner && !banner.id) banner.id = "portada";
  var secs = [].slice.call(main.children).filter(function (n) { return n.tagName === "SECTION" && n.id; });

  var foot = d.querySelector("body > footer");
  var pages = [];

  var ixSec = mk("section", "lb-ix");
  ixSec.id = "indice";
  ixSec.setAttribute("aria-labelledby", "indice-t");
  var ixPg = mk("div", "pg");
  ixPg.appendChild(ixSec);
  main.insertBefore(ixPg, main.firstChild);
  pages.push({ id: "indice", title: "Índice", pg: ixPg });

  secs.forEach(function (s) {
    var pg = mk("div", "pg");
    main.insertBefore(pg, s);
    pg.appendChild(s);
    pages.push({ id: s.id, title: NOMBRES[s.id] || s.getAttribute("aria-label") || s.id, pg: pg });
  });
  if (foot && pages.length > 1) pages[pages.length - 1].pg.appendChild(foot);

  pages.forEach(function (p, i) {
    p.pg.setAttribute("tabindex", "-1");
    p.pg.setAttribute("aria-label", p.title);
    if (i > 0) p.pg.appendChild(mk("div", "pn", "— " + i + " —"));
  });

  (function () {
    var w = mk("div", "ix-wrap");
    w.appendChild(mk("p", "ix-kick", "Tesis · Asesoría académica e investigación"));
    var h = mk("h2", "ix-t", "Índice"); h.id = "indice-t";
    w.appendChild(h);
    w.appendChild(mk("span", "ix-filete"));
    var ol = mk("ol", "ix-lista");
    pages.forEach(function (p, i) {
      if (i === 0) return;
      var li = mk("li"), a = mk("a");
      a.href = "#" + p.id;
      a.appendChild(mk("span", "ix-n", String(i)));
      a.appendChild(mk("span", "ix-nom", p.title));
      a.appendChild(mk("i", "ix-pts"));
      a.appendChild(mk("span", "ix-pag", "pág. " + i));
      li.appendChild(a); ol.appendChild(li);
    });
    w.appendChild(ol);
    w.appendChild(mk("p", "ix-ayuda", "Pasa las páginas con las flechas del teclado, con los botones de abajo o deslizando el dedo."));
    ixSec.appendChild(w);
  })();

  var cur = -1, limpiar = null;
  var pager = mk("nav", "lb-pager");
  pager.setAttribute("aria-label", "Pasar páginas");
  var bPrev = mk("button", "lb-b", "‹"); bPrev.type = "button"; bPrev.setAttribute("aria-label", "Página anterior");
  var bIdx = mk("button", "lb-b lb-idx", "Índice"); bIdx.type = "button";
  var cnt = mk("span", "lb-cnt"); cnt.setAttribute("aria-live", "polite");
  var bNext = mk("button", "lb-b", "›"); bNext.type = "button"; bNext.setAttribute("aria-label", "Página siguiente");
  [bPrev, bIdx, cnt, bNext].forEach(function (e) { pager.appendChild(e); });
  d.body.appendChild(pager);

  function pintarPager() {
    var p = pages[cur];
    cnt.textContent = cur === 0 ? "Índice" : cur + " / " + (pages.length - 1) + " · " + p.title;
    bPrev.disabled = cur <= 0;
    bNext.disabled = cur >= pages.length - 1;
    bIdx.hidden = cur === 0;
  }

  function show(i, anchor, push, user) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    if (limpiar) limpiar();
    var np = pages[i].pg, op = cur >= 0 ? pages[cur].pg : null;
    var tras = i !== cur;
    if (tras) {
      if (!reduce && op && cur >= 0) {
        var fwd = i > cur;
        np.classList.add("on", fwd ? "in-n" : "in-p");
        op.classList.add(fwd ? "out-n" : "out-p");
        var t = setTimeout(limpiar = function () {
          clearTimeout(t); limpiar = null;
          op.classList.remove("on", "out-n", "out-p");
          np.classList.remove("in-n", "in-p");
        }, 460);
      } else {
        if (op) op.classList.remove("on");
        np.classList.add("on");
      }
      pages.forEach(function (p, k) { p.pg.setAttribute("aria-hidden", k === i ? "false" : "true"); });
      cur = i;
      np.scrollTop = 0;
      pintarPager();
    }
    var tgt = anchor && anchor !== pages[i].id ? d.getElementById(anchor) : null;
    if (tgt) { try { tgt.scrollIntoView({ block: "start" }); } catch (e) { np.scrollTop = tgt.offsetTop; } }
    else if (!tras) np.scrollTop = 0;
    if (push) { try { history.pushState(null, "", "#" + (tgt ? anchor : pages[i].id)); } catch (e) {} }
    if (user) { try { np.focus({ preventScroll: true }); } catch (e) {} }
  }

  function indiceDe(id) {
    var el = id && d.getElementById(id);
    if (!el) return -1;
    var pg = el.closest(".pg");
    for (var i = 0; i < pages.length; i++) if (pages[i].pg === pg) return i;
    return -1;
  }
  function ir(id, push, user) {
    var i = indiceDe(id);
    if (i < 0) return false;
    show(i, id, push, user);
    return true;
  }

  bPrev.addEventListener("click", function () { show(cur - 1, null, true, true); });
  bNext.addEventListener("click", function () { show(cur + 1, null, true, true); });
  bIdx.addEventListener("click", function () { show(0, null, true, true); });

  d.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = decodeURIComponent(a.getAttribute("href").slice(1));
    if (id && indiceDe(id) >= 0) {
      e.preventDefault();
      ir(id, true, true);
    }
  });
  window.addEventListener("hashchange", function () {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!ir(id, false, false)) show(0, null, false, false);
  });

  d.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    if (d.querySelector("dialog[open]")) return;
    show(cur + (e.key === "ArrowRight" ? 1 : -1), null, true, false);
  });

  var tx = 0, ty = 0, tok = false;
  function scrollH(el) {
    for (; el && el !== main; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 4) {
        var ox = getComputedStyle(el).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
    }
    return false;
  }
  main.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tok = false; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; tok = !scrollH(e.target);
  }, { passive: true });
  main.addEventListener("touchend", function (e) {
    if (!tok || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 90 && Math.abs(dy) < 55) show(cur + (dx < 0 ? 1 : -1), null, true, false);
  }, { passive: true });

  var head = d.querySelector("header.top"), bm = d.querySelector(".barra-movil");
  function medir() {
    var hh = head ? Math.round(head.getBoundingClientRect().bottom) : 0;
    var b = 0;
    if (bm && getComputedStyle(bm).display !== "none") b = Math.round(bm.getBoundingClientRect().height);
    root.style.setProperty("--hh", Math.max(0, hh) + "px");
    root.style.setProperty("--bm", b + "px");
  }
  medir();
  window.addEventListener("resize", medir);
  if (window.ResizeObserver && head) new ResizeObserver(medir).observe(head);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(medir);

  var hashId = decodeURIComponent(location.hash.slice(1));
  var primera = false;
  try { primera = !sessionStorage.getItem("tesis-libro"); } catch (e) { primera = true; }

  function empezar() {
    if (!(hashId && ir(hashId, false, false))) show(0, null, false, false);
    root.classList.add("libro-listo");
  }

  if (reduce || !primera || (hashId && indiceDe(hashId) > 0)) {
    empezar();
    return;
  }

  var ov = mk("div"); ov.id = "lb-portada";
  ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Portada del libro de Tesis");
  var esc = mk("div", "lb-esc"), libro = mk("div", "lb-libro");
  var hojas = mk("div", "lb-hojas");
  hojas.appendChild(mk("b", "", "Índice"));
  for (var k = 0; k < 8; k++) hojas.appendChild(mk("i"));
  var tapa = mk("div", "lb-tapa"), fr = mk("div", "lb-frente"), dor = mk("div", "lb-dorso");
  var med = mk("span", "lb-med"), logo = mk("img");
  logo.src = "logo.webp"; logo.alt = ""; logo.width = 120; logo.height = 120;
  logo.addEventListener("error", function () { if (logo.parentNode) logo.parentNode.removeChild(logo); });
  med.appendChild(logo);
  fr.appendChild(med);
  fr.appendChild(mk("span", "lb-tit", "Tesis"));
  fr.appendChild(mk("span", "lb-fil"));
  fr.appendChild(mk("span", "lb-sub", "Asesoría académica e investigación"));
  fr.appendChild(mk("span", "lb-pie", "Quito · Ecuador"));
  tapa.appendChild(fr); tapa.appendChild(dor);
  libro.appendChild(hojas); libro.appendChild(tapa);
  esc.appendChild(libro);
  ov.appendChild(esc);
  var saltar = mk("button", "lb-saltar", "Entrar al libro"); saltar.type = "button";
  ov.appendChild(saltar);
  d.body.appendChild(ov);

  var fin = false;
  function cerrar() {
    if (fin) return; fin = true;
    try { sessionStorage.setItem("tesis-libro", "1"); } catch (e) {}
    empezar();
    ov.classList.add("fuera");
    setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 900);
  }
  ov.addEventListener("click", cerrar);
  saltar.focus();
  setTimeout(function () { libro.classList.add("abre"); }, 900);
  setTimeout(cerrar, 3300);
})();
