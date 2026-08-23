'use strict';

const { detekteraMonster } = require('./monster.js');
const { detekteraLexikon } = require('./lexikon.js');

function detekteraDokument(dokumentId, text, lexikon) {
  const monster = detekteraMonster(text).map((f) => ({
    'dokument-id': dokumentId,
    ...f,
    detektor: 'monster',
  }));
  const lex = detekteraLexikon(text, lexikon).map((f) => ({
    'dokument-id': dokumentId,
    ...f,
    detektor: 'lexikon',
  }));
  return { monster, lexikon: lex };
}

function detekteraHog(dokument, lexikon) {
  const monster = [];
  const lex = [];
  for (const dok of dokument) {
    const r = detekteraDokument(dok.id, dok.text, lexikon);
    monster.push(...r.monster);
    lex.push(...r.lexikon);
  }
  return { monster, lexikon: lex };
}

module.exports = { detekteraDokument, detekteraHog };
