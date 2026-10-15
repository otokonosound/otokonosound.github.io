/* Charter : génère une partition 4 pistes à partir d'un fichier audio.
   Utilisable dans le navigateur (window.Charter) et sous Node (module.exports). */
(function (root) {
  'use strict';

  // FFT radix-2 en place (re, im : Float32Array de taille puissance de 2)
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }

  const N = 1024, HOP = 256;

  // channels : tableau de Float32Array, sr : fréquence d'échantillonnage
  function analyze(channels, sr) {
    // mono + décimation vers ~22 kHz
    const dec = sr >= 40000 ? 2 : 1, rate = sr / dec;
    const len = Math.floor(channels[0].length / dec), x = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      let s = 0;
      for (const ch of channels) for (let k = 0; k < dec; k++) s += ch[i * dec + k] || 0;
      x[i] = s / (channels.length * dec);
    }
    const frames = Math.max(0, Math.floor((len - N) / HOP));
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    const binHz = rate / N, bLow = Math.round(150 / binHz), bHigh = Math.round(2500 / binHz), half = N / 2;
    const flux = new Float32Array(frames), fLow = new Float32Array(frames), fMid = new Float32Array(frames), fHigh = new Float32Array(frames);
    const cent = new Float32Array(frames), rms = new Float32Array(frames);
    let prev = new Float32Array(half), cur = new Float32Array(half);
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let f = 0; f < frames; f++) {
      const o = f * HOP; let e = 0;
      for (let i = 0; i < N; i++) { const v = x[o + i]; re[i] = v * win[i]; im[i] = 0; e += v * v; }
      rms[f] = Math.sqrt(e / N);
      fft(re, im);
      let fl = 0, lo = 0, mi = 0, hi = 0, cs = 0, ms = 0;
      for (let k = 1; k < half; k++) {
        const m = Math.log(1 + 100 * Math.hypot(re[k], im[k]));
        cur[k] = m; const d = m - prev[k];
        if (d > 0) { fl += d; if (k < bLow) lo += d; else if (k < bHigh) mi += d; else hi += d; }
        cs += m * k; ms += m;
      }
      flux[f] = fl; fLow[f] = lo; fMid[f] = mi; fHigh[f] = hi; cent[f] = ms > 0 ? cs / ms * binHz : 0;
      const t = prev; prev = cur; cur = t;
    }
    const fps = rate / HOP;
    const tempo = estimateTempo(flux, fps);
    // pics d'attaque avec seuil adaptatif
    const onsets = [], W = Math.round(0.12 * fps);
    for (let f = 3; f < frames - 3; f++) {
      let ok = true; for (let k = -3; k <= 3; k++) if (k && flux[f + k] > flux[f]) { ok = false; break; }
      if (!ok) continue;
      let s = 0, c = 0; for (let k = -W; k <= W; k++) { const v = flux[f + k]; if (v !== undefined) { s += v; c++; } }
      if (flux[f] > (s / c) * 1.5 + 0.5) {
        const last = onsets[onsets.length - 1];
        if (last && (f - last.f) < 0.06 * fps) { if (flux[f] > last.s) onsets.pop(); else continue; }
        onsets.push({ t: (f * HOP + N / 2) / rate, s: flux[f], lo: fLow[f], mid: fMid[f], hi: fHigh[f], cent: cent[Math.min(frames - 1, f + 2)], f });
      }
    }
    const env = new Float32Array(frames); let mx = 1e-9, ml = 1e-9;
    for (let f = 0; f < frames; f++) { mx = Math.max(mx, flux[f]); ml = Math.max(ml, fLow[f]); }
    for (let f = 0; f < frames; f++) env[f] = fLow[f] / ml + 0.4 * flux[f] / mx;
    const fine = refineTempo(env, fps, tempo.bpm);
    const beats = trackBeats(env, fps, fine.bpm, 400);
    // temps fort de la mesure : la position modulo 4 qui porte le plus de graves
    const bsum = [0, 0, 0, 0];
    beats.forEach((b, i) => { const f = Math.round(b * fps - N / 2 / HOP); if (f >= 0 && f < frames) bsum[i % 4] += fLow[f] + 0.3 * flux[f]; });
    const down = bsum.indexOf(Math.max(...bsum));
    const beatsAligned = beats.slice(down);
    return { x, rate, fps, frames, rms, flux, low: fLow, mid: fMid, high: fHigh, cent, onsets, duration: len / rate, bpm: fine.bpm, offset: beatsAligned[0], beats: beatsAligned };
  }

  function estimateTempo(flux, fps) {
    const n = flux.length, env = new Float32Array(n);
    let mean = 0; for (let i = 0; i < n; i++) mean += flux[i]; mean /= n || 1;
    for (let i = 0; i < n; i++) env[i] = Math.max(0, flux[i] - mean);
    let best = 120, bestScore = -1;
    for (let bpm = 70; bpm <= 180; bpm += 0.25) {
      const lag = 60 * fps / bpm; let s = 0;
      for (let i = 0; i + lag * 2 < n; i += 2) {
        const a = env[i], b = env[Math.round(i + lag)], c = env[Math.round(i + 2 * lag)];
        s += a * (b + 0.5 * c);
      }
      s *= Math.exp(-0.5 * Math.pow(Math.log2(bpm / 125) / 0.6, 2)); // préférence douce autour de 125 BPM (électro)
      if (s > bestScore) { bestScore = s; best = bpm; }
    }
    // phase : décalage qui aligne le plus d'énergie sur les temps
    const period = 60 * fps / best; let bestOff = 0, bo = -1;
    for (let o = 0; o < period; o += 0.5) {
      let s = 0; for (let t = o; t < n; t += period) s += env[Math.round(t)] || 0;
      if (s > bo) { bo = s; bestOff = o; }
    }
    return { bpm: Math.round(best * 4) / 4, offset: (bestOff * HOP + N / 2) / (fps * HOP) };
  }

  // affine le tempo au centième : peigne sur toute la durée, calé sur les graves (grosse caisse)
  function refineTempo(env, fps, coarse) {
    const n = env.length; let best = { bpm: coarse, ph: 0, sc: -1 };
    for (let bpm = coarse - 1; bpm <= coarse + 1.0001; bpm += 0.02) {
      const p = 60 * fps / bpm;
      for (let ph = 0; ph < p; ph += 0.5) {
        let sc = 0; for (let t = ph; t < n - 1; t += p) { const i = t | 0, fr = t - i; sc += env[i] * (1 - fr) + env[i + 1] * fr; }
        if (sc > best.sc) best = { bpm, ph, sc };
      }
    }
    return { bpm: Math.round(best.bpm * 100) / 100, offset: (best.ph * HOP + N / 2) / (fps * HOP) };
  }

  // suivi de temps (programmation dynamique, façon Ellis) : suit les vrais temps du morceau
  function trackBeats(env, fps, bpm, tight) {
    const n = env.length, p = 60 * fps / bpm, score = new Float32Array(n), back = new Int32Array(n).fill(-1);
    let mx = 1e-9; for (let i = 0; i < n; i++) mx = Math.max(mx, env[i]);
    for (let t = 0; t < n; t++) {
      let best = 0, bi = -1;
      const lo = Math.max(0, Math.round(t - 2 * p)), hi = Math.round(t - p / 2);
      for (let u = lo; u <= hi; u++) { const r = Math.log((t - u) / p); const v = score[u] - tight * r * r; if (v > best || bi < 0) { best = v; bi = u; } }
      score[t] = env[t] / mx + (bi >= 0 ? Math.max(0, best) : 0); back[t] = bi;
    }
    let t = n - 1, bs = -1; for (let u = Math.max(0, Math.round(n - p)); u < n; u++) if (score[u] > bs) { bs = score[u]; t = u; }
    const beats = []; while (t >= 0) { beats.push(t); t = back[t]; }
    beats.reverse();
    // prolonge la grille avant le 1er temps et après le dernier
    const per = beats.length > 1 ? (beats[beats.length - 1] - beats[0]) / (beats.length - 1) : p;
    while (beats[0] - per > -per * 0.5) beats.unshift(beats[0] - per);
    const last = beats[beats.length - 1]; for (let k = 1; last + k * per < n + per * 4; k++) beats.push(last + k * per);
    return beats.map(f => (f * HOP + N / 2) / (fps * HOP));
  }

  /* ---- Génération v2 : structure, motifs répétés, contour mélodique ----
     Principes tirés des travaux sur la génération de charts (Dance Dance Convolution,
     TaikoNation : le « patterning ») et des guides de charting Clone Hero :
     1. grille de doubles-croches calée sur les temps suivis ;
     2. par case : attaques par bande (grave / médium / aigu), énergie, hauteur dominante ;
     3. les mesures qui se ressemblent (rythme + harmonie + énergie) forment un groupe
        et reçoivent exactement le même motif : un refrain se joue toujours pareil ;
     4. le motif d'un groupe vient de la moyenne de ses mesures, plus fiable qu'une seule ;
     5. les pistes suivent le contour mélodique : monte = droite, descend = gauche,
        note répétée = même piste ;
     6. les difficultés inférieures gardent les temps les plus forts du même motif ;
     7. notes spéciales rares, seulement là où la musique les justifie. */

  const DENSITY = [0.85, 1.5, 2.2, 2.9];   // notes / seconde visées
  const CAP = [4, 6, 8, 12];               // notes max par mesure
  const STEP = [4, 2, 2, 1];               // grille autorisée (en doubles-croches)
  const GAP = [4, 2, 2, 1];                // écart mini entre deux notes
  const PN = 4096;

  function gridTime(B) {
    return g => { const i = Math.max(0, Math.min(B.length - 2, Math.floor(g / 4))); return B[i] + (g / 4 - i) * (B[i + 1] - B[i]); };
  }

  function cellFeatures(an) {
    const B = an.beats, rate = an.rate, x = an.x, nb = Math.floor((B.length - 1) / 4), timeOf = gridTime(B);
    const nC = nb * 16, cells = [];
    const re = new Float32Array(PN), im = new Float32Array(PN), win = new Float32Array(PN);
    for (let i = 0; i < PN; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / PN);
    const H = PN / 2, binHz = rate / PN, mag = new Float32Array(H), cum = new Float64Array(H + 1);
    let wh = new Float32Array(H), pw = new Float32Array(H); const nv = new Float32Array(H);
    const kMin = Math.round(90 / binHz), kMax = Math.min(H - 1, Math.round(5000 / binHz));
    const pcOf = new Int8Array(H).fill(-1);
    for (let k = Math.round(100 / binHz); k < Math.round(2000 / binHz); k++) pcOf[k] = ((Math.round(12 * Math.log2(k * binHz / 440)) + 69) % 12 + 12) % 12;
    const peak = (arr, f) => { let m = 0; for (let k = -2; k <= 2; k++) { const v = arr[f + k]; if (v > m) m = v; } return m; };
    for (let g = 0; g < nC; g++) {
      const t = timeOf(g), f = Math.round((t * rate - N / 2) / HOP);
      const c = { g, t, lo: peak(an.low, f), mid: peak(an.mid, f), hi: peak(an.high, f),
        rms: an.rms[Math.max(0, Math.min(an.frames - 1, f + 3))] || 0, pitch: NaN, sal: 0, chroma: new Float32Array(12) };
      const o = Math.round((t + 0.012) * rate);
      if (o >= 0 && o + PN < x.length) {
        for (let i = 0; i < PN; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; }
        fft(re, im);
        cum[0] = 0;
        for (let k = 1; k < H; k++) { mag[k] = Math.log(1 + 200 * Math.hypot(re[k], im[k])); cum[k + 1] = cum[k] + mag[k]; }
        // blanchiment : on retire la moyenne locale (~1/4 d'octave) pour isoler les notes
        for (let k = kMin; k <= kMax; k++) {
          const w = Math.max(3, Math.round(k * 0.09)), a = Math.max(1, k - w), b = Math.min(H - 1, k + w);
          wh[k] = Math.max(0, mag[k] - (cum[b + 1] - cum[a]) / (b - a + 1));
        }
        for (let k = kMin; k < H; k++) if (pcOf[k] >= 0) c.chroma[pcOf[k]] += wh[k];
        // nouveauté : ce qui vient d'apparaître par rapport à la case précédente (ignore les bourdons)
        for (let k = kMin; k <= kMax; k++) nv[k] = Math.max(0, wh[k] - pw[k]);
        // hauteur dominante : somme harmonique sur les fondamentales 130 Hz à 1 kHz
        let best = 0, bm = NaN;
        for (let m = 48; m <= 84; m++) {
          const f0 = 440 * Math.pow(2, (m - 69) / 12); let s = 0;
          for (let h = 1; h <= 6; h++) {
            const kk = h * f0 / binHz; if (kk >= kMax - 1) break;
            const k0 = Math.round(kk); s += Math.pow(0.8, h - 1) * Math.max(nv[k0 - 1], nv[k0], nv[k0 + 1]);
          }
          if (s > best) { best = s; bm = m; }
        }
        c.pitch = bm; c.sal = best;
        const tmp = pw; pw = wh; wh = tmp;
      }
      cells.push(c);
    }
    // normalisation par bande (95e centile)
    for (const key of ['lo', 'mid', 'hi']) {
      const v = cells.map(c => c[key]).sort((a, b) => a - b), p = v[Math.floor(v.length * 0.95)] || 1;
      for (const c of cells) c[key + 'N'] = Math.min(1.5, c[key] / p);
    }
    const sv = cells.map(c => c.sal).sort((a, b) => a - b), salMin = sv[Math.floor(sv.length * 0.25)] || 0;
    for (const c of cells) if (c.sal < salMin) c.pitch = NaN;
    return { cells, nb, timeOf };
  }

  const METRIC = c => c % 16 === 0 ? 1.3 : c % 8 === 0 ? 1.2 : c % 4 === 0 ? 1.12 : c % 2 === 0 ? 1.0 : 0.78;
  const median = a => { const v = a.filter(x => !isNaN(x)).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : NaN; };

  function analyzeStructure(an) {
    const F = cellFeatures(an), { cells, nb } = F;
    const bars = [];
    for (let b = 0; b < nb; b++) {
      const cs = cells.slice(b * 16, b * 16 + 16), v = [];
      for (const c of cs) v.push(c.loN, c.midN * 1.2, c.hiN * 0.8);
      const ch = new Float32Array(12); for (const c of cs) for (let k = 0; k < 12; k++) ch[k] += c.chroma[k];
      const cm = Math.max(1e-9, ...ch); for (let k = 0; k < 12; k++) v.push(ch[k] / cm * 1.6);
      bars.push({ b, v, E: cs.reduce((s, c) => s + c.rms, 0) / 16, cs });
    }
    const Es = bars.map(x => x.E).sort((a, b) => a - b), Emed = Es[Es.length >> 1] || 1e-9;
    const cos = (a, b) => { let s = 0, na = 0, nb2 = 0; for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb2 += b[i] * b[i]; } return s / Math.sqrt(na * nb2 + 1e-12); };
    const protos = [];
    for (const bar of bars) {
      if (bar.E < Emed * 0.12 || bar.cs[0].t < 1.2 || bar.cs[0].t > an.duration - 1) { bar.p = -1; continue; }
      let best = -1, bc = (typeof process !== 'undefined' && process.env.CT) ? +process.env.CT : 0.93;
      protos.forEach((p, i) => {
        const r = bar.E / p.E; if (r < 0.8 || r > 1.25) return;
        const c = cos(bar.v, p.v); if (c > bc) { bc = c; best = i; }
      });
      if (best < 0) { protos.push({ id: protos.length, members: [], v: bar.v.slice(), E: bar.E }); best = protos.length - 1; }
      const p = protos[best]; p.members.push(bar);
      const n = p.members.length; p.v = p.v.map((x, i) => x + (bar.v[i] - x) / n); p.E += (bar.E - p.E) / n;
      bar.p = best;
    }
    const allP = [];
    for (const p of protos) {
      const ef = Math.max(0.45, Math.min(1.3, Math.sqrt(p.E / Emed)));
      p.s = []; p.pitch = []; p.hiShare = [];
      for (let c = 0; c < 16; c++) {
        let s = 0, hs = 0; const ps = [];
        for (const m of p.members) { const x = m.cs[c]; s += x.midN + 0.5 * x.hiN + 0.7 * x.loN; hs += x.hiN / (x.loN + x.midN + x.hiN + 1e-6); ps.push(x.pitch); }
        p.s[c] = s / p.members.length * METRIC(c) * ef; p.hiShare[c] = hs / p.members.length; p.pitch[c] = median(ps);
        if (!isNaN(p.pitch[c])) allP.push(p.pitch[c]);
      }
    }
    allP.sort((a, b) => a - b);
    const pq = [0.25, 0.5, 0.75].map(q => allP[Math.floor(q * (allP.length - 1))] || 60);
    return { ...F, bars, protos, pq, allP };
  }

  function pick(p, d, tau) {
    const cand = [];
    for (let c = 0; c < 16; c += STEP[d]) if (p.s[c] >= tau) cand.push(c);
    if (!cand.length) { let bc = 0; for (let c = 0; c < 16; c += STEP[d]) if (p.s[c] > p.s[bc]) bc = c; cand.push(bc); } // au moins une note par mesure jouée
    cand.sort((a, b) => p.s[b] - p.s[a]);
    const out = [];
    for (const c of cand) { if (out.length >= CAP[d]) break; if (out.some(o => Math.abs(o - c) < GAP[d])) continue; out.push(c); }
    return out.sort((a, b) => a - b);
  }

  function laneMap(p, picks, rank) {
    // contour relatif : monte = droite, descend = gauche, note répétée = même piste
    const rel = {}; let cur = 0, prevP = NaN, run = 0, lo = 0, hi = 0;
    for (const c of picks) {
      const pc = p.pitch[c];
      if (Object.keys(rel).length) {
        const d = isNaN(pc) || isNaN(prevP) ? 0 : pc - prevP, st = Math.abs(d) < 1 ? 0 : Math.abs(d) <= 4 ? 1 : 2, sg = Math.sign(d);
        let nx = cur + sg * st;
        if (Math.max(hi, nx) - Math.min(lo, nx) > 3) nx = cur - sg * st;            // rebond sur les bords
        if (Math.max(hi, nx) - Math.min(lo, nx) > 3) nx = cur;
        if (nx === cur && ++run >= 3) { nx = cur + (cur - lo >= hi - cur && cur - 1 >= hi - 3 ? -1 : 1); if (Math.max(hi, nx) - Math.min(lo, nx) > 3) nx = cur - (nx - cur); run = 0; }
        else if (nx !== cur) run = 0;
        cur = nx;
      }
      rel[c] = cur; lo = Math.min(lo, cur); hi = Math.max(hi, cur); if (!isNaN(pc)) prevP = pc;
    }
    // placement : un motif aigu se joue à droite, un motif grave à gauche
    const span = hi - lo, base = Math.round(rank * (3 - span)) - lo;
    const full = []; let last = picks.length ? rel[picks[0]] + base : 1;
    for (let c = 0; c < 16; c++) { if (rel[c] !== undefined) last = rel[c] + base; full[c] = last; }
    return full;
  }

  let STRUCT_CACHE = null;
  function build(an, diff) {
    if (!STRUCT_CACHE || STRUCT_CACHE.an !== an) STRUCT_CACHE = { an, st: analyzeStructure(an) };
    const st = STRUCT_CACHE.st, { bars, protos, pq, cells, timeOf } = st;
    const B = an.beats, spb = 60 / an.bpm, cellDur = spb / 4;
    const tuneTau = d => {
      const target = an.duration * DENSITY[d]; let lo = 0, hi = 4;
      for (let it = 0; it < 40; it++) {
        const m = (lo + hi) / 2; let n = 0;
        for (const p of protos) n += pick(p, d, m).length * p.members.length;
        if (n > target) lo = m; else hi = m;
      }
      return (lo + hi) / 2;
    };
    const tau = tuneTau(diff);
    // rang de hauteur de chaque motif parmi tous les motifs joués (pondéré par leurs répétitions)
    const mps = protos.map(p => { const v = pick(p, diff, tau).map(c => p.pitch[c]).filter(x => !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; });
    const tot = protos.reduce((s, p, i) => s + (isNaN(mps[i]) ? 0 : p.members.length), 0) || 1;
    protos.forEach((p, i) => {
      let below = 0; protos.forEach((q, j) => { if (!isNaN(mps[j]) && (mps[j] < mps[i] || (mps[j] === mps[i] && j < i))) below += q.members.length; });
      const r = isNaN(mps[i]) ? 0.5 : (below + p.members.length / 2) / tot;
      p.lanes = laneMap(p, pick(p, diff, tau), r);
    });

    // motif par groupe, avec ses notes spéciales (décidées une fois par groupe)
    let total = 0; const pats = protos.map(p => { const c = pick(p, diff, tau); total += c.length * p.members.length; return c.map(cc => ({ c: cc, lane: p.lanes[cc], type: 'tap' })); });
    let slideBudget = Math.round(total * 0.05), strumBudget = Math.round(total * 0.05);
    const order = protos.map((p, i) => i).sort((a, b) => protos[a].members.length - protos[b].members.length);
    if (diff >= 1) for (const i of order) {
      const pat = pats[i], p = protos[i], k = p.members.length, sp = diff === 3 ? 2 : 2;
      // glissé : 3-4 notes rapprochées dont la hauteur monte (ou descend) franchement
      for (let a = 0; a + 2 < pat.length && slideBudget >= 3 * k; a++) {
        const dp = j => p.pitch[pat[j + 1].c] - p.pitch[pat[j].c];
        const sg = Math.sign(dp(a)); if (!sg || Math.abs(dp(a)) < 1) continue;
        let e = a + 1;
        while (e + 1 < pat.length && e - a < 3 && pat[e + 1].c - pat[e].c <= 2 && pat[e].c - pat[e - 1].c <= 2 && Math.sign(dp(e)) === sg && Math.abs(dp(e)) >= 1) e++;
        if (e - a < 2 || pat[a + 1].c - pat[a].c > 2) continue;
        const len = e - a + 1; let L = pat[a].lane;
        if (sg > 0) L = Math.min(L, 4 - len); else L = Math.max(L, len - 1);
        for (let j = a; j <= e; j++) { pat[j].lane = L + sg * (j - a); pat[j].slide = true; pat[j].linked = j > a; }
        slideBudget -= len * k; break;
      }
      // flèche : paire de croches portée par les aigus (hi-hats, stabs)
      for (let a = 0; a + 1 < pat.length && strumBudget >= 2 * k; a++) {
        const x = pat[a], y = pat[a + 1];
        if (x.slide || y.slide || y.c - x.c !== (diff >= 2 ? 2 : 4)) continue;
        if (p.hiShare[x.c] < 0.5 || p.hiShare[y.c] < 0.5) continue;
        const L = Math.min(2, x.lane); x.type = y.type = 'strum'; x.dir = 1; y.dir = -1; x.lane = L; y.lane = L + 1;
        strumBudget -= 2 * k; break;
      }
    }

    // déroulé sur le morceau
    let notes = [], chain = 0;
    for (const bar of bars) {
      if (bar.p < 0) continue;
      let ch = 0;
      for (const n of pats[bar.p]) {
        const g = bar.b * 16 + n.c, o = { g, t: timeOf(g), lane: n.lane, type: n.type };
        if (n.dir) o.dir = n.dir;
        if (n.slide) { if (!n.linked) ch = ++chain; o.chain = ch; o.linked = n.linked; }
        notes.push(o);
      }
    }
    notes = notes.filter(n => n.t >= 1.5 && n.t <= an.duration - 0.5);

    // notes tenues : le son se prolonge jusqu'à la note suivante
    const minGap = diff === 3 ? 6 : 8; const holds = [];
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i], nx = notes[i + 1]; if (n.type !== 'tap' || n.chain) continue;
      const gap = nx ? nx.g - n.g : 16; if (gap < minGap) continue;
      const ref = Math.max(cells[n.g] ? cells[n.g].rms : 0, cells[n.g + 1] ? cells[n.g + 1].rms : 0); let len = 0;
      for (let k = 2; k < gap - 1; k++) { const c = cells[n.g + k]; if (c && c.rms > ref * 0.72) len = k; else break; }
      if (len >= 4) holds.push({ n, len: Math.min(len, gap - 2) });
    }
    holds.sort((a, b) => b.len - a.len).slice(0, Math.round(notes.length * 0.14)).forEach(h => { h.n.type = 'hold'; h.n.len = h.len * cellDur; });

    // drops : mesure bien plus forte que les 4 précédentes -> barres dorées sur toute la largeur
    const drops = new Set();
    for (let b = 4; b < bars.length; b++) {
      const avg = (bars[b - 1].E + bars[b - 2].E + bars[b - 3].E + bars[b - 4].E) / 4;
      if (bars[b].E > avg * 1.6 && bars[b].E > 0.04 && ![...drops].some(d => b - d < 8)) drops.add(b);
    }
    let out = notes.filter(n => !drops.has(Math.floor(n.g / 16)));
    for (const b of drops) for (let k = 0; k < 4; k++) {
      if (diff < 1 && k % 2) continue;
      const g = b * 16 + k * 4; out.push({ g, t: timeOf(g), lane: -1, type: 'bar' });
    }
    out.sort((a, b) => a.g - b.g);

    // phrases Mode Drop : la mesure la plus dense de chaque bloc de 8 mesures
    let phrase = 0; const nb = bars.length;
    for (let b0 = 4; b0 < nb; b0 += 8) {
      let bestB = -1, bestC = diff ? 2 : 1;
      for (let b = b0; b < b0 + 8; b++) { const c = out.filter(n => Math.floor(n.g / 16) === b).length; if (c > bestC) { bestC = c; bestB = b; } }
      if (bestB < 0) continue; phrase++;
      for (const n of out) if (Math.floor(n.g / 16) === bestB) n.sp = phrase;
    }

    return {
      bpm: an.bpm, offset: an.offset, beats: B.filter(b => b < an.duration + 1).map(b => +b.toFixed(4)),
      groups: protos.length,
      notes: out.map(n => {
        const r = { t: +n.t.toFixed(4), lane: n.lane, type: n.type };
        if (n.len) r.len = +n.len.toFixed(4);
        if (n.dir) r.dir = n.dir;
        if (n.chain) { r.chain = n.chain; r.linked = !!n.linked; }
        if (n.sp) r.sp = n.sp;
        return r;
      })
    };
  }

  const api = { analyze, build, estimateTempo, refineTempo, _st: an => (STRUCT_CACHE && STRUCT_CACHE.an === an ? STRUCT_CACHE.st : analyzeStructure(an)) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Charter = api;
})(typeof self !== 'undefined' ? self : this);
