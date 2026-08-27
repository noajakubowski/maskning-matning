'use strict';

const SUBSTITUTION = [
  ['0', 'O'], ['O', '0'],
  ['1', 'l'], ['l', '1'],
  ['5', 'S'], ['S', '5'],
];

const INSATTNING_TECKEN = ['0', 'O', '1', 'l', '5', 'S'];
// Mellanslag har egen korruptionstyp. Att infoga mellanslag här märkte facit
// med fel typ när insättning valdes.

let antalKorruptionstypByten = 0;

function matcharKalla(ch, a) {
  return a === ch || a === ch.toUpperCase() || a === ch.toLowerCase();
}

function kandidatSubstitutioner(text) {
  const tecken = [...text];
  const kandidater = [];
  for (let pos = 0; pos < tecken.length; pos++) {
    const par = SUBSTITUTION.filter(([a]) => matcharKalla(tecken[pos], a));
    if (par.length > 0) kandidater.push({ pos, par });
  }
  return kandidater;
}

function valjKorruptionstyp(slump) {
  const r = slump.heltal(1, 100);
  if (r <= 50) return 'substitution';
  if (r <= 80) return slump.val(['borttagning', 'insättning']);
  return 'mellanslag';
}

function appliceraKorruption(text, typ, slump) {
  if (!text.length) return { text, typ };
  const tecken = [...text];

  if (typ === 'substitution') {
    const kandidater = kandidatSubstitutioner(text);
    // Substitution utan visuell likhet i tabellen mäter inte OCR-skada.
    // Fallback som plockade godtyckligt tecken ur tabellen togs bort.
    if (kandidater.length === 0) return null;
    const valt = slump.val(kandidater);
    const par = slump.val(valt.par);
    tecken[valt.pos] = par[1];
    return { text: tecken.join(''), typ: 'substitution' };
  }

  if (typ === 'borttagning') {
    const pos = slump.heltal(0, tecken.length - 1);
    tecken.splice(pos, 1);
    return { text: tecken.join(''), typ: 'borttagning' };
  }

  if (typ === 'insättning') {
    // 0..length inklusive: sista teckenpositionen kan träffas. Position 0
    // sätter in före första tecknet (prepend), inte mellan två blanksteg.
    const pos = slump.heltal(0, tecken.length);
    const ins = slump.val(INSATTNING_TECKEN);
    tecken.splice(pos, 0, ins);
    return { text: tecken.join(''), typ: 'insättning' };
  }

  if (typ === 'mellanslag') {
    const kandidater = [];
    for (let pos = 0; pos <= tecken.length; pos++) {
      const vanster = pos > 0 ? tecken[pos - 1] : ' ';
      const hoger = pos < tecken.length ? tecken[pos] : ' ';
      if (vanster !== ' ' && hoger !== ' ') continue;
      kandidater.push(pos);
    }
    if (kandidater.length === 0) return null;
    const pos = slump.val(kandidater);
    tecken.splice(pos, 0, ' ');
    return { text: tecken.join(''), typ: 'mellanslag' };
  }

  return { text, typ: null };
}

function korrumperaUppgift(text, slump) {
  let bytte = false;
  for (let forsok = 0; forsok < 100; forsok++) {
    const typ = valjKorruptionstyp(slump);
    const result = appliceraKorruption(text, typ, slump);
    if (result === null) {
      bytte = true;
      continue;
    }
    if (bytte) antalKorruptionstypByten++;
    return result;
  }
  const err = new Error('korrumperaUppgift: kunde inte välja korruptionstyp');
  err.kod = 1;
  throw err;
}

function nollstallKorruptionstypByten() {
  antalKorruptionstypByten = 0;
}

function hamtaKorruptionstypByten() {
  return antalKorruptionstypByten;
}

function rapporteraKorruptionstypByten() {
  if (antalKorruptionstypByten > 0) {
    console.error('korruptionstyp byttes: ' + antalKorruptionstypByten
      + ' uppgifter (substitution saknade kandidattecken)');
  }
}

function valjUppgifterForKorruption(plantningar, slump) {
  const andel = 30;
  const antal = Math.floor((plantningar.length * andel) / 100);
  if (antal === 0) return new Set();
  const idx = slump.blandning(plantningar.map((_, i) => i));
  return new Set(idx.slice(0, antal));
}

module.exports = {
  SUBSTITUTION,
  korrumperaUppgift,
  valjUppgifterForKorruption,
  kandidatSubstitutioner,
  appliceraKorruption,
  nollstallKorruptionstypByten,
  hamtaKorruptionstypByten,
  rapporteraKorruptionstypByten,
};
