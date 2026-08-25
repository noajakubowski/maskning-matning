'use strict';

function kravPlantId(facit, etikett) {
  for (let i = 0; i < facit.length; i++) {
    if (!facit[i].plant_id) {
      const err = new Error(etikett + ': facitpost ' + (i + 1) + ' saknar plant_id');
      err.kod = 1;
      throw err;
    }
  }
}

function unikaPlantId(facit) {
  const set = new Set();
  for (const p of facit) {
    if (set.has(p.plant_id)) return false;
    set.add(p.plant_id);
  }
  return true;
}

function paraFacit(facitA, facitB) {
  kravPlantId(facitA, 'hög A');
  kravPlantId(facitB, 'hög B');

  const mapA = new Map(facitA.map((p) => [p.plant_id, p]));
  const mapB = new Map(facitB.map((p) => [p.plant_id, p]));
  const idsA = new Set(mapA.keys());
  const idsB = new Set(mapB.keys());

  const gemensamma = [...idsA].filter((id) => idsB.has(id)).sort();
  const par = [];
  for (const id of gemensamma) {
    const a = mapA.get(id);
    const b = mapB.get(id);
    // plant_id är ett löpnummer per hög. Två högar som inte delar plantering
    // får poster med samma plant_id men olika innehåll, och parningen kopplar då
    // ihop orelaterade uppgifter utan att det syns i talen.
    if (a['ursprunglig sträng'] !== b['ursprunglig sträng']) {
      console.error('BRIST: parning — ' + id + ': '
        + JSON.stringify(a['ursprunglig sträng']) + ' ≠ '
        + JSON.stringify(b['ursprunglig sträng']));
      const err = new Error('parning: ' + id + ' har olika ursprunglig sträng i de två högar');
      err.kod = 1;
      throw err;
    }
    par.push({ a, b });
  }

  return {
    par,
    antalPar: par.length,
    idsA: idsA.size,
    idsB: idsB.size,
    saknasIA: [...idsB].filter((id) => !idsA.has(id)).length,
    saknasIB: [...idsA].filter((id) => !idsB.has(id)).length,
  };
}

function arMiss(klass) {
  return klass === 'miss' || klass === 'delvis';
}

function paradMissDiff(par, klassA, klassB) {
  let n01 = 0;
  let n10 = 0;
  for (let i = 0; i < par.length; i++) {
    const missA = arMiss(klassA[i]);
    const missB = arMiss(klassB[i]);
    if (!missA && missB) n01++;
    if (missA && !missB) n10++;
  }
  const n = par.length;
  return { n01, n10, n, delta: n > 0 ? (n01 - n10) / n : 0 };
}

module.exports = {
  kravPlantId,
  unikaPlantId,
  paraFacit,
  arMiss,
  paradMissDiff,
};
