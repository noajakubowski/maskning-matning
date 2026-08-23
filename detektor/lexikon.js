'use strict';

const { tillNfc, kodPunktIndex } = require('./text.js');

const PARTIKLAR = new Set(['von', 'af', 'de']);

const ORD_RE = /[A-Za-zÅÄÖåäö]+(?:-[A-Za-zÅÄÖåäö]+)*/g;

function byggNamnIndex(lexikon) {
  const index = new Map();
  for (const [nyckel, namnLista] of Object.entries(lexikon.arken)) {
    const ark = lexikon.arknamn[nyckel];
    for (const namn of namnLista) {
      const key = namn.toLowerCase();
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(ark);
    }
  }
  return index;
}

function detekteraLexikon(text, lexikon) {
  const nfc = tillNfc(text);
  const index = byggNamnIndex(lexikon);
  const flaggor = [];
  let m;
  ORD_RE.lastIndex = 0;
  while ((m = ORD_RE.exec(nfc)) !== null) {
    const ordStart = kodPunktIndex(nfc, m.index);
    const delar = m[0].split('-');
    let cursor = 0;
    for (let i = 0; i < delar.length; i++) {
      if (i > 0) cursor += 1;
      const del = delar[i];
      const segLower = del.toLowerCase();
      if (!PARTIKLAR.has(segLower) && index.has(segLower)) {
        const start = ordStart + cursor;
        const slut = start + [...del].length;
        for (const ark of index.get(segLower)) {
          flaggor.push({
            startposition: start,
            slutposition: slut,
            typ: 'personnamn',
            ark,
          });
        }
      }
      cursor += [...del].length;
    }
  }
  flaggor.sort((a, b) => a.startposition - b.startposition || a.slutposition - b.slutposition);
  return flaggor;
}

module.exports = { detekteraLexikon, byggNamnIndex, PARTIKLAR };
