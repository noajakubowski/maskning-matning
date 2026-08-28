#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { detekteraDokument } = require('../detektor/index.js');
const { slaaIhopSpann } = require('../matning/matchning.js');

const repo = path.resolve(__dirname, '..');
const detDir = path.join(repo, 'detektor');
const utFil = path.join(repo, 'demo/detektor-webb.js');

function lasKalla(namn) {
  return fs.readFileSync(path.join(detDir, namn), 'utf8');
}

function byggPaket(lexikon) {
  const slaaSrc = slaaIhopSpann.toString();
  return (
    'var detekteraDokument;\n' +
    'var slaaIhopSpann;\n' +
    'var LEXIKON;\n' +
    '(function (root) {\n' +
    '  var INBADDAT_LEXIKON = ' +
    JSON.stringify(lexikon) +
    ';\n' +
    '  var __mods = Object.create(null);\n' +
    '  function require(id) {\n' +
    '    if (!Object.prototype.hasOwnProperty.call(__mods, id)) {\n' +
    '      throw new Error(\'Okänd modul: \' + id);\n' +
    '    }\n' +
    '    return __mods[id];\n' +
    '  }\n' +
    '  function define(id, factory) {\n' +
    '    var module = { exports: {} };\n' +
    '    factory(require, module, module.exports);\n' +
    '    __mods[id] = module.exports;\n' +
    '  }\n' +
    "  define('./text.js', function (require, module, exports) {\n" +
    lasKalla('text.js') +
    '\n  });\n' +
    "  define('./monster.js', function (require, module, exports) {\n" +
    lasKalla('monster.js') +
    '\n  });\n' +
    "  define('./lexikon.js', function (require, module, exports) {\n" +
    lasKalla('lexikon.js') +
    '\n  });\n' +
    "  define('./index.js', function (require, module, exports) {\n" +
    lasKalla('index.js') +
    '\n  });\n' +
    '  ' +
    slaaSrc +
    ';\n' +
    "  var api = require('./index.js');\n" +
    '  function detekteraDokumentOmslag(dokumentId, text, lexikon) {\n' +
    '    var lex = arguments.length < 3 ? INBADDAT_LEXIKON : lexikon;\n' +
    '    return api.detekteraDokument(dokumentId, text, lex);\n' +
    '  }\n' +
    '  detekteraDokument = detekteraDokumentOmslag;\n' +
    '  LEXIKON = INBADDAT_LEXIKON;\n' +
    '  root.detekteraDokument = detekteraDokumentOmslag;\n' +
    '  root.slaaIhopSpann = slaaIhopSpann;\n' +
    '  root.LEXIKON = INBADDAT_LEXIKON;\n' +
    "  if (typeof module !== 'undefined' && module.exports) {\n" +
    '    module.exports = {\n' +
    '      detekteraDokument: detekteraDokumentOmslag,\n' +
    '      slaaIhopSpann: slaaIhopSpann,\n' +
    '    };\n' +
    '  }\n' +
    "})(typeof globalThis !== 'undefined' ? globalThis : this);\n"
  );
}

function serialisera(resultat) {
  return JSON.stringify(resultat);
}

function jamfor(original, paketerad, etikett) {
  const a = serialisera(original);
  const b = serialisera(paketerad);
  const n = original.monster.length + original.lexikon.length;
  if (a !== b) {
    console.error('AVBRYT: flaggor skiljer sig för ' + etikett);
    console.error('original:  ' + a);
    console.error('paketerad: ' + b);
    process.exit(1);
  }
  return n;
}

function main() {
  const lexikonPath = path.join(detDir, 'namn/lexikon.json');
  if (!fs.existsSync(lexikonPath)) {
    console.error('AVBRYT: saknar ' + lexikonPath);
    process.exit(1);
  }
  const lexikon = JSON.parse(fs.readFileSync(lexikonPath, 'utf8'));
  fs.writeFileSync(utFil, byggPaket(lexikon), 'utf8');

  delete require.cache[require.resolve('./detektor-webb.js')];
  const paketerad = require('./detektor-webb.js');

  const texter = [
    {
      id: 'doc-jamfor',
      text: 'Anna-Karin 890101-2384 Andersson +46701234567',
    },
  ];

  const dataFil = path.join(repo, 'demo/data.js');
  if (fs.existsSync(dataFil)) {
    delete require.cache[require.resolve('./data.js')];
    const data = require('./data.js');
    const lista = data && data.dokument ? data.dokument : [];
    for (const dok of lista) {
      texter.push({ id: dok.id, text: dok.text });
    }
  }

  let flaggor = 0;
  for (const t of texter) {
    const orig = detekteraDokument(t.id, t.text, lexikon);
    const pak = paketerad.detekteraDokument(t.id, t.text, lexikon);
    flaggor += jamfor(orig, pak, t.id);
  }

  const spannProv = [
    { start: 0, end: 4, typ: 'personnamn' },
    { start: 0, end: 4, typ: 'personnamn' },
    { start: 2, end: 9, typ: 'telefonnummer' },
  ];
  const origSpann = JSON.stringify(slaaIhopSpann(spannProv));
  const pakSpann = JSON.stringify(paketerad.slaaIhopSpann(spannProv));
  if (origSpann !== pakSpann) {
    console.error('AVBRYT: slaaIhopSpann skiljer sig');
    console.error('original:  ' + origSpann);
    console.error('paketerad: ' + pakSpann);
    process.exit(1);
  }

  console.log('ut: ' + utFil);
  console.log('texter jämförda: ' + texter.length);
  console.log('flaggor jämförda: ' + flaggor);
  console.log('flaggor identiska: ja');
}

main();
