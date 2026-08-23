'use strict';

const MALLAR = {
  ansokan: {
    med: [
      'Sökanden {NAMN} lämnar härmed in ansökan enligt gällande föreskrifter.',
      'Kontaktuppgifter: telefon {TELEFON}, personnummer {PERSONNUMMER}.',
      'Namnet {NAMN} anges som huvudsökande i ärendet.',
      'Bifogat finner {NAMN} begärda handlingar för prövning.',
      'Telefonnummer för återkoppling: {TELEFON}.',
      'Personnummer enligt folkbokföring: {PERSONNUMMER}.',
      'Sökanden {NAMN} intygar att uppgifterna är riktiga.',
      'Vid frågor nås {NAMN} på {TELEFON}.',
    ],
    utan: [
      'Ansökan avser medel enligt beslutad ram.',
      'Handlingen ska ha kommit in före angiven sista dag.',
      'Myndigheten gör en samlad bedömning av ärendet.',
      'Brister i underlag kan medföra att ärendet avvisas.',
      'Beslut meddelas när utredningen är klar.',
      'Kopior sparas enligt gällande arkivregler.',
      'Handläggningen sker i turordning.',
      'Eventuell komplettering begärs skriftligen.',
    ],
    kollision: [
      'I närheten av platsen växer det gott om {ORD}.',
      'Sökanden anger att ordet {ORD} förekommer i omgivningen.',
    ],
  },
  tjansteanteckning: {
    med: [
      'Anteckning gäller handläggning av {NAMN}.',
      'Telefonsamtal fördes med {NAMN} denna dag.',
      'Personnummer kontrollerades: {PERSONNUMMER}.',
      'Nummer {TELEFON} användes vid kontakt.',
      '{NAMN} meddelade att handlingen kompletteras.',
      'Uppgift om {PERSONNUMMER} fördes in i ärendet.',
      'Telefon {TELEFON} bekräftades som giltigt.',
      '{NAMN} hänvisade till tidigare korrespondens.',
    ],
    utan: [
      'Ärendet ligger för beslut hos enhetschef.',
      'Komplettering har begärts per post.',
      'Handläggningen återupptas efter semestertid.',
      'Journalanteckningen signeras av handläggare.',
      'Kopia skickas till berörd part.',
      'Tidsfristen förlängdes med fjorton dagar.',
      'Intern avstämning genomfördes.',
      'Status uppdaterades i ärendesystemet.',
    ],
    kollision: [
      'I omgivningen förekommer {ORD} naturligt.',
      'Texten nämner att {ORD} är relevant för platsen.',
    ],
  },
  beslut: {
    med: [
      'Beslut fattas avseende {NAMN}.',
      'Sökanden {NAMN} har rätt att överklaga.',
      'Personnummer i ärendet: {PERSONNUMMER}.',
      'Kontakt sker via {TELEFON}.',
      '{NAMN} tillstånds ges enligt ansökan.',
      'Uppgift {PERSONNUMMER} ligger till grund för beslutet.',
      'Telefon {TELEFON} användes vid samråd.',
      '{NAMN} ska underrättas om beslutet.',
    ],
    utan: [
      'Beslutet gäller omedelbart.',
      'Motiveringen redovisas i bilaga.',
      'Expediering sker utan dröjsmål.',
      'Handlingen diarieförs enligt rutin.',
      'Överklagandetiden är tre veckor.',
      'Verkställighet sker enligt ordning.',
      'Beslutet delges berörda parter.',
      'Myndigheten har slutbehandlat ärendet.',
    ],
    kollision: [
      'Området präglas av {ORD} enligt beskrivning.',
      'I handlingen anges att {ORD} förekommer i texten.',
    ],
  },
};

const DOKUMENTTYPER = ['ansokan', 'tjansteanteckning', 'beslut'];

function valjMallar(slump) {
  const ut = {};
  for (const typ of DOKUMENTTYPER) {
    ut[typ] = MALLAR[typ];
  }
  return ut;
}

module.exports = { MALLAR, DOKUMENTTYPER, valjMallar };
