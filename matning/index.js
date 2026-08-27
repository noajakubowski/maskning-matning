'use strict';

const { wilson95, tango95, klusterbootstrapKvot } = require('./intervall.js');
const { matUppsattning, unionFlaggor } = require('./matchning.js');
const { paraFacit, paradMissDiff, arMiss } = require('./parning.js');

const MATUPPSATTNINGAR = ['monster', 'lexikon', 'union'];

const TYPBLOCK_ORDNING = [
  { typ: 'personnummer', undertyp: 'tiosiffriga' },
  { typ: 'personnummer', undertyp: 'tolvsiffriga' },
  { typ: 'telefonnummer', undertyp: 'med skiljetecken' },
  { typ: 'telefonnummer', undertyp: 'utan skiljetecken' },
  { typ: 'telefonnummer', undertyp: 'internationellt' },
  { typ: 'personnamn', undertyp: 'efternamn' },
  { typ: 'personnamn', undertyp: 'förnamn kvinnor' },
  { typ: 'personnamn', undertyp: 'förnamn män' },
  { typ: 'personnamn', undertyp: 'tilltalsnamn kvinnor' },
  { typ: 'personnamn', undertyp: 'tilltalsnamn män' },
];

const TYPFORVAXLING_ETIKETTER = {
  personnummer_som_telefonnummer: 'typförväxling: flaggat som personnummer, var telefonnummer',
  telefonnummer_som_personnummer: 'typförväxling: flaggat som telefonnummer, var personnummer',
};

const TYPFORVAXLING_RIKTNINGAR = {
  personnummer: ['personnummer_som_telefonnummer', 'telefonnummer_som_personnummer'],
  telefonnummer: ['personnummer_som_telefonnummer', 'telefonnummer_som_personnummer'],
  personnamn: [],
};

function typEtikett(typ, undertyp) {
  return typ + ' / ' + undertyp;
}

function typNyckel(typ, undertyp) {
  return typ + '|' + undertyp;
}

function byggBlockOrdning(perTyp) {
  const iFacit = new Set(perTyp.map((r) => typNyckel(r.typ, r.undertyp)));
  const knownForTyp = new Map();
  for (const { typ, undertyp } of TYPBLOCK_ORDNING) {
    const key = typNyckel(typ, undertyp);
    if (!iFacit.has(key)) continue;
    if (!knownForTyp.has(typ)) knownForTyp.set(typ, []);
    knownForTyp.get(typ).push(undertyp);
  }
  const typOrdning = [];
  for (const { typ } of TYPBLOCK_ORDNING) {
    if (knownForTyp.has(typ) && !typOrdning.includes(typ)) typOrdning.push(typ);
  }
  const allTyper = new Set(perTyp.map((r) => r.typ));
  for (const typ of [...allTyper].sort()) {
    if (!typOrdning.includes(typ)) typOrdning.push(typ);
  }
  const ordning = [];
  for (const typ of typOrdning) {
    const known = knownForTyp.get(typ) || [];
    const knownSet = new Set(known);
    const unknown = perTyp
      .filter((r) => r.typ === typ && !knownSet.has(r.undertyp))
      .map((r) => r.undertyp)
      .sort();
    for (const undertyp of known) ordning.push({ typ, undertyp });
    for (const undertyp of unknown) ordning.push({ typ, undertyp });
  }
  return ordning;
}

function kravFacitPerPostLangd(facit, perPost) {
  if (facit.length !== perPost.length) {
    console.error('BRIST: facit och perPost har olika längd: ' + facit.length + ' mot '
      + perPost.length);
    const err = new Error('facit och perPost har olika längd');
    err.kod = 1;
    throw err;
  }
}

function byggTypRader(facit, perTyp, perPost) {
  kravFacitPerPostLangd(facit, perPost);
  const map = new Map(perTyp.map((r) => [typNyckel(r.typ, r.undertyp), r]));
  const ordning = byggBlockOrdning(perTyp);
  const rader = [];
  let redovisade = 0;
  const skrivnaNycklar = new Set();
  for (const { typ, undertyp } of ordning) {
    const rad = map.get(typNyckel(typ, undertyp));
    if (!rad) continue;
    const n = rad.poster;
    redovisade += n;
    skrivnaNycklar.add(typNyckel(typ, undertyp));
    rader.push({ rubrik: typEtikett(typ, undertyp) });
    if (arKollisionsord(typ, undertyp)) {
      rader.push(...byggKollisionsordRader(facit, perPost));
    } else {
      rader.push(wilsonRad('full träff', rad.full, n));
      rader.push(wilsonRad('delvis', rad.delvis, n));
      rader.push(wilsonRad('miss', rad.miss, n));
      for (const nyckel of TYPFORVAXLING_RIKTNINGAR[typ] || []) {
        rader.push(wilsonRad(
          TYPFORVAXLING_ETIKETTER[nyckel],
          rad.typforvaxling[nyckel],
          n,
        ));
      }
    }
  }
  return { rader, redovisade, skrivnaNycklar };
}

// En handskriven lista kan bli inaktuell igen nästa gång en undertyp tillkommer.
// Avstämningsraden räknar det som faktiskt skrevs mot det som fanns och kan inte tystna.
function kontrolleraAvstamning(facit, redovisade, skrivnaNycklar) {
  const m = facit.length;
  if (redovisade === m) return;
  const facitNycklar = new Set(facit.map((p) => typNyckel(p.typ, p['undertyp eller ark'])));
  for (const key of facitNycklar) {
    if (!skrivnaNycklar.has(key)) {
      const sep = key.indexOf('|');
      console.error('BRIST: saknat block — ' + typEtikett(key.slice(0, sep), key.slice(sep + 1)));
    }
  }
  console.error('BRIST: redovisade poster: ' + redovisade + ' av ' + m);
  const err = new Error('redovisade poster: ' + redovisade + ' av ' + m);
  err.kod = 1;
  throw err;
}

function valjFlaggor(uppsattning, monster, lexikon) {
  if (uppsattning === 'monster') return monster;
  if (uppsattning === 'lexikon') return lexikon;
  if (uppsattning === 'union') return unionFlaggor(monster, lexikon);
  throw new Error(`Okänd mätuppsättning: ${uppsattning}`);
}

function fmtPct(x) {
  return (x * 100).toFixed(1);
}

function wilsonRad(namn, antal, total) {
  const w = wilson95(antal, total);
  const text = namn + ': ' + antal + ' av ' + total + ' (' + fmtPct(w.p) + ' %, Wilson 95 %: '
    + fmtPct(w.lo) + '–' + fmtPct(w.hi) + ' %, n=' + total + ')';
  return {
    namn,
    antal,
    total,
    p: w.p,
    lo: w.lo,
    hi: w.hi,
    text,
  };
}

function enkelRad(text) {
  return { text };
}

// Posterna är ett fast antal ord som var och ett planteras flera gånger, urvalet
// dras inte på fröet, och ett ord träffas eller missas i alla sina förekomster
// samtidigt. Wilson förutsätter oberoende försök. De finns inte här.
function byggKollisionsordRader(facit, perPost) {
  kravFacitPerPostLangd(facit, perPost);
  const ordMap = new Map();
  for (let i = 0; i < facit.length; i++) {
    const post = facit[i];
    if (post.typ !== 'personnamn' || post['undertyp eller ark'] !== 'kollisionsord') continue;
    const ord = post['ursprunglig sträng'];
    if (!ordMap.has(ord)) ordMap.set(ord, []);
    ordMap.get(ord).push(perPost[i].klass);
  }

  let ordHelMiss = 0;
  let totalForekomster = 0;
  let missadeForekomster = 0;
  let delvisForekomster = 0;
  const rader = [];

  for (const [ord, klasser] of ordMap) {
    totalForekomster += klasser.length;
    let traffade = 0;
    let missade = 0;
    for (const klass of klasser) {
      if (klass === 'delvis') delvisForekomster++;
      if (arMiss(klass)) {
        missade++;
        missadeForekomster++;
      } else {
        traffade++;
      }
    }
    if (missade === klasser.length) ordHelMiss++;
    if (traffade > 0 && missade > 0) {
      // "delvis träffat" i Tillägg L avser partiell spannöverlappning inom en post.
      // Här är samma ord full träff i en förekomst och miss i en annan — spridd träff.
      console.error('BRIST: kollisionsord spridd träff — ' + ord + ': ' + traffade
        + ' träffade förekomster, ' + missade + ' missade förekomster');
      const err = new Error('kollisionsord spridd träff: ' + ord);
      err.kod = 1;
      throw err;
    }
  }

  const unikaOrd = ordMap.size;
  rader.push(enkelRad('unika kollisionsord planterade: ' + unikaOrd + ' (n=' + unikaOrd + ')'));
  rader.push(enkelRad('ord där samtliga förekomster missades: ' + ordHelMiss + ' av '
    + unikaOrd + ' (n=' + unikaOrd + ')'));
  rader.push(enkelRad('delvis: ' + delvisForekomster + ' av ' + totalForekomster
    + ' (n=' + totalForekomster + ')'));
  rader.push(enkelRad('förekomster: ' + missadeForekomster + ' missade av ' + totalForekomster
    + ' totalt (n=' + totalForekomster + ')'));
  // Anmärkning om urval, inte ett mätvärde — n= är inte meningsfullt här.
  rader.push(enkelRad('urvalet är fast och dras inte på fröet'));
  return rader;
}

function arKollisionsord(typ, undertyp) {
  return typ === 'personnamn' && undertyp === 'kollisionsord';
}

function matHog(hog) {
  const ut = {
    seed: hog.seed,
    hogtyp: hog.hogtyp,
    antalDokument: hog.dokument.length,
    antalFacit: hog.facit.length,
    matuppsattningar: {},
  };

  for (const upp of MATUPPSATTNINGAR) {
    const flaggor = valjFlaggor(upp, hog.flaggorMonster, hog.flaggorLexikon);
    const r = matUppsattning(hog.facit, hog.dokument, flaggor);
    const { rader, redovisade, skrivnaNycklar } = byggTypRader(hog.facit, r.perTyp, r.perPost);
    if (upp === 'monster') {
      kontrolleraAvstamning(hog.facit, redovisade, skrivnaNycklar);
      ut.redovisadePoster = redovisade;
      ut.avstamningText = 'redovisade poster: ' + redovisade + ' av ' + hog.facit.length;
    } else if (redovisade !== ut.redovisadePoster) {
      kontrolleraAvstamning(hog.facit, redovisade, skrivnaNycklar);
    }

    const boot = klusterbootstrapKvot(r.overflaggning.dokumentData, hog.seed + ':' + upp + ':over');
    const overAbs = r.overflaggning.dokumentData.reduce((s, d) => s + d.overflaggadeTecken, 0);
    const overSpann = r.overflaggning.overflaggadeSpann;
    const overTecken = r.overflaggning.totalTecken;

    ut.matuppsattningar[upp] = {
      perTyp: r.perTyp,
      perPost: r.perPost,
      rader,
      overflaggning: {
        absolut: overAbs,
        per1000: boot.p,
        lo: boot.lo,
        hi: boot.hi,
        spann: overSpann,
        tecken: overTecken,
        dokument: boot.dokument,
        bootstrap: boot.b,
        textAbs: 'överflaggning absolut: ' + overAbs + ' tecken utanför facit (n=' + overTecken + ' tecken i ' + boot.dokument + ' dokument)',
        textPer1000: 'överflaggning per 1000 tecken: ' + boot.p.toFixed(3) + ' (percentilintervall 95 %: '
          + boot.lo.toFixed(3) + '–' + boot.hi.toFixed(3) + ', B=' + boot.b + ', n=' + boot.dokument + ' dokument)',
        textSpann: 'överflaggade spann: ' + overSpann + ' (n=' + overSpann + ' spann)',
      },
      summering: {
        full: r.perTyp.reduce((s, t) => s + t.full, 0),
        delvis: r.perTyp.reduce((s, t) => s + t.delvis, 0),
        miss: r.perTyp.reduce((s, t) => s + t.miss, 0),
        total: hog.facit.length,
      },
    };
  }

  if (hog.hogtyp === 1) {
    const namnPoster = hog.facit.filter((p) => p.typ === 'personnamn');
    const uteslutna = namnPoster.filter((p) => p['ursprunglig sträng'].includes('-'));
    ut.implementationsverifiering = {
      etikett: 'IMPLEMENTATIONSVERIFIERING',
      namnPoster: namnPoster.length,
      uteslutnaBindestreck: uteslutna.length,
      text: 'IMPLEMENTATIONSVERIFIERING: namn ' + namnPoster.length + ' poster, uteslutna utan bindestreck-jämförelse: '
        + uteslutna.length + ' (n=' + uteslutna.length + ')',
    };
  }

  return ut;
}

function paradDifferens(hogA, hogB, uppsattning) {
  const par = paraFacit(hogA.facit, hogB.facit);
  const flaggorA = valjFlaggor(uppsattning, hogA.flaggorMonster, hogA.flaggorLexikon);
  const flaggorB = valjFlaggor(uppsattning, hogB.flaggorMonster, hogB.flaggorLexikon);
  const matA = matUppsattning(hogA.facit, hogA.dokument, flaggorA);
  const matB = matUppsattning(hogB.facit, hogB.dokument, flaggorB);
  const klassA = matA.perPost.map((p) => p.klass);
  const klassB = matB.perPost.map((p) => p.klass);

  const idxMapA = new Map(hogA.facit.map((p, i) => [p.plant_id, i]));
  const idxMapB = new Map(hogB.facit.map((p, i) => [p.plant_id, i]));
  const ordKlassA = par.par.map((p) => klassA[idxMapA.get(p.a.plant_id)]);
  const ordKlassB = par.par.map((p) => klassB[idxMapB.get(p.b.plant_id)]);

  const diff = paradMissDiff(par.par, ordKlassA, ordKlassB);
  const t = tango95(diff.n01, diff.n10, diff.n);

  return {
    par: par.antalPar,
    n01: diff.n01,
    n10: diff.n10,
    n: diff.n,
    delta: t.delta,
    lo: t.lo,
    hi: t.hi,
    uppsattning,
    hogA: hogA.hogtyp,
    hogB: hogB.hogtyp,
    text: 'parad differens hög ' + hogA.hogtyp + '→' + hogB.hogtyp + ' (' + uppsattning + '): δ='
      + fmtPct(t.delta) + ' pp (Tango 95 %: ' + fmtPct(t.lo) + '–' + fmtPct(t.hi) + ' pp, n01=' + diff.n01
      + ', n10=' + diff.n10 + ', n=' + diff.n + ', n=' + par.antalPar + ' parade poster)',
  };
}

function matAlla(hogar) {
  const perHog = hogar.map((h) => matHog(h));
  const parvis = [];
  const hog1 = hogar.find((h) => h.hogtyp === 1);
  const hog2 = hogar.find((h) => h.hogtyp === 2);
  if (hog1 && hog2) {
    for (const upp of MATUPPSATTNINGAR) {
      parvis.push(paradDifferens(hog1, hog2, upp));
    }
  }
  return { perHog, parvis };
}

function formatUtskrift(resultat) {
  const rader = [];
  for (const hog of resultat.perHog) {
    rader.push('Frö: ' + hog.seed + ' (n=1)');
    rader.push('Högtyp: ' + hog.hogtyp + ' (n=1)');
    rader.push('Antal dokument: ' + hog.antalDokument + ' (n=' + hog.antalDokument + ')');
    rader.push('Antal facitposter: ' + hog.antalFacit + ' (n=' + hog.antalFacit + ')');
    if (hog.implementationsverifiering) {
      rader.push(hog.implementationsverifiering.text);
    }
    for (const upp of MATUPPSATTNINGAR) {
      const m = hog.matuppsattningar[upp];
      rader.push('Mätuppsättning: ' + upp + ' (n=' + m.summering.total + ' facitposter)');
      for (const rad of m.rader) {
        if (rad.rubrik) rader.push('  ' + rad.rubrik);
        else rader.push('  ' + rad.text);
      }
      rader.push('  ' + m.overflaggning.textAbs);
      rader.push('  ' + m.overflaggning.textPer1000);
      rader.push('  ' + m.overflaggning.textSpann);
    }
    if (hog.avstamningText) {
      rader.push(hog.avstamningText);
    }
  }
  for (const p of resultat.parvis) {
    rader.push(p.text);
  }
  return rader.join('\n');
}

module.exports = {
  MATUPPSATTNINGAR,
  TYPBLOCK_ORDNING,
  matHog,
  matAlla,
  paradDifferens,
  formatUtskrift,
  valjFlaggor,
  typEtikett,
  byggBlockOrdning,
  byggTypRader,
  byggKollisionsordRader,
  kravFacitPerPostLangd,
};
