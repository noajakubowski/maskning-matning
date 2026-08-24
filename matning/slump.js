'use strict';

function seedTillNummer(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function skapaSlump(seed) {
  let state = seedTillNummer(seed) || 1;
  return {
    seed: state,
    nasta() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    heltal(min, max) {
      return Math.floor(this.nasta() * (max - min + 1)) + min;
    },
    val(lista) {
      if (!lista.length) throw new Error('slump.val: tom lista');
      return lista[this.heltal(0, lista.length - 1)];
    },
    blandning(lista) {
      const kopia = lista.slice();
      for (let i = kopia.length - 1; i > 0; i--) {
        const j = this.heltal(0, i);
        const tmp = kopia[i];
        kopia[i] = kopia[j];
        kopia[j] = tmp;
      }
      return kopia;
    },
  };
}

module.exports = { skapaSlump, seedTillNummer };
