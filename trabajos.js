/* Nuestros trabajos realizados: galería, vista previa y subida con revisión */
(function () {
  var C = window.TRABAJOS_CONFIG || {};
  var BUCKET = C.bucket || "trabajos";
  var WA = C.whatsapp || "593985568519";
  var PAGES = C.paginasVistaPrevia || 3;
  var MAXMB = C.tamanoMaximoMB || 50;
  var listo = !!(C.supabaseUrl && C.supabaseKey && window.supabase && window.supabase.createClient);
  var sb = null;
  if (listo) {
    try { sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } }); }
    catch (e) { listo = false; }
  }
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  /* Tipos de archivo */
  var TIPOS = {
    pdf:  { label: "PDF",  kind: "pdf",    mime: "application/pdf", color: "#B3261E" },
    doc:  { label: "DOC",  kind: "office", mime: "application/msword", color: "#2B579A" },
    docx: { label: "WORD", kind: "office", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", color: "#2B579A" },
    ppt:  { label: "PPT",  kind: "office", mime: "application/vnd.ms-powerpoint", color: "#C43E1C" },
    pptx: { label: "PPT",  kind: "office", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", color: "#C43E1C" },
    pps:  { label: "PPS",  kind: "office", mime: "application/vnd.ms-powerpoint", color: "#C43E1C" },
    ppsx: { label: "PPS",  kind: "office", mime: "application/vnd.openxmlformats-officedocument.presentationml.slideshow", color: "#C43E1C" },
    xls:  { label: "XLS",  kind: "office", mime: "application/vnd.ms-excel", color: "#217346" },
    xlsx: { label: "EXCEL",kind: "office", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", color: "#217346" },
    odt:  { label: "ODT",  kind: "gview",  mime: "application/vnd.oasis.opendocument.text", color: "#2B579A" },
    odp:  { label: "ODP",  kind: "gview",  mime: "application/vnd.oasis.opendocument.presentation", color: "#C43E1C" },
    ods:  { label: "ODS",  kind: "gview",  mime: "application/vnd.oasis.opendocument.spreadsheet", color: "#217346" },
    rtf:  { label: "RTF",  kind: "gview",  mime: "application/rtf", color: "#2B579A" },
    txt:  { label: "TXT",  kind: "text",   mime: "text/plain", color: "#5A6478" },
    csv:  { label: "CSV",  kind: "text",   mime: "text/csv", color: "#217346" },
    jpg:  { label: "JPG",  kind: "image",  mime: "image/jpeg", color: "#7A5AB8" },
    jpeg: { label: "JPG",  kind: "image",  mime: "image/jpeg", color: "#7A5AB8" },
    png:  { label: "PNG",  kind: "image",  mime: "image/png", color: "#7A5AB8" },
    webp: { label: "WEBP", kind: "image",  mime: "image/webp", color: "#7A5AB8" },
    gif:  { label: "GIF",  kind: "image",  mime: "image/gif", color: "#7A5AB8" }
  };
  function extDe(nombre) { var m = /\.([a-z0-9]+)$/i.exec(nombre || ""); return m ? m[1].toLowerCase() : ""; }
  function tipoDe(ext) { return TIPOS[ext] || { label: (ext || "ARCHIVO").toUpperCase(), kind: "other", mime: "application/octet-stream", color: "#5A6478" }; }
  function tamano(b) { if (!b && b !== 0) return ""; return b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function codigo(id) { return "TR-" + String(id || "").replace(/-/g, "").slice(0, 6).toUpperCase(); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function svg(id) { var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("aria-hidden", "true"); var u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", "#" + id); s.appendChild(u); return s; }
  function urlPublica(path) { return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; }
  function enlacePedido(t) {
    var msg = "Hola, deseo este documento de ejemplo: “" + t.titulo + "” (código " + codigo(t.id) + "). ¿Cuánto me cuesta?";
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }
  function caraDoc(info) { var f = el("div", "doc-face"); var s = el("span", null, info.label); f.style.setProperty("--tc", info.color); f.appendChild(s); return f; }

  /* Render de la primera página de un PDF */
  function pdfPagina(fuente, num, ancho) {
    if (!window.pdfjsLib) return Promise.reject(new Error("sin visor"));
    var task = window.pdfjsLib.getDocument(typeof fuente === "string" ? { url: fuente } : { data: fuente });
    return task.promise.then(function (pdf) {
      return pdf.getPage(num).then(function (page) {
        var v1 = page.getViewport({ scale: 1 });
        var esc = ancho / v1.width * Math.min(window.devicePixelRatio || 1, 2);
        var vp = page.getViewport({ scale: esc });
        var c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
        return page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise.then(function () { return { canvas: c, pdf: pdf }; });
      });
    });
  }

  /* ---------- Galería ---------- */
  var grid = document.getElementById("tr-grid");
  var vacio = document.getElementById("tr-empty");
  if (!grid) return;
  var todos = [], filtro = "";

  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); cargarMiniatura(en.target); } });
  }, { rootMargin: "200px" }) : null;

  function cargarMiniatura(thumb) {
    var url = thumb.dataset.url;
    pdfPagina(url, 1, 320).then(function (r) {
      var face = thumb.querySelector(".doc-face"); if (face) face.remove();
      thumb.insertBefore(r.canvas, thumb.firstChild);
    }).catch(function () {});
  }

  function tarjeta(t) {
    var ext = (t.tipo || extDe(t.archivo)), info = tipoDe(ext), url = urlPublica(t.archivo);
    var li = el("li", "tr-card");
    var th = el("button", "tr-thumb"); th.type = "button"; th.setAttribute("aria-label", "Ver vista previa de " + t.titulo);
    var tag = el("span", "tr-type", info.label); tag.style.setProperty("--tc", info.color); th.appendChild(tag);
    if (info.kind === "image") { var im = el("img"); im.src = url; im.alt = ""; im.loading = "lazy"; th.insertBefore(im, tag); }
    else {
      th.insertBefore(caraDoc(info), tag);
      if (info.kind === "pdf") { th.dataset.url = url; if (io) io.observe(th); else cargarMiniatura(th); }
    }
    th.addEventListener("click", function () { abrirVisor(t); });
    li.appendChild(th);
    var b = el("div", "tr-bodyc");
    b.appendChild(el("span", "tr-cat", [t.categoria, t.nivel].filter(Boolean).join(" · ")));
    b.appendChild(el("h3", null, t.titulo));
    b.appendChild(el("p", "tr-meta", [t.carrera, codigo(t.id)].filter(Boolean).join(" · ")));
    var acc = el("div", "tr-actions");
    var ver = el("button", "tr-view"); ver.type = "button"; ver.appendChild(svg("i-eye")); ver.appendChild(document.createTextNode("Vista previa"));
    ver.addEventListener("click", function () { abrirVisor(t); });
    var pedir = el("a", "tr-ask"); pedir.href = enlacePedido(t); pedir.target = "_blank"; pedir.rel = "noopener";
    pedir.appendChild(svg("i-wa")); pedir.appendChild(document.createTextNode("Lo quiero"));
    acc.appendChild(ver); acc.appendChild(pedir); b.appendChild(acc);
    li.appendChild(b);
    return li;
  }

  function pintar() {
    grid.textContent = "";
    var lista = todos.filter(function (t) { return !filtro || t.categoria === filtro; });
    lista.forEach(function (t) { grid.appendChild(tarjeta(t)); });
    var hay = lista.length > 0;
    vacio.hidden = hay;
    if (!hay && todos.length) {
      document.getElementById("tr-empty-t").textContent = "No hay trabajos de este tipo todavía";
      document.getElementById("tr-empty-p").textContent = "Prueba con otro filtro o sube un documento de este tipo.";
    }
  }

  function esqueletos() {
    grid.textContent = "";
    for (var i = 0; i < 4; i++) {
      var li = el("li", "tr-card tr-skel"); li.setAttribute("aria-hidden", "true");
      li.appendChild(el("div", "tr-thumb"));
      var b = el("div", "tr-bodyc"); b.appendChild(el("h3", null, "Cargando trabajo")); b.appendChild(el("p", "tr-meta", "Cargando"));
      li.appendChild(b); grid.appendChild(li);
    }
  }

  function cargar() {
    if (!listo) { grid.textContent = ""; vacio.hidden = false; return; }
    esqueletos();
    sb.from("trabajos").select("id,creado_en,titulo,categoria,nivel,carrera,archivo,tipo,tamano")
      .eq("aprobado", true).order("creado_en", { ascending: false }).limit(120)
      .then(function (r) {
        if (r.error) throw r.error;
        todos = r.data || []; pintar();
      })
      .catch(function () {
        grid.textContent = ""; vacio.hidden = false;
        document.getElementById("tr-empty-t").textContent = "No pudimos cargar los trabajos";
        document.getElementById("tr-empty-p").textContent = "Revisa tu conexión y vuelve a abrir la página en un momento.";
      });
  }

  document.querySelectorAll(".tr-filters .chip").forEach(function (ch) {
    ch.addEventListener("click", function () {
      filtro = ch.dataset.cat;
      document.querySelectorAll(".tr-filters .chip").forEach(function (o) { o.setAttribute("aria-pressed", o === ch ? "true" : "false"); });
      pintar();
    });
  });

  /* ---------- Ventanas ---------- */
  function abrir(d) { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }
  function cerrar(d) { if (d.close) d.close(); else d.removeAttribute("open"); }
  document.querySelectorAll("dialog.tr-dialog").forEach(function (d) {
    d.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { cerrar(d); }); });
    d.addEventListener("click", function (e) { if (e.target === d) cerrar(d); });
  });

  /* ---------- Visor ---------- */
  var visor = document.getElementById("tr-viewer"), vBody = document.getElementById("trv-body");
  var turno = 0;
  function abrirVisor(t) {
    var mio = ++turno;
    var ext = t.tipo || extDe(t.archivo), info = tipoDe(ext), url = urlPublica(t.archivo);
    document.getElementById("trv-title").textContent = t.titulo;
    document.getElementById("trv-cat").textContent = [t.categoria, t.nivel, t.carrera, codigo(t.id)].filter(Boolean).join(" · ");
    document.getElementById("trv-ask").href = enlacePedido(t);
    vBody.textContent = "";
    var cargando = el("p", "trv-msg", "Cargando vista previa…"); vBody.appendChild(cargando);
    abrir(visor);
    function fallo() { if (mio !== turno) return; vBody.textContent = ""; vBody.appendChild(el("p", "trv-msg", "No se pudo mostrar la vista previa de este archivo. Pídenos el documento por WhatsApp y te lo enviamos.")); }

    if (info.kind === "image") {
      var im = el("img"); im.alt = "Vista previa de " + t.titulo; im.onload = function () { cargando.remove(); }; im.onerror = fallo; im.src = url; vBody.appendChild(im);
    } else if (info.kind === "pdf") {
      if (!window.pdfjsLib) return fallo();
      window.pdfjsLib.getDocument({ url: url }).promise.then(function (pdf) {
        if (mio !== turno) return;
        cargando.remove();
        var n = Math.min(pdf.numPages, PAGES), ancho = Math.min(vBody.clientWidth - 44, 780);
        var cadena = Promise.resolve();
        for (var i = 1; i <= n; i++) (function (p) {
          cadena = cadena.then(function () {
            return pdf.getPage(p).then(function (page) {
              var v1 = page.getViewport({ scale: 1 }), esc = ancho / v1.width * Math.min(window.devicePixelRatio || 1, 2), vp = page.getViewport({ scale: esc });
              var c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height; c.setAttribute("aria-label", "Página " + p);
              if (mio === turno) vBody.appendChild(c);
              return page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
            });
          });
        })(i);
        cadena.then(function () {
          if (mio !== turno) return;
          var resto = pdf.numPages - n;
          var m = el("div", "trv-more", resto > 0 ? "El documento tiene " + resto + (resto === 1 ? " página más" : " páginas más") + ". Pídelo completo por WhatsApp." : "Fin de la muestra. Pídenos el documento completo por WhatsApp.");
          vBody.appendChild(m);
        });
      }).catch(fallo);
    } else if (info.kind === "office" || info.kind === "gview") {
      var fr = el("iframe"); fr.title = "Vista previa de " + t.titulo; fr.loading = "lazy";
      fr.src = info.kind === "office"
        ? "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(url)
        : "https://docs.google.com/gview?embedded=1&url=" + encodeURIComponent(url);
      fr.onload = function () { cargando.remove(); };
      vBody.appendChild(fr);
    } else if (info.kind === "text") {
      fetch(url).then(function (r) { return r.text(); }).then(function (txt) {
        if (mio !== turno) return; cargando.remove();
        var corte = txt.length > 2500;
        vBody.appendChild(el("pre", null, txt.slice(0, 2500) + (corte ? "…" : "")));
        if (corte) vBody.appendChild(el("div", "trv-more", "Esta es solo una parte del texto. Pídelo completo por WhatsApp."));
      }).catch(fallo);
    } else { fallo(); }
  }
  visor.addEventListener("close", function () { turno++; vBody.textContent = ""; });

  /* ---------- Subida ---------- */
  var dlgUp = document.getElementById("tr-upload"), form = document.getElementById("tru-form");
  var fileIn = document.getElementById("tru-file"), drop = document.getElementById("tru-drop"), prev = document.getElementById("tru-preview");
  var estado = document.getElementById("tru-status"), enviar = document.getElementById("tru-send");
  var archivo = null, urlLocal = null;

  document.getElementById("tr-open").addEventListener("click", function () { estado.hidden = true; abrir(dlgUp); });

  function mostrarArchivo(f) {
    archivo = f; prev.textContent = ""; if (urlLocal) { URL.revokeObjectURL(urlLocal); urlLocal = null; }
    if (!f) { prev.hidden = true; return; }
    var ext = extDe(f.name), info = tipoDe(ext);
    var pv = el("div", "pv"), txt = el("p");
    txt.appendChild(el("b", null, f.name)); txt.appendChild(document.createTextNode(info.label + " · " + tamano(f.size)));
    if (info.kind === "image") { urlLocal = URL.createObjectURL(f); var im = el("img"); im.alt = ""; im.src = urlLocal; pv.appendChild(im); }
    else {
      pv.appendChild(caraDoc(info));
      if (info.kind === "pdf") f.arrayBuffer().then(function (buf) { return pdfPagina(new Uint8Array(buf), 1, 120); }).then(function (r) {
        if (archivo !== f) return; pv.textContent = ""; pv.appendChild(r.canvas);
        txt.appendChild(document.createTextNode(" · " + r.pdf.numPages + (r.pdf.numPages === 1 ? " página" : " páginas")));
      }).catch(function () {});
    }
    prev.appendChild(pv); prev.appendChild(txt); prev.hidden = false;
    var t = document.getElementById("tru-titulo");
    if (!t.value.trim()) t.value = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 140);
    error("tru-e-file", "");
  }
  fileIn.addEventListener("change", function () { mostrarArchivo(fileIn.files[0] || null); });
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) mostrarArchivo(f); });

  function error(id, msg) { var e = document.getElementById(id); if (e) e.textContent = msg; }
  function aviso(tipo, msg) { estado.className = "tru-status " + tipo; estado.textContent = msg; estado.hidden = false; }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var ok = true;
    var titulo = form.titulo.value.trim(), cat = form.categoria.value;
    if (!archivo) { error("tru-e-file", "Elige el archivo que quieres subir."); ok = false; }
    else if (!TIPOS[extDe(archivo.name)]) { error("tru-e-file", "Ese tipo de archivo no se acepta. Sube un PDF, Word, PowerPoint, Excel, imagen, OpenDocument, RTF o texto."); ok = false; }
    else if (archivo.size > MAXMB * 1048576) { error("tru-e-file", "El archivo pesa " + tamano(archivo.size) + ". El máximo es " + MAXMB + " MB."); ok = false; }
    error("tru-e-titulo", titulo.length < 3 ? "Escribe un título de al menos 3 letras." : ""); if (titulo.length < 3) ok = false;
    error("tru-e-cat", cat ? "" : "Elige el tipo de trabajo."); if (!cat) ok = false;
    error("tru-e-ok", form.ok.checked ? "" : "Confirma que el documento no tiene datos personales de otras personas."); if (!form.ok.checked) ok = false;
    if (!ok) return;
    if (!listo) { aviso("bad", "La subida todavía no está activada en la página. Mientras tanto, envíanos tu documento por WhatsApp al 098 556 8519."); return; }

    var ext = extDe(archivo.name), info = tipoDe(ext);
    var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    var ruta = "subidas/" + id + "." + ext;
    enviar.disabled = true; enviar.querySelector("span").textContent = "Subiendo…"; estado.hidden = true;
    sb.storage.from(BUCKET).upload(ruta, archivo, { contentType: info.mime, upsert: false, cacheControl: "31536000" })
      .then(function (r) {
        if (r.error) throw r.error;
        return sb.from("trabajos").insert({
          titulo: titulo, categoria: cat, nivel: form.nivel.value || null, carrera: form.carrera.value.trim() || null,
          autor: form.autor.value.trim() || null, contacto: form.contacto.value.trim() || null,
          archivo: ruta, nombre_archivo: archivo.name.slice(0, 200), tipo: ext, tamano: archivo.size
        });
      })
      .then(function (r) {
        if (r.error) throw r.error;
        form.reset(); mostrarArchivo(null);
        aviso("ok", "Listo, tu documento ya está publicado en Nuestros trabajos realizados.");
        cargar();
      })
      .catch(function (e) {
        var m = (e && e.message) || "";
        aviso("bad", /size|large|413/i.test(m) ? "El archivo es muy pesado para subirlo. Prueba con uno de menos de " + MAXMB + " MB." : "No se pudo subir el archivo. Revisa tu conexión e inténtalo otra vez; si sigue fallando, envíanoslo por WhatsApp.");
      })
      .then(function () { enviar.disabled = false; enviar.querySelector("span").textContent = "Subir documento"; });
  });

  cargar();
})();
