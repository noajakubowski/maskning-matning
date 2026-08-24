'use strict';

function teckenLangd(text) {
  return [...text].length;
}

function slaaIhopSpann(spann) {
  if (!spann.length) return [];
  const sorterade = spann.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const ut = [{ start: sorterade[0].start, end: sorterade[0].end, typer: new Set([sorterade[0].typ]) }];
  for (let i = 1; i < sorterade.length; i++) {
    const s = sorterade[i];
    const last = ut[ut.length - 1];
    if (s.start <= last.end) {
      last.end = Math.max(last.end, s.end);
      last.typer.add(s.typ);
    } else {
      ut.push({ start: s.start, end: s.end, typer: new Set([s.typ]) });
    }
  }
  return ut.map((s) => ({ start: s.start, end: s.end, typer: [...s.typer] }));
}

function unionTackning(unionSpann, start, end) {
  let tackt = 0;
  for (const s of unionSpann) {
    const ovStart = Math.max(s.start, start);
    const ovEnd = Math.min(s.end, end);
    if (ovEnd > ovStart) tackt += ovEnd - ovStart;
  }
  return tackt;
}

function klassificeraFacitpost(facit, unionSpann, flaggor) {
  const start = facit.startposition;
  const end = facit.slutposition;
  const langd = end - start;
  const tackt = unionTackning(unionSpann, start, end);

  let klass;
  if (tackt <= 0) klass = 'miss';
  else if (tackt >= langd) klass = 'full';
  else klass = 'delvis';

  const overlapping = flaggor.filter((f) =>
    f.startposition < end && f.slutposition > start,
  );

  const typforvaxling = {
    personnummer_som_telefonnummer: 0,
    telefonnummer_som_personnummer: 0,
    personnamn_som_annat: 0,
  };

  if (klass !== 'miss') {
    const facitTyp = facit.typ;
    const harRattTyp = overlapping.some((f) => f.typ === facitTyp);
    if (!harRattTyp && overlapping.length > 0) {
      const flaggTyper = new Set(overlapping.map((f) => f.typ));
      if (facitTyp === 'telefonnummer' && flaggTyper.has('personnummer')) {
        typforvaxling.personnummer_som_telefonnummer = 1;
      }
      if (facitTyp === 'personnummer' && flaggTyper.has('telefonnummer')) {
        typforvaxling.telefonnummer_som_personnummer = 1;
      }
      if (facitTyp !== 'personnamn' && flaggTyper.has('personnamn')) {
        typforvaxling.personnamn_som_annat = 1;
      }
    }
  }

  return { klass, typforvaxling, overlapping: overlapping.length };
}

function raknaOverflaggning(dokument, facitPoster, flaggor, unionAlla) {
  const perDok = new Map();
  for (const dok of dokument) {
    perDok.set(dok.id, { totalTecken: teckenLangd(dok.text), overflaggadeTecken: 0 });
  }

  const facitPerDok = new Map();
  for (const p of facitPoster) {
    if (!facitPerDok.has(p['dokument-id'])) facitPerDok.set(p['dokument-id'], []);
    facitPerDok.get(p['dokument-id']).push({
      start: p.startposition,
      end: p.slutposition,
    });
  }

  const unionPerDok = new Map();
  for (const f of unionAlla) {
    const id = f['dokument-id'];
    if (!unionPerDok.has(id)) unionPerDok.set(id, []);
    unionPerDok.get(id).push({
      start: f.startposition,
      end: f.slutposition,
      typ: f.typ,
    });
  }

  let overflaggadeSpann = 0;

  for (const [dokId, unionSpann] of unionPerDok.entries()) {
    const facitSpann = slaaIhopSpann(facitPerDok.get(dokId) || []);
    const union = slaaIhopSpann(unionSpann);

    for (const u of union) {
      let utanfor = u.end - u.start;
      for (const f of facitSpann) {
        const ovStart = Math.max(u.start, f.start);
        const ovEnd = Math.min(u.end, f.end);
        if (ovEnd > ovStart) utanfor -= ovEnd - ovStart;
      }
      if (utanfor > 0) {
        overflaggadeSpann++;
        const post = perDok.get(dokId);
        if (post) post.overflaggadeTecken += utanfor;
      }
    }
  }

  return {
    dokumentData: [...perDok.values()],
    overflaggadeSpann,
    totalTecken: [...perDok.values()].reduce((s, d) => s + d.totalTecken, 0),
  };
}

function matUppsattning(facit, dokument, flaggor) {
  const flaggMedTyp = flaggor.map((f) => ({
    'dokument-id': f['dokument-id'],
    startposition: f.startposition,
    slutposition: f.slutposition,
    typ: f.typ,
  }));

  const unionAlla = flaggMedTyp.map((f) => ({
    start: f.startposition,
    end: f.slutposition,
    typ: f.typ,
  }));
  const unionSpannGlobal = slaaIhopSpann(unionAlla);

  const perPost = facit.map((post) => {
    const dokUnion = slaaIhopSpann(
      flaggMedTyp
        .filter((f) => f['dokument-id'] === post['dokument-id'])
        .map((f) => ({ start: f.startposition, end: f.slutposition, typ: f.typ })),
    );
    const dokFlaggor = flaggMedTyp.filter((f) => f['dokument-id'] === post['dokument-id']);
    return klassificeraFacitpost(post, dokUnion, dokFlaggor);
  });

  const perTyp = {};
  for (let i = 0; i < facit.length; i++) {
    const post = facit[i];
    const typ = post.typ;
    const undertyp = post['undertyp eller ark'];
    const nyckel = typ + '|' + undertyp;
    if (!perTyp[nyckel]) {
      perTyp[nyckel] = {
        typ,
        undertyp,
        full: 0,
        delvis: 0,
        miss: 0,
        typforvaxling: {
          personnummer_som_telefonnummer: 0,
          telefonnummer_som_personnummer: 0,
          personnamn_som_annat: 0,
        },
        poster: 0,
      };
    }
    const rad = perTyp[nyckel];
    rad.poster++;
    rad[perPost[i].klass]++;
    rad.typforvaxling.personnummer_som_telefonnummer += perPost[i].typforvaxling.personnummer_som_telefonnummer;
    rad.typforvaxling.telefonnummer_som_personnummer += perPost[i].typforvaxling.telefonnummer_som_personnummer;
    rad.typforvaxling.personnamn_som_annat += perPost[i].typforvaxling.personnamn_som_annat;
  }

  const over = raknaOverflaggning(dokument, facit, flaggMedTyp, flaggMedTyp);

  return {
    perTyp: Object.values(perTyp),
    perPost,
    overflaggning: over,
    unionSpann: unionSpannGlobal.length,
  };
}

function unionFlaggor(monster, lexikon) {
  return [...monster, ...lexikon];
}

module.exports = {
  slaaIhopSpann,
  matUppsattning,
  unionFlaggor,
  teckenLangd,
};
