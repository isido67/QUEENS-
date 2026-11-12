// Motor de Reinas: reglas, solucionador por técnicas humanas (con explicaciones) y generador.
// Funciona en el navegador (window.Motor) y en Node (module.exports).
(function (global) {
  "use strict";

  const VACIA = 0, X = 1, REINA = 2;

  const COLORES = [
    { nombre: "morada",   hex: "#bba3e2" },
    { nombre: "naranja",  hex: "#ffc992" },
    { nombre: "azul",     hex: "#96beff" },
    { nombre: "verde",    hex: "#b3dfa0" },
    { nombre: "gris",     hex: "#dfdfdf" },
    { nombre: "roja",     hex: "#ff7b60" },
    { nombre: "amarilla", hex: "#e6f388" },
    { nombre: "beige",    hex: "#b9b29e" },
    { nombre: "rosada",   hex: "#dfa0bf" },
    { nombre: "celeste",  hex: "#a3d2d8" },
    { nombre: "lila",     hex: "#c9c3f2" },
    { nombre: "menta",    hex: "#8fe0c5" },
  ];

  const NIVELES = [
    { id: "facil",   nombre: "Fácil",   tam: [5, 6],  min: 0, max: 1 },
    { id: "medio",   nombre: "Medio",   tam: [6, 7],  min: 2, max: 2 },
    { id: "dificil", nombre: "Difícil", tam: [8, 9],  min: 3, max: 4 },
    { id: "experto", nombre: "Experto", tam: [9, 10], min: 4, max: 5 },
  ];

  const TECNICAS = {
    0: "Eliminación básica",
    1: "Única opción",
    2: "Región encerrada",
    3: "Pares y amenazas",
    4: "Grupos grandes",
    5: "Hipótesis en cadena",
  };

  // ---------- Aleatoriedad con semilla ----------
  function rng(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function semillaDeTexto(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  // ---------- Geometría ----------
  function crearTablero(N, regiones) {
    const filas = [], cols = [], regs = [];
    for (let k = 0; k < N; k++) { filas.push([]); cols.push([]); regs.push([]); }
    for (let i = 0; i < N * N; i++) {
      filas[Math.floor(i / N)].push(i);
      cols[i % N].push(i);
      regs[regiones[i]].push(i);
    }
    const vecinos = [];
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N), c = i % N, v = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) v.push(rr * N + cc);
      }
      vecinos.push(v);
    }
    // Casillas que "ataca" una reina en i
    const ataque = [];
    for (let i = 0; i < N * N; i++) {
      const s = new Set([...filas[Math.floor(i / N)], ...cols[i % N], ...regs[regiones[i]], ...vecinos[i]]);
      s.delete(i);
      ataque.push([...s]);
    }
    return { N, regiones, filas, cols, regs, vecinos, ataque };
  }

  const fila = (t, i) => Math.floor(i / t.N);
  const col = (t, i) => i % t.N;
  const nombreCasilla = (t, i) => `fila ${fila(t, i) + 1}, columna ${col(t, i) + 1}`;
  const nombreRegion = (k) => `región ${COLORES[k % COLORES.length].nombre}`;

  function unidades(t) {
    if (t._u) return t._u;
    const u = [];
    t.filas.forEach((cs, k) => u.push({ tipo: "fila", k, cs, nombre: `la fila ${k + 1}`, corto: `${k + 1}` }));
    t.cols.forEach((cs, k) => u.push({ tipo: "col", k, cs, nombre: `la columna ${k + 1}`, corto: `${k + 1}` }));
    t.regs.forEach((cs, k) => u.push({ tipo: "reg", k, cs, nombre: `la ${nombreRegion(k)}`, corto: COLORES[k % COLORES.length].nombre }));
    t._u = u;
    return u;
  }

  // ---------- Reglas ----------
  // Devuelve lista de conflictos entre reinas colocadas (pares de casillas)
  function conflictos(t, est) {
    const reinas = [];
    for (let i = 0; i < est.length; i++) if (est[i] === REINA) reinas.push(i);
    const malas = new Set();
    for (let a = 0; a < reinas.length; a++) for (let b = a + 1; b < reinas.length; b++) {
      const i = reinas[a], j = reinas[b];
      if (t.ataque[i].includes(j)) { malas.add(i); malas.add(j); }
    }
    return malas;
  }
  function resuelto(t, est) {
    let n = 0;
    for (const v of est) if (v === REINA) n++;
    return n === t.N && conflictos(t, est).size === 0;
  }

  // ---------- Solucionador por pasos ----------
  // Un paso: { nivel, tecnica, colocar: [i], eliminar: [i], foco: [i], texto }
  function candidatos(est, cs) { return cs.filter((i) => est[i] === VACIA); }
  function tieneReina(est, cs) { return cs.some((i) => est[i] === REINA); }

  function combinaciones(arr, k, f) {
    const sel = [];
    (function rec(ini) {
      if (sel.length === k) return f(sel.slice());
      for (let i = ini; i < arr.length; i++) {
        sel.push(arr[i]);
        if (rec(i + 1) === true) return true;
        sel.pop();
      }
    })(0);
  }

  function contradiccion(t, est) {
    for (const u of unidades(t)) {
      if (!tieneReina(est, u.cs) && candidatos(est, u.cs).length === 0) return u;
    }
    if (conflictos(t, est).size) return { nombre: "dos reinas que se atacan" };
    return null;
  }

  function pasoEliminacion(t, est) {
    for (let i = 0; i < est.length; i++) {
      if (est[i] !== REINA) continue;
      const elim = t.ataque[i].filter((j) => est[j] === VACIA);
      if (elim.length) {
        return {
          nivel: 0, eliminar: elim, colocar: [], foco: [i],
          texto: `La reina en ${nombreCasilla(t, i)} descarta toda su fila, su columna, su ${nombreRegion(t.regiones[i])} y las 8 casillas que la rodean (las reinas no pueden tocarse, ni en diagonal).`,
        };
      }
    }
    return null;
  }

  function pasoUnica(t, est) {
    for (const u of unidades(t)) {
      if (tieneReina(est, u.cs)) continue;
      const c = candidatos(est, u.cs);
      if (c.length === 1) {
        return {
          nivel: 1, colocar: [c[0]], eliminar: [], foco: u.cs,
          texto: `En ${u.nombre} solo queda una casilla libre (${nombreCasilla(t, c[0])}), así que la reina tiene que ir ahí.`,
        };
      }
    }
    return null;
  }

  // k unidades de un tipo cuyos candidatos caben en exactamente k unidades de otro tipo
  function pasoGrupos(t, est, kMin, kMax) {
    const tipos = [
      ["reg", "fila"], ["reg", "col"], ["fila", "reg"], ["col", "reg"], ["fila", "col"], ["col", "fila"],
    ];
    const todas = unidades(t);
    const de = (tipo) => todas.filter((u) => u.tipo === tipo && !tieneReina(est, u.cs));
    const claveDe = (tipo, i) => (tipo === "fila" ? fila(t, i) : tipo === "col" ? col(t, i) : t.regiones[i]);
    const plural = { fila: "filas", col: "columnas", reg: "regiones" };
    const listaNombres = (us) => us.map((u) => u.corto).join(", ").replace(/, ([^,]*)$/, " y $1");

    for (let k = kMin; k <= kMax; k++) {
      for (const [a, b] of tipos) {
        const grupoA = de(a);
        if (grupoA.length <= k) continue;
        let paso = null;
        combinaciones(grupoA, k, (sel) => {
          const destino = new Set();
          for (const u of sel) for (const i of candidatos(est, u.cs)) destino.add(claveDe(b, i));
          if (destino.size !== k) return false;
          const dentro = new Set(sel.flatMap((u) => u.cs));
          const elim = [];
          for (let i = 0; i < est.length; i++) {
            if (est[i] === VACIA && destino.has(claveDe(b, i)) && !dentro.has(i)) elim.push(i);
          }
          if (!elim.length) return false;
          const unidadesB = todas.filter((u) => u.tipo === b && destino.has(u.k));
          let texto;
          if (k === 1) {
            texto = `Todas las casillas libres de ${sel[0].nombre} están en ${unidadesB[0].nombre}. Esa reina va a ocupar ${unidadesB[0].nombre}, así que el resto de ${unidadesB[0].nombre} queda descartado.`;
          } else {
            texto = `Las ${plural[a]} ${listaNombres(sel)} solo tienen casillas libres dentro de las ${plural[b]} ${listaNombres(unidadesB)}. Son ${k} reinas que tienen que caber en ${k} ${plural[b]}, así que llenan esas ${plural[b]} por completo: todo lo demás en ellas queda descartado.`;
          }
          paso = { nivel: k === 1 ? 2 : k === 2 ? 3 : 4, colocar: [], eliminar: elim, foco: [...dentro].filter((i) => est[i] === VACIA), texto };
          return true;
        });
        if (paso) return paso;
      }
    }
    return null;
  }

  // Si poner una reina en i deja sin espacio a alguna unidad → X
  function pasoAmenaza(t, est) {
    const todas = unidades(t);
    for (let i = 0; i < est.length; i++) {
      if (est[i] !== VACIA) continue;
      const atacadas = new Set(t.ataque[i]);
      for (const u of todas) {
        if (u.cs.includes(i) || tieneReina(est, u.cs)) continue;
        const c = candidatos(est, u.cs);
        if (c.length && c.every((j) => atacadas.has(j))) {
          return {
            nivel: 3, colocar: [], eliminar: [i], foco: c.concat([i]),
            texto: `Si pusieras una reina en ${nombreCasilla(t, i)}, eliminaría todas las casillas libres de ${u.nombre}, y ${u.nombre} se quedaría sin reina. Por eso esa casilla se descarta.`,
          };
        }
      }
    }
    return null;
  }

  function siguientePasoHasta(t, est, maxNivel) {
    let p = pasoEliminacion(t, est); if (p) return p;
    p = pasoUnica(t, est); if (p) return p;
    if (maxNivel >= 2) { p = pasoGrupos(t, est, 1, 1); if (p) return p; }
    if (maxNivel >= 3) { p = pasoGrupos(t, est, 2, 2); if (p) return p; }
    if (maxNivel >= 3) { p = pasoAmenaza(t, est); if (p) return p; }
    if (maxNivel >= 4) { p = pasoGrupos(t, est, 3, Math.floor(t.N / 2)); if (p) return p; }
    return null;
  }

  // Hipótesis: suponer reina en i y propagar con técnicas simples hasta contradicción
  function pasoHipotesis(t, est) {
    for (let i = 0; i < est.length; i++) {
      if (est[i] !== VACIA) continue;
      const prueba = est.slice();
      prueba[i] = REINA;
      let pasos = 0, falla = contradiccion(t, prueba);
      while (!falla && pasos < 60) {
        const p = siguientePasoHasta(t, prueba, 2);
        if (!p) break;
        aplicar(prueba, p);
        pasos++;
        falla = contradiccion(t, prueba);
      }
      if (falla) {
        return {
          nivel: 5, colocar: [], eliminar: [i], foco: [i],
          texto: `Supón que pones una reina en ${nombreCasilla(t, i)}. Siguiendo las deducciones normales a partir de ahí, en ${pasos + 1} paso${pasos ? "s" : ""} ${falla.nombre} se queda sin lugar para su reina. Esa suposición es imposible, así que la casilla se descarta.`,
        };
      }
    }
    return null;
  }

  function siguientePaso(t, est, maxNivel) {
    if (maxNivel == null) maxNivel = 5;
    return siguientePasoHasta(t, est, Math.min(maxNivel, 4)) || (maxNivel >= 5 ? pasoHipotesis(t, est) : null);
  }

  function aplicar(est, paso) {
    for (const i of paso.eliminar) if (est[i] === VACIA) est[i] = X;
    for (const i of paso.colocar) est[i] = REINA;
  }

  // Resuelve solo con lógica. Devuelve { ok, solucion, nivel, pasos }
  function resolver(t, inicial, maxNivel) {
    const est = inicial ? inicial.slice() : new Array(t.N * t.N).fill(VACIA);
    const pasos = [];
    let nivel = 0;
    for (let guarda = 0; guarda < 2000; guarda++) {
      if (contradiccion(t, est)) return { ok: false, pasos, nivel };
      if (resuelto(t, est)) break;
      const p = siguientePaso(t, est, maxNivel);
      if (!p) return { ok: false, pasos, nivel };
      pasos.push(p);
      nivel = Math.max(nivel, p.nivel);
      aplicar(est, p);
    }
    const solucion = est.map((v) => (v === REINA ? 1 : 0));
    return { ok: resuelto(t, est), solucion, nivel, pasos };
  }

  // Búsqueda completa (backtracking) para contar soluciones, usada por el editor
  function contarSoluciones(t, limite) {
    const N = t.N, usadasCol = new Array(N).fill(false), usadasReg = new Array(N).fill(false);
    const pos = [];
    let n = 0, primera = null, segunda = null;
    (function rec(r) {
      if (n >= limite) return;
      if (r === N) { n++; if (!primera) primera = pos.slice(); else if (!segunda) segunda = pos.slice(); return; }
      for (let c = 0; c < N; c++) {
        const i = r * N + c, g = t.regiones[i];
        if (usadasCol[c] || usadasReg[g]) continue;
        if (r > 0 && Math.abs(pos[r - 1] - c) <= 1) continue;
        usadasCol[c] = usadasReg[g] = true; pos.push(c);
        rec(r + 1);
        usadasCol[c] = usadasReg[g] = false; pos.pop();
      }
    })(0);
    let solucion = null;
    if (primera) { solucion = new Array(N * N).fill(0); primera.forEach((c, r) => (solucion[r * N + c] = 1)); }
    return { n, solucion, otra: segunda };
  }

  // ---------- Generador ----------
  function permutacionSinTocar(N, azar) {
    const pos = [], usadas = new Array(N).fill(false);
    return (function rec(r) {
      if (r === N) return pos.slice();
      const orden = [...Array(N).keys()].sort(() => azar() - 0.5);
      for (const c of orden) {
        if (usadas[c] || (r > 0 && Math.abs(pos[r - 1] - c) <= 1)) continue;
        usadas[c] = true; pos.push(c);
        const res = rec(r + 1);
        if (res) return res;
        usadas[c] = false; pos.pop();
      }
      return null;
    })(0);
  }

  function crecerRegiones(N, reinas, azar) {
    const reg = new Array(N * N).fill(-1);
    reinas.forEach((c, r) => (reg[r * N + c] = r));
    let libres = N * N - N;
    // Pesos distintos por región para que haya regiones grandes y pequeñas
    const peso = reinas.map(() => 0.2 + azar() * 1.8);
    while (libres > 0) {
      // elegir región por peso
      let tot = 0; for (const p of peso) tot += p;
      let x = azar() * tot, g = 0;
      while (x > peso[g]) { x -= peso[g]; g++; }
      const borde = [];
      for (let i = 0; i < N * N; i++) {
        if (reg[i] !== g) continue;
        const r = Math.floor(i / N), c = i % N;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && reg[rr * N + cc] === -1) borde.push(rr * N + cc);
        }
      }
      if (!borde.length) { peso[g] = 0; if (peso.every((p) => p === 0)) break; continue; }
      reg[borde[Math.floor(azar() * borde.length)]] = g;
      libres--;
    }
    // Mezclar números de región para que los colores no sigan el orden de filas
    const mapa = [...Array(N).keys()].sort(() => azar() - 0.5);
    return reg.map((g) => mapa[g]);
  }

  function conexa(N, reg, g) {
    const celdas = [];
    for (let i = 0; i < N * N; i++) if (reg[i] === g) celdas.push(i);
    if (!celdas.length) return false;
    const vis = new Set([celdas[0]]), pila = [celdas[0]];
    while (pila.length) {
      const i = pila.pop(), r = Math.floor(i / N), c = i % N;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc, j = rr * N + cc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && reg[j] === g && !vis.has(j)) { vis.add(j); pila.push(j); }
      }
    }
    return vis.size === celdas.length;
  }

  // Ajusta regiones hasta que haya una sola solución (la de las reinas semilla)
  function hacerUnico(N, reinas, reg, azar) {
    const semillas = new Set(reinas.map((c, r) => r * N + c));
    for (let it = 0; it < 80; it++) {
      const t = crearTablero(N, reg);
      const res = contarSoluciones(t, 2);
      if (res.n === 1) return true;
      // tomar una solución alternativa y romperla cambiando una de sus reinas de región
      const alt = res.otra || [...res.solucion.keys()].filter((i) => res.solucion[i]).map((i) => i % N);
      const opciones = alt.map((c, r) => r * N + c).filter((i) => !semillas.has(i));
      if (!opciones.length) return false;
      let hecho = false;
      for (const i of opciones.sort(() => azar() - 0.5)) {
        const r = Math.floor(i / N), c = i % N, viejo = reg[i];
        const vecinas = [];
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && reg[rr * N + cc] !== viejo) vecinas.push(reg[rr * N + cc]);
        }
        for (const g of vecinas.sort(() => azar() - 0.5)) {
          reg[i] = g;
          if (conexa(N, reg, viejo)) { hecho = true; break; }
          reg[i] = viejo;
        }
        if (hecho) break;
      }
      if (!hecho) return false;
    }
    return false;
  }

  // Genera un puzzle del nivel pedido. Devuelve { N, regiones, solucion, nivel, semilla }
  function generar(nivelId, semilla, tamFijo) {
    const def = NIVELES.find((n) => n.id === nivelId) || NIVELES[0];
    const azar = rng(semilla == null ? Math.floor(Math.random() * 2 ** 32) : semilla);
    let mejor = null;
    for (let intento = 0; intento < 300; intento++) {
      const N = tamFijo || def.tam[0] + Math.floor(azar() * (def.tam[1] - def.tam[0] + 1));
      const reinas = permutacionSinTocar(N, azar);
      const regiones = crecerRegiones(N, reinas, azar);
      if (!hacerUnico(N, reinas, regiones, azar)) continue;
      const t = crearTablero(N, regiones);
      const r = resolver(t, null, def.max);
      if (!r.ok) continue;
      const cand = { N, regiones, solucion: r.solucion, nivel: r.nivel, semilla };
      if (r.nivel >= def.min) return cand;
      const dist = def.min - r.nivel;
      if (!mejor || dist < mejor.dist) mejor = { ...cand, dist };
      if (intento >= 80 && mejor) break;
    }
    if (mejor) { delete mejor.dist; return mejor; }
    return null;
  }

  // Codificar un puzzle en texto corto (para compartir por URL)
  const ALFABETO = "0123456789ab";
  function codificar(N, regiones) { return N + "-" + regiones.map((g) => ALFABETO[g]).join(""); }
  function decodificar(s) {
    const m = /^(\d+)-([0-9ab]+)$/.exec(s || "");
    if (!m) return null;
    const N = +m[1];
    if (N < 4 || N > 12 || m[2].length !== N * N) return null;
    const regiones = [...m[2]].map((ch) => ALFABETO.indexOf(ch));
    return { N, regiones };
  }

  const Motor = {
    VACIA, X, REINA, COLORES, NIVELES, TECNICAS,
    rng, semillaDeTexto, crearTablero, conflictos, resuelto, contradiccion,
    siguientePaso, aplicar, resolver, contarSoluciones, generar, codificar, decodificar,
    nombreCasilla,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Motor;
  else global.Motor = Motor;
})(typeof window !== "undefined" ? window : globalThis);
