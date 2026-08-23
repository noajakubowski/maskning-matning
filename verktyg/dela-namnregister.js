#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ARK, ARK_FACIT, lasXlsx, passerarV2, sha256Fil } = require('./scb-xlsx.js');

const TOPP_LEXIKON = 1000;

function main() {
  const repo = path.resolve(__dirname, '..');
  const indata = path.resolve(process.env.HOME, 'arbetsyta-scb/scb-namn.xlsx');
  if (!fs.existsSync(indata)) {
    console.error(`Saknar indatafil: ${indata}`);
    process.exit(1);
  }

  const hash = sha256Fil(indata);
  console.log(`sha256 indata: ${hash}`);

  const rader = lasXlsx(indata);
  const namnpool = {};
  const lexikon = {};

  for (const { blad, nyckel } of ARK) {
    const arkRader = rader[blad] || [];
    const poster = [];
    for (const rad of arkRader) {
      if (!rad.namn || rad.namn === 'Efternamn' || rad.namn === 'Förnamn' ||
          rad.namn === 'Tilltalsnamn' || rad.namn === 'Antal bärare' ||
          rad.namn.includes('folkbokför') || rad.namn.includes('minst två') ||
          rad.namn.includes('medelålder') || Number.isNaN(rad.barare)) {
        continue;
      }
      if (!passerarV2(rad.namn)) continue;
      poster.push({ namn: rad.namn, barare: rad.barare });
    }
    poster.sort((a, b) => b.barare - a.barare);
    namnpool[nyckel] = poster;
    lexikon[nyckel] = poster.slice(0, TOPP_LEXIKON).map((p) => p.namn);
    console.log(`${blad}: namnpool ${poster.length}, lexikon ${lexikon[nyckel].length}`);
  }

  const utData = {
    kalla: { sha256: hash },
    arkfacit: ARK_FACIT,
    arken: namnpool,
  };

  const namnDirGen = path.join(repo, 'generator/namn');
  const namnDirDet = path.join(repo, 'detektor/namn');
  fs.mkdirSync(namnDirGen, { recursive: true });
  fs.mkdirSync(namnDirDet, { recursive: true });

  fs.writeFileSync(
    path.join(namnDirGen, 'namnpool.json'),
    JSON.stringify(utData, null, 2) + '\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(namnDirDet, 'lexikon.json'),
    JSON.stringify({ arknamn: ARK_FACIT, arken: lexikon }, null, 2) + '\n',
    'utf8',
  );
}

main();
