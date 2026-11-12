/* global Motor */
(function () {
  "use strict";
  const { VACIA, X, REINA, COLORES, NIVELES, TECNICAS } = Motor;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // ---------- Almacenamiento seguro ----------
  const guardar = (k, v) => { try { localStorage.setItem("reinas:" + k, JSON.stringify(v)); } catch (e) {} };
  const leer = (k, def) => { try { const v = localStorage.getItem("reinas:" + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };

  const prefs = leer("prefs", { autoxPractica: true });

  // ---------- Utilidades ----------
  function aviso(txt) {
    const el = $("#aviso");
    el.textContent = txt;
    el.classList.add("ver");
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => el.classList.remove("ver"), 2400);
  }
  function fmt(seg) {
    seg = Math.max(0, Math.floor(seg));
    return Math.floor(seg / 60) + ":" + String(seg % 60).padStart(2, "0");
  }
  function hoyClave(d = new Date()) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  const nombreNivel = (id) => (NIVELES.find((n) => n.id === id) || {}).nombre || "Personal";

  let ir = function (vista) {
    $$(".vista").forEach((v) => v.classList.remove("activa"));
    $("#v-" + vista).classList.add("activa");
    window.scrollTo(0, 0);
  }

  // ---------- Navegación ----------
  let modoElegido = "practica";
  $$("[data-ir]").forEach((b) => b.addEventListener("click", () => {
    const d = b.dataset.ir;
    if (d === "practica" || d === "competitivo") { modoElegido = d; mostrarNiveles(); }
    else if (d === "diario") { mostrarDiario(); ir("diario"); }
    else if (d === "stats") { mostrarStats(); ir("stats"); }
    else ir(d);
  }));

  function mostrarNiveles() {
    const comp = modoElegido === "competitivo";
    $("#nivel-titulo").textContent = comp ? "Competitivo" : "Práctica guiada";
    const stats = leer("stats", {});
    const cont = $("#nivel-opciones");
    cont.innerHTML = "";
    NIVELES.forEach((n) => {
      const b = document.createElement("button");
      b.className = "nivel-btn";
      const s = stats["comp-" + n.id];
      b.innerHTML = `<b>${n.nombre}</b><small>${n.tam[0]}×${n.tam[0]} a ${n.tam[1]}×${n.tam[1]}, hasta ${TECNICAS[n.max].toLowerCase()}</small>` +
        (comp && s && s.mejor != null ? `<span class="mejor">${fmt(s.mejor)}</span>` : "");
      b.onclick = () => {
        const p = Motor.generar(n.id);
        if (!p) return aviso("No pude generar el puzzle, intenta de nuevo.");
        empezar({ ...p, nivelId: n.id }, modoElegido);
      };
      cont.appendChild(b);
    });
    ir("nivel");
  }

  // ---------- Juego ----------
  let J = null; // estado de la partida
  let relojId = null;

  function empezar(puzzle, modo, extra = {}) {
    const t = Motor.crearTablero(puzzle.N, puzzle.regiones);
    J = {
      p: puzzle, t, modo,
      est: new Array(puzzle.N * puzzle.N).fill(VACIA),
      hist: [],
      auto: new Set(), // ✕ puestas automáticamente por reinas
      errores: 0,
      autox: modo === "competitivo" ? false : prefs.autoxPractica,
      inicio: Date.now(), fin: null, terminado: false,
      paso: null,
      ...extra,
    };
    const comp = modo === "competitivo";
    $("#j-modo").textContent = extra.diario ? "Diario" : comp ? "Competitivo" : "Práctica";
    $("#j-nivel").textContent = puzzle.nivelId ? nombreNivel(puzzle.nivelId) : "Personal";
    $("#b-pista").classList.toggle("oculto", comp);
    $("#op-bloqueo").classList.toggle("oculto", comp);
    $("#op-bloqueo input").checked = J.autox;
    $(".controles").style.gridTemplateColumns = comp ? "1fr 1fr" : "";
    $("#fin").classList.add("oculto");
    modoFin(false);
    $("#explicacion").classList.add("oculto");
    $("#tablero").classList.remove("ganado");
    construirTablero($("#tablero"), puzzle.N, puzzle.regiones);
    ponerCoordenadas(puzzle.N, !comp);
    pintar();
    clearInterval(relojId);
    relojId = setInterval(actualizarReloj, 250);
    actualizarReloj();
    ir("juego");
  }

  function tiempo() {
    return ((J.fin || Date.now()) - J.inicio) / 1000;
  }
  function actualizarReloj() {
    if (!J) return;
    $("#j-reloj").textContent = fmt(tiempo());
    const e = $("#j-errores");
    if (J.modo === "competitivo") {
      e.textContent = J.errores ? `${J.errores} error${J.errores > 1 ? "es" : ""}` : "";
    } else e.textContent = "";
  }

  // Letras para columnas y números para filas (solo en práctica)
  function ponerCoordenadas(N, mostrar) {
    const wrap = $("#tablero").parentElement;
    wrap.classList.toggle("con-coords", mostrar);
    const cc = $("#coord-col"), cf = $("#coord-fila");
    cc.style.setProperty("--n", N); cf.style.setProperty("--n", N);
    cc.innerHTML = Array.from({ length: N }, (_, k) => `<span>${String.fromCharCode(65 + k)}</span>`).join("");
    cf.innerHTML = Array.from({ length: N }, (_, k) => `<span>${k + 1}</span>`).join("");
  }

  function construirTablero(el, N, regiones) {
    el.style.setProperty("--n", N);
    el.innerHTML = "";
    for (let i = 0; i < N * N; i++) {
      const c = document.createElement("div");
      c.className = "celda";
      c.dataset.i = i;
      const r = Math.floor(i / N), k = i % N;
      if (regiones[i] >= 0) c.style.background = COLORES[regiones[i] % COLORES.length].hex;
      else c.style.background = "#fff";
      if (r > 0 && regiones[i - N] !== regiones[i]) c.classList.add("bt");
      if (k > 0 && regiones[i - 1] !== regiones[i]) c.classList.add("bl");
      el.appendChild(c);
    }
  }

  function pintar() {
    const malas = Motor.conflictos(J.t, J.est);
    const celdas = $("#tablero").children;
    const paso = J.paso;
    for (let i = 0; i < celdas.length; i++) {
      const c = celdas[i], v = J.est[i];
      const antes = c.dataset.v;
      if (antes !== String(v)) {
        c.innerHTML = v === REINA ? '<span class="q"></span>' : v === X ? '<span class="x">×</span>' : "";
        c.dataset.v = v;
      }
      const errorPractica = J.modo !== "competitivo" && v === REINA && !J.p.solucion[i];
      c.classList.toggle("mal", malas.has(i) || errorPractica);
      c.classList.toggle("foco", !!paso && paso.foco.includes(i));
      c.classList.toggle("va-x", !!paso && paso.eliminar.includes(i) && v === VACIA);
      c.classList.toggle("va-q", !!paso && paso.colocar.includes(i) && v !== REINA);
    }
  }

  function guardarHist() {
    J.hist.push({ est: J.est.slice(), auto: new Set(J.auto) });
    if (J.hist.length > 300) J.hist.shift();
  }

  function ponerReina(i) {
    // devuelve false si el movimiento fue rechazado
    if (J.modo === "competitivo" && !J.p.solucion[i]) {
      J.errores++;
      actualizarReloj();
      const c = $("#tablero").children[i];
      c.classList.add("mal", "sacude");
      setTimeout(() => c.classList.remove("mal", "sacude"), 450);
      aviso("Esa reina no va ahí");
      return false;
    }
    J.est[i] = REINA;
    J.ultimo = i;
    J.auto.delete(i);
    if (J.autox) for (const j of J.t.ataque[i]) if (J.est[j] === VACIA) { J.est[j] = X; J.auto.add(j); }
    return true;
  }

  // Al quitar una reina, se desbloquean las ✕ automáticas que ninguna otra reina sigue cubriendo
  function quitarReina(i) {
    J.est[i] = VACIA;
    const reinas = [];
    for (let k = 0; k < J.est.length; k++) if (J.est[k] === REINA) reinas.push(k);
    for (const j of J.t.ataque[i]) {
      if (!J.auto.has(j) || J.est[j] !== X) continue;
      if (reinas.some((q) => J.t.ataque[q].includes(j))) continue;
      J.est[j] = VACIA;
      J.auto.delete(j);
    }
  }

  function tocar(i) {
    if (J.terminado) return;
    guardarHist();
    const v = J.est[i];
    if (v === VACIA) J.est[i] = X;
    else if (v === X) { if (!ponerReina(i)) { if (!J.terminado) J.est[i] = X; J.hist.pop(); } }
    else quitarReina(i);
    despuesDeMover();
  }

  function despuesDeMover() {
    if (J.terminado) return;
    if (J.paso) { J.paso = null; $("#explicacion").classList.add("oculto"); }
    pintar();
    if (Motor.resuelto(J.t, J.est)) terminar(true);
  }

  // Entrada: toque/click alterna, arrastre marca ✕
  (function entrada() {
    const tab = $("#tablero");
    let ini = null, arrastrando = false, marcar = false, visitadas = null;
    const celdaEn = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const c = el && el.closest(".celda");
      return c && tab.contains(c) ? +c.dataset.i : null;
    };
    tab.addEventListener("pointerdown", (e) => {
      if (!J || J.terminado) return;
      const i = celdaEn(e);
      if (i == null) return;
      ini = i; arrastrando = false; visitadas = new Set([i]);
      marcar = J.est[i] === VACIA;
      tab.setPointerCapture(e.pointerId);
    });
    tab.addEventListener("pointermove", (e) => {
      if (ini == null) return;
      const i = celdaEn(e);
      if (i == null || visitadas.has(i)) return;
      if (!arrastrando) {
        arrastrando = true;
        guardarHist();
        if (marcar && J.est[ini] === VACIA) J.est[ini] = X;
        if (!marcar && J.est[ini] === X) { J.est[ini] = VACIA; J.auto.delete(ini); }
      }
      visitadas.add(i);
      if (marcar && J.est[i] === VACIA) J.est[i] = X;
      if (!marcar && J.est[i] === X) { J.est[i] = VACIA; J.auto.delete(i); }
      pintar();
    });
    const soltar = () => {
      if (ini == null) return;
      if (!arrastrando) tocar(ini);
      else despuesDeMover();
      ini = null;
    };
    tab.addEventListener("pointerup", soltar);
    tab.addEventListener("pointercancel", () => { ini = null; });
  })();

  // Interruptor de bloqueo automático (práctica)
  $("#op-bloqueo input").addEventListener("change", (e) => {
    if (!J) return;
    J.autox = e.target.checked;
    prefs.autoxPractica = J.autox;
    guardar("prefs", prefs);
    if (J.terminado) return;
    guardarHist();
    if (J.autox) {
      for (let i = 0; i < J.est.length; i++) {
        if (J.est[i] !== REINA) continue;
        for (const k of J.t.ataque[i]) if (J.est[k] === VACIA) { J.est[k] = X; J.auto.add(k); }
      }
    } else {
      for (const k of J.auto) if (J.est[k] === X) J.est[k] = VACIA;
      J.auto.clear();
    }
    despuesDeMover();
  });

  $("#b-deshacer").onclick = () => {
    if (!J || J.terminado || !J.hist.length) return;
    const h = J.hist.pop();
    J.est = h.est;
    J.auto = h.auto;
    despuesDeMover();
  };
  $("#b-limpiar").onclick = () => {
    if (!J || J.terminado) return;
    guardarHist();
    J.est.fill(VACIA);
    J.auto.clear();
    despuesDeMover();
  };
  $("#salir").onclick = () => {
    clearInterval(relojId);
    if (J && J.diario) { mostrarDiario(); ir("diario"); }
    else ir("inicio");
    J = null;
  };

  // ---------- Pistas (práctica) ----------
  function buscarPaso() {
    const { t, est, p } = J;
    // Primero, errores del jugador
    const reinaMal = est.findIndex((v, i) => v === REINA && !p.solucion[i]);
    if (reinaMal >= 0) {
      const malas = Motor.conflictos(t, est);
      return {
        nivel: -1, colocar: [], eliminar: [], quitar: [reinaMal], foco: [reinaMal],
        texto: malas.has(reinaMal)
          ? `La reina en ${Motor.nombreCasilla(t, reinaMal)} choca con otra reina (misma fila, columna, región o están tocándose). Hay que sacarla.`
          : `La reina en ${Motor.nombreCasilla(t, reinaMal)} no es parte de la solución. Todavía no choca con nada, pero más adelante dejaría a alguna fila, columna o región sin espacio. Sácala y sigamos con deducciones seguras.`,
      };
    }
    const xMal = est.findIndex((v, i) => v === X && p.solucion[i]);
    if (xMal >= 0) {
      return {
        nivel: -1, colocar: [], eliminar: [], quitar: [xMal], foco: [xMal],
        texto: `Marcaste ✕ en ${Motor.nombreCasilla(t, xMal)}, pero esa casilla todavía no está descartada por ninguna regla. Quito esa marca para que las próximas deducciones sean correctas.`,
      };
    }
    return Motor.siguientePaso(t, est);
  }

  function mostrarPaso() {
    if (!J || J.terminado) return;
    const paso = buscarPaso();
    if (!paso) {
      aviso("No encontré una deducción lógica desde aquí. Este puzzle podría requerir probar opciones.");
      return;
    }
    J.paso = paso;
    $("#exp-tecnica").textContent = paso.nivel < 0 ? "Corrección" : `${TECNICAS[paso.nivel]} (nivel ${paso.nivel})`;
    $("#exp-texto").textContent = paso.texto;
    $("#explicacion").classList.remove("oculto");
    pintar();
    $("#explicacion").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  $("#b-pista").onclick = mostrarPaso;
  $("#exp-cerrar").onclick = () => { J.paso = null; $("#explicacion").classList.add("oculto"); pintar(); };
  $("#exp-aplicar").onclick = () => {
    const paso = J && J.paso;
    if (!paso) return;
    guardarHist();
    (paso.quitar || []).forEach((i) => { if (J.est[i] === REINA) quitarReina(i); else { J.est[i] = VACIA; J.auto.delete(i); } });
    Motor.aplicar(J.est, paso);
    if (paso.colocar.length) J.ultimo = paso.colocar[0];
    J.paso = null;
    pintar();
    if (Motor.resuelto(J.t, J.est)) { $("#explicacion").classList.add("oculto"); return terminar(true); }
    mostrarPaso(); // modo guiado: muestra el siguiente paso de inmediato
  };

  // ---------- Fin de partida ----------
  function terminar(gano, motivo) {
    J.terminado = true;
    J.fin = Date.now();
    clearInterval(relojId);
    actualizarReloj();
    const seg = tiempo();
    const comp = J.modo === "competitivo";
    $("#fin-emoji").classList.toggle("perdio", !gano);
    $("#fin-titulo").textContent = gano ? "¡Resuelto!" : "Perdiste";
    let txt = gano ? `Tiempo: ${fmt(seg)}` : motivo || "";
    if (gano && comp) txt += J.errores ? `\n${J.errores} error${J.errores > 1 ? "es" : ""}` : "\nSin errores";
    const clave = J.diario ? "diario" : J.p.nivelId ? (comp ? "comp-" : "prac-") + J.p.nivelId : null;
    if (clave) {
      const r = registrar(clave, gano, seg);
      if (gano && comp && r.record) txt += "\nNuevo récord";
      else if (gano && comp && r.mejor != null) txt += `\nRécord: ${fmt(r.mejor)}`;
    }
    if (J.diario) {
      const d = leer("diario", {});
      const prev = d[J.diario];
      if (gano && (!prev || !prev.ok || seg < prev.seg)) d[J.diario] = { ok: true, seg: Math.round(seg) };
      else if (!gano && !prev) d[J.diario] = { ok: false };
      guardar("diario", d);
    }
    $("#fin-texto").textContent = txt;
    const siguiente = J.diario ? "Volver al diario" : gano ? "Siguiente nivel" : "Probar otro";
    $("#fin-otro").textContent = siguiente;
    $("#fb-siguiente").textContent = siguiente;
    const demora = gano ? celebrar() : 250;
    setTimeout(() => $("#fin").classList.remove("oculto"), demora);
  }
  // Al terminar, los controles del juego se cambian por "Ver resultado" y "Siguiente nivel"
  function modoFin(activo) {
    $(".controles:not(.fin-barra)").classList.toggle("oculto", activo);
    $("#fin-barra").classList.toggle("oculto", !activo);
    if (activo) {
      $("#explicacion").classList.add("oculto");
      $("#op-bloqueo").classList.add("oculto");
    }
  }
  $("#fin-revisar").onclick = () => { $("#fin").classList.add("oculto"); modoFin(true); };
  $("#fb-resultado").onclick = () => $("#fin").classList.remove("oculto");
  $("#fb-siguiente").onclick = () => $("#fin-otro").onclick();
  $("#fin-otro").onclick = () => {
    if (J.diario) return $("#salir").onclick();
    const id = J.p.nivelId;
    const p = Motor.generar(id);
    empezar({ ...p, nivelId: id }, J.modo);
  };

  // ---------- Celebración ----------
  // Onda que sale desde la última reina, coronas que saltan una por una y confeti con los colores del tablero.
  function celebrar() {
    const tab = $("#tablero");
    const N = J.p.N;
    const origen = J.ultimo != null ? J.ultimo : Math.floor(N * N / 2);
    const r0 = Math.floor(origen / N), c0 = origen % N;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let maxDist = 0;
    [...tab.children].forEach((c, i) => {
      const d = Math.hypot(Math.floor(i / N) - r0, (i % N) - c0);
      maxDist = Math.max(maxDist, d);
      c.style.setProperty("--d", Math.round(d * 55) + "ms");
    });
    const ondaMs = Math.round(maxDist * 55) + 500;
    const reinas = [...tab.children].filter((c) => J.est[+c.dataset.i] === REINA)
      .sort((a, b) => +a.dataset.i - +b.dataset.i);
    reinas.forEach((c, k) => c.style.setProperty("--dq", ondaMs * 0.4 + k * 90 + "ms"));
    tab.classList.remove("ganado");
    void tab.offsetWidth;
    tab.classList.add("ganado");
    if (reduce) return 400;
    setTimeout(() => confeti(tab), ondaMs * 0.4 + reinas.length * 90);
    return ondaMs * 0.4 + reinas.length * 90 + 900;
  }

  function confeti(tab) {
    const rect = tab.getBoundingClientRect();
    const cv = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    cv.className = "confeti";
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    const usados = [...new Set(J.p.regiones)].map((g) => COLORES[g % COLORES.length].hex);
    const colores = usados.concat(["#18181b", "#ffffff"]);
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height * 0.45;
    const piezas = Array.from({ length: 140 }, () => {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const vel = 7 + Math.random() * 9;
      return {
        x: cx + (Math.random() - 0.5) * rect.width * 0.3, y: cy,
        vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel,
        w: 6 + Math.random() * 7, h: 4 + Math.random() * 5,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
        col: colores[Math.floor(Math.random() * colores.length)],
        corona: Math.random() < 0.06,
      };
    });
    const inicio = performance.now();
    (function cuadro(ahora) {
      const t = ahora - inicio;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const alfa = Math.max(0, 1 - Math.max(0, t - 1400) / 700);
      ctx.globalAlpha = alfa;
      for (const p of piezas) {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.corona) {
          ctx.font = "16px sans-serif";
          ctx.fillStyle = "#18181b";
          ctx.fillText("♛", -8, 6);
        } else {
          ctx.fillStyle = p.col;
          ctx.scale(1, Math.cos(p.rot * 2));
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (alfa > 0) requestAnimationFrame(cuadro);
      else cv.remove();
    })(inicio);
  }

  function registrar(clave, gano, seg) {
    const stats = leer("stats", {});
    const s = stats[clave] || { jugados: 0, ganados: 0, mejor: null, tiempos: [] };
    s.jugados++;
    let record = false;
    if (gano) {
      s.ganados++;
      seg = Math.round(seg);
      if (s.mejor == null || seg < s.mejor) { record = s.mejor != null; s.mejor = seg; }
      s.tiempos.push(seg);
      if (s.tiempos.length > 30) s.tiempos.shift();
    }
    stats[clave] = s;
    guardar("stats", stats);
    return { record, mejor: s.mejor };
  }

  // ---------- Diario ----------
  const NIVEL_POR_DIA = ["experto", "facil", "facil", "medio", "medio", "dificil", "dificil"]; // dom..sáb
  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  function mostrarDiario() {
    const cont = $("#diario-lista");
    cont.innerHTML = "";
    const res = leer("diario", {});
    const hoy = new Date();
    for (let k = 0; k < 60; k++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - k);
      const clave = hoyClave(d);
      const nivelId = NIVEL_POR_DIA[d.getDay()];
      const r = res[clave];
      const b = document.createElement("button");
      b.className = "dia" + (k === 0 ? " hoy" : "");
      b.innerHTML = `<span>${k === 0 ? "Hoy" : DIAS[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1)}<br><small>${nombreNivel(nivelId)}</small></span>` +
        `<span class="estado${r ? (r.ok ? " ok" : " malo") : ""}">${r ? (r.ok ? fmt(r.seg) : "Perdido") : "Jugar"}</span>`;
      b.onclick = () => {
        const p = Motor.generar(nivelId, Motor.semillaDeTexto("reinas:" + clave));
        empezar({ ...p, nivelId }, "competitivo", { diario: clave });
        $("#j-modo").textContent = (k === 0 ? "Hoy" : DIAS[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1));
      };
      cont.appendChild(b);
    }
  }
  function rachaDiaria() {
    const res = leer("diario", {});
    let n = 0;
    const hoy = new Date();
    for (let k = 0; k < 400; k++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - k);
      const r = res[hoyClave(d)];
      if (r && r.ok) n++;
      else if (k === 0) continue; // hoy aún puede jugarse
      else break;
    }
    return n;
  }

  // ---------- Estadísticas ----------
  function mostrarStats() {
    const stats = leer("stats", {});
    const cont = $("#stats");
    cont.innerHTML = "";
    const caja = (titulo, s, conTiempos) => {
      const d = document.createElement("div");
      d.className = "stat-caja";
      const prom = s && s.tiempos.length ? s.tiempos.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, s.tiempos.length) : null;
      d.innerHTML = `<h4>${titulo}</h4><div class="stat-grid">` +
        (conTiempos
          ? `<div><b>${s ? s.ganados + "/" + s.jugados : "0"}</b><small>ganados</small></div><div><b>${s && s.mejor != null ? fmt(s.mejor) : "–"}</b><small>récord</small></div><div><b>${prom != null ? fmt(prom) : "–"}</b><small>promedio últ. 10</small></div>`
          : `<div><b>${s ? s.ganados : 0}</b><small>resueltos</small></div>`) +
        "</div>";
      if (conTiempos && s && s.tiempos.length > 1) {
        const max = Math.max(...s.tiempos);
        const b = document.createElement("div");
        b.className = "barras";
        b.title = "Tus últimos tiempos (más bajo es mejor)";
        s.tiempos.forEach((x) => { const sp = document.createElement("span"); sp.style.height = (x / max) * 100 + "%"; b.appendChild(sp); });
        d.appendChild(b);
      }
      return d;
    };
    const dia = document.createElement("div");
    dia.className = "stat-caja";
    const sd = stats.diario;
    dia.innerHTML = `<h4>Desafío diario</h4><div class="stat-grid"><div><b>${rachaDiaria()}</b><small>racha de días</small></div><div><b>${sd ? sd.ganados : 0}</b><small>resueltos</small></div><div><b>${sd && sd.mejor != null ? fmt(sd.mejor) : "–"}</b><small>mejor tiempo</small></div></div>`;
    cont.appendChild(dia);
    NIVELES.forEach((n) => cont.appendChild(caja("Competitivo, " + n.nombre.toLowerCase(), stats["comp-" + n.id], true)));
    const prac = NIVELES.reduce((a, n) => a + ((stats["prac-" + n.id] || {}).ganados || 0), 0);
    cont.appendChild(caja("Práctica", { ganados: prac, jugados: prac, tiempos: [] }, false));
  }
  $("#stats-borrar").onclick = () => {
    if (!confirm("¿Borrar todas tus estadísticas y resultados del diario?")) return;
    guardar("stats", {}); guardar("diario", {});
    mostrarStats();
  };

  // ---------- Portada ----------
  function portada() {
    const demo = $("#demo");
    const p = Motor.generar("facil", 20261112, 5);
    construirTablero(demo, p.N, p.regiones);
    [...demo.children].forEach((c, i) => { if (p.solucion[i]) c.innerHTML = '<span class="q"></span>'; });
    const stats = leer("stats", {});
    const mejores = NIVELES.map((n) => (stats["comp-" + n.id] || {}).mejor).filter((x) => x != null);
    $("#meta-comp").textContent = mejores.length ? "Récord " + fmt(Math.min(...mejores)) : "Sin récord aún";
    const racha = rachaDiaria();
    $("#meta-racha").textContent = racha ? `Racha de ${racha} día${racha > 1 ? "s" : ""}` : "Sin racha aún";
    const hoy = leer("diario", {})[hoyClave()];
    $("#meta-diario").textContent = hoy && hoy.ok ? "Hoy en " + fmt(hoy.seg) : "Hoy: " + nombreNivel(NIVEL_POR_DIA[new Date().getDay()]).toLowerCase();
  }
  const irOriginal = ir;
  ir = function (v) { if (v === "inicio") portada(); irOriginal(v); };
  portada();

})();
