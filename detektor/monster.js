'use strict';

const { tillNfc, kodPunktIndex } = require('./text.js');

function giltigtDatumled(manad, dag) {
  const m = parseInt(manad, 10);
  const d = parseInt(dag, 10);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

function arUpptagen(upptagna, start, slut) {
  return upptagna.some((s) => slut > s.start && start < s.end);
}

function laggMatch(upptagna, flaggor, nfc, m, typ) {
  const start = kodPunktIndex(nfc, m.index);
  const slut = kodPunktIndex(nfc, m.index + m[0].length);
  if (arUpptagen(upptagna, start, slut)) return;
  upptagna.push({ start, end: slut });
  flaggor.push({
    startposition: start,
    slutposition: slut,
    typ,
  });
}

function detekteraPersonnummer(nfc, upptagna, flaggor) {
  const tolvmRe = /(?<!\d)(\d{4})(\d{2})(\d{2})(-?)(\d{4})(?!\d)/g;
  let m;
  while ((m = tolvmRe.exec(nfc)) !== null) {
    if (!giltigtDatumled(m[2], m[3])) continue;
    laggMatch(upptagna, flaggor, nfc, m, 'personnummer');
  }

  const tiomRe = /(?<!\d)(\d{2})(\d{2})(\d{2})(-?)(\d{4})(?!\d)/g;
  while ((m = tiomRe.exec(nfc)) !== null) {
    if (!giltigtDatumled(m[2], m[3])) continue;
    laggMatch(upptagna, flaggor, nfc, m, 'personnummer');
  }
}

function detekteraTelefon(nfc, upptagna, flaggor) {
  const internRe = /\+467\d{8}(?!\d)/g;
  let m;
  while ((m = internRe.exec(nfc)) !== null) {
    laggMatch(upptagna, flaggor, nfc, m, 'telefonnummer');
  }

  const medRe = /(?<![\d+])07\d-\d{3} \d{2} \d{2}(?!\d)/g;
  while ((m = medRe.exec(nfc)) !== null) {
    laggMatch(upptagna, flaggor, nfc, m, 'telefonnummer');
  }

  const utanRe = /(?<![\d+])07\d{8}(?!\d)/g;
  while ((m = utanRe.exec(nfc)) !== null) {
    laggMatch(upptagna, flaggor, nfc, m, 'telefonnummer');
  }
}

function detekteraMonster(text) {
  const nfc = tillNfc(text);
  const upptagna = [];
  const flaggor = [];
  detekteraPersonnummer(nfc, upptagna, flaggor);
  detekteraTelefon(nfc, upptagna, flaggor);
  flaggor.sort((a, b) => a.startposition - b.startposition || a.slutposition - b.slutposition);
  return flaggor;
}

module.exports = { detekteraMonster, giltigtDatumled };
