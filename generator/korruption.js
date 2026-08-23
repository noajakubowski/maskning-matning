'use strict';

const SUBSTITUTION = [
  ['0', 'O'], ['O', '0'],
  ['1', 'l'], ['l', '1'],
  ['5', 'S'], ['S', '5'],
];

function valjKorruptionstyp(slump) {
  const r = slump.heltal(1, 100);
  if (r <= 50) return 'substitution';
  if (r <= 80) return slump.val(['borttagning', 'insattning']);
  return 'mellanslag';
}

function appliceraKorruption(text, typ, slump) {
  if (!text.length) return { text, typ };
  const tecken = [...text];
  const pos = slump.heltal(0, tecken.length - 1);

  if (typ === 'substitution') {
    const ch = tecken[pos];
    const par = SUBSTITUTION.filter(([a]) => a === ch || a === ch.toUpperCase() || a === ch.toLowerCase());
    if (par.length === 0) {
      const alt = SUBSTITUTION[slump.heltal(0, SUBSTITUTION.length - 1)];
      tecken[pos] = alt[1];
    } else {
      const valt = slump.val(par);
      tecken[pos] = valt[1];
    }
    return { text: tecken.join(''), typ: 'substitution' };
  }

  if (typ === 'borttagning') {
    tecken.splice(pos, 1);
    return { text: tecken.join(''), typ: 'borttagning' };
  }

  if (typ === 'insattning') {
    const ins = slump.val(['0', 'O', '1', 'l', '5', 'S', ' ']);
    tecken.splice(pos, 0, ins);
    return { text: tecken.join(''), typ: 'insattning' };
  }

  if (typ === 'mellanslag') {
    tecken.splice(pos, 0, ' ');
    return { text: tecken.join(''), typ: 'mellanslag' };
  }

  return { text: text, typ: null };
}

function korrumperaUppgift(text, slump) {
  const typ = valjKorruptionstyp(slump);
  return appliceraKorruption(text, typ, slump);
}

function valjUppgifterForKorruption(plantningar, slump) {
  const andel = 30;
  const antal = Math.floor((plantningar.length * andel) / 100);
  if (antal === 0) return new Set();
  const idx = slump.blandning(plantningar.map((_, i) => i));
  return new Set(idx.slice(0, antal));
}

module.exports = { korrumperaUppgift, valjUppgifterForKorruption };
