#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { matAlla, formatUtskrift } = require('../matning/index.js');

function usage() {
  console.error('Användning: node cli/mat.js <frö>');
  process.exit(2);
}

function lasJson(fil) {
  return JSON.parse(fs.readFileSync(fil, 'utf8'));
}

function lasHog(repo, frö, hogtyp) {
  const katalog = path.join(repo, 'arbetsyta', `hog${hogtyp}-${frö}`);
  if (!fs.existsSync(katalog)) {
    throw new Error(`Saknar högkatalog: ${katalog}`);
  }

  const facitData = lasJson(path.join(katalog, 'facit.json'));
  const monsterData = lasJson(path.join(katalog, 'flaggor-monster.json'));
  const lexikonData = lasJson(path.join(katalog, 'flaggor-lexikon.json'));

  const dokument = [];
  for (const fil of fs.readdirSync(katalog).sort()) {
    if (!fil.endsWith('.txt')) continue;
    dokument.push({
      id: fil.replace(/\.txt$/, ''),
      text: fs.readFileSync(path.join(katalog, fil), 'utf8'),
    });
  }

  return {
    seed: facitData.seed || frö,
    hogtyp: facitData.hogtyp || hogtyp,
    facit: facitData.poster,
    dokument,
    flaggorMonster: monsterData.flaggor,
    flaggorLexikon: lexikonData.flaggor,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) usage();
  const frö = args[0];
  const repo = path.resolve(__dirname, '..');

  const hogar = [];
  for (const hogtyp of [1, 2, 3]) {
    try {
      hogar.push(lasHog(repo, frö, hogtyp));
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  const resultat = matAlla(hogar);
  console.log(formatUtskrift(resultat));
}

main();
