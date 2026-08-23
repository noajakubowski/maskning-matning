'use strict';

const fs = require('fs');
const zlib = require('zlib');

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const ARK = [
  { blad: 'Efternamn', nyckel: 'efternamn' },
  { blad: 'Förnamn kvinnor', nyckel: 'fornamn_kvinnor' },
  { blad: 'Förnamn män', nyckel: 'fornamn_man' },
  { blad: 'Tilltalsnamn kvinnor', nyckel: 'tilltalsnamn_kvinnor' },
  { blad: 'Tilltalsnamn män', nyckel: 'tilltalsnamn_man' },
];

const ARK_FACIT = {
  efternamn: 'efternamn',
  fornamn_kvinnor: 'förnamn kvinnor',
  fornamn_man: 'förnamn män',
  tilltalsnamn_kvinnor: 'tilltalsnamn kvinnor',
  tilltalsnamn_man: 'tilltalsnamn män',
};

function lasZip(fil) {
  const buf = fs.readFileSync(fil);
  const entries = new Map();
  let offset = 0;
  while (offset < buf.length) {
    const sign = buf.readUInt32LE(offset);
    if (sign !== 0x04034b50) break;
    const compMet = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buf.toString('utf8', nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    let raw;
    if (compMet === 0) raw = comp;
    else if (compMet === 8) raw = zlib.inflateRawSync(comp);
    else throw new Error(`Okänt zip-komprimeringssätt ${compMet} i ${name}`);
    entries.set(name, raw);
    offset = dataStart + compSize;
  }
  return entries;
}

function tag(local) {
  return `{${NS}}${local}`;
}

function lasSharedStrings(xml) {
  const r = [];
  const re = /<(?:[\w]+:)?si[^>]*>([\s\S]*?)<\/(?:[\w]+:)?si>/g;
  let m;
  while ((m = re.exec(xml))) {
    const texts = [];
    const tre = /<(?:[\w]+:)?t[^>]*>([^<]*)<\/(?:[\w]+:)?t>/g;
    let t;
    while ((t = tre.exec(m[1]))) texts.push(t[1]);
    r.push(texts.join(''));
  }
  return r;
}

function cellVarde(cell, shared) {
  const tMatch = cell.match(/t="([^"]+)"/);
  const vMatch = cell.match(/<(?:[\w]+:)?v[^>]*>([^<]*)<\/(?:[\w]+:)?v>/);
  if (!vMatch) return null;
  let v = vMatch[1];
  if (tMatch && tMatch[1] === 's') v = shared[parseInt(v, 10)];
  return v;
}

function lasArk(xml, shared) {
  const rader = [];
  const rowRe = /<(?:[\w]+:)?row[^>]*>([\s\S]*?)<\/(?:[\w]+:)?row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const celler = {};
    const cellRe = /<(?:[\w]+:)?c ([^>]*)>([\s\S]*?)<\/(?:[\w]+:)?c>/g;
    let cm;
    while ((cm = cellRe.exec(rm[1]))) {
      const ref = cm[1].match(/r="([A-Z]+)(\d+)"/);
      if (!ref) continue;
      const k = ref[1];
      celler[k] = cellVarde(cm[0], shared);
    }
    if (celler.A !== undefined || celler.B !== undefined) {
      rader.push({ namn: celler.A, barare: celler.B ? parseInt(celler.B, 10) : null });
    }
  }
  return rader;
}

function lasXlsx(fil) {
  const zip = lasZip(fil);
  const shared = lasSharedStrings(zip.get('xl/sharedStrings.xml').toString('utf8'));
  const wb = zip.get('xl/workbook.xml').toString('utf8');
  const rels = zip.get('xl/_rels/workbook.xml.rels').toString('utf8');
  const relMap = {};
  const relRe = /Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let rm;
  while ((rm = relRe.exec(rels))) relMap[rm[1]] = rm[2];

  const resultat = {};
  const sheetRe = /<(?:[\w]+:)?sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g;
  while ((rm = sheetRe.exec(wb))) {
    const namn = rm[1];
    const target = relMap[rm[2]].replace(/^\//, '');
    const xml = zip.get(target.startsWith('xl/') ? target : `xl/${target}`).toString('utf8');
    resultat[namn] = lasArk(xml, shared);
  }
  return resultat;
}

/** Filterregel v2 — ordagrant från docs/filterregel.md */
function passerarV2(post) {
  if (!post || typeof post !== 'string') return false;
  if (/[:.]/.test(post)) return false;
  const segment = post.split(/[\s-]+/).filter((s) => s.length > 0);
  if (segment.length === 0) return false;
  return segment.every((s) => s.length >= 2);
}

function sha256Fil(fil) {
  const crypto = require('crypto');
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(fil));
  return h.digest('hex');
}

module.exports = {
  ARK,
  ARK_FACIT,
  lasXlsx,
  passerarV2,
  sha256Fil,
};
