'use strict';

function svenskKontrollsiffra(nioSiffror) {
  if (!/^\d{9}$/.test(nioSiffror)) throw new Error('Kontrollsiffra kräver 9 siffror');
  let summa = 0;
  for (let i = 0; i < 9; i++) {
    let n = parseInt(nioSiffror[i], 10);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    summa += n;
  }
  return (10 - (summa % 10)) % 10;
}

function felaktigKontrollsiffra(ratt, slump) {
  const val = [];
  for (let i = 0; i <= 9; i++) if (i !== ratt) val.push(i);
  return slump.val(val);
}

function datumled(slump) {
  const manad = String(slump.heltal(1, 12)).padStart(2, '0');
  const dag = String(slump.heltal(1, 31)).padStart(2, '0');
  return { manad, dag, kort: manad + dag };
}

function formateraNamn(namn) {
  return namn.split(/([- ])/g).map((del) => {
    if (del === '-' || del === ' ') return del;
    if (!del.length) return del;
    return del.charAt(0).toUpperCase() + del.slice(1).toLowerCase();
  }).join('');
}

function personnummer(slump, langdform, medBindestreck) {
  const { kort } = datumled(slump);
  let datumDel;
  let tioForCheck;
  if (langdform === 'tiosiffriga') {
    const arKort = String(slump.heltal(0, 99)).padStart(2, '0');
    const lop = String(slump.heltal(0, 999)).padStart(3, '0');
    datumDel = arKort + kort;
    tioForCheck = arKort + kort + lop;
  } else {
    const innevarandeAr = new Date().getFullYear();
    const arLang = String(slump.heltal(1900, innevarandeAr));
    const arKort = arLang.slice(2);
    const lop = String(slump.heltal(0, 999)).padStart(3, '0');
    datumDel = arLang + kort;
    tioForCheck = arKort + kort + lop;
  }
  if (tioForCheck.length !== 9) throw new Error(`Ogiltigt datumled: ${tioForCheck}`);
  const lop = tioForCheck.slice(6);
  const ratt = svenskKontrollsiffra(tioForCheck);
  const fel = felaktigKontrollsiffra(ratt, slump);
  let siffror = datumDel + lop + String(fel);
  if (medBindestreck) {
    const skilje = langdform === 'tiosiffriga' ? 6 : 8;
    return siffror.slice(0, skilje) + '-' + siffror.slice(skilje);
  }
  return siffror;
}

const TELEFON_FORMER = ['med_skiljetecken', 'utan_skiljetecken', 'internationellt'];

function telefonnummer(slump, form) {
  const a = String(slump.heltal(0, 9));
  const b = String(slump.heltal(100, 999)).padStart(3, '0');
  const c = String(slump.heltal(10, 99)).padStart(2, '0');
  const d = String(slump.heltal(10, 99)).padStart(2, '0');
  if (form === 'med_skiljetecken') return `07${a}-${b} ${c} ${d}`;
  if (form === 'utan_skiljetecken') return `07${a}${b}${c}${d}`;
  if (form === 'internationellt') return `+467${a}${b}${c}${d}`;
  throw new Error(`Okänd telefonform: ${form}`);
}

function valjNamn(namnpool, slump) {
  const poster = [];
  for (const [nyckel, lista] of Object.entries(namnpool.arken)) {
    for (const post of lista) poster.push({ ...post, arkNyckel: nyckel });
  }
  const vikter = poster.map((p) => p.barare);
  const valt = slump.viktat(poster, vikter);
  return {
    text: formateraNamn(valt.namn),
    ark: namnpool.arkfacit[valt.arkNyckel],
    arkNyckel: valt.arkNyckel,
  };
}

module.exports = {
  TELEFON_FORMER,
  personnummer,
  telefonnummer,
  valjNamn,
  formateraNamn,
  svenskKontrollsiffra,
};
