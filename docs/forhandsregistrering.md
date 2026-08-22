# Förhandsregistrering

Detta dokument låser mätningens parametrar innan första skarpa körningen.
Commit-tidsstämpeln på den här filen är beviset. Efter första körningen
ändras inget som här kallas **fryst**.

Relaterat masterdokument: [`filterregel.md`](filterregel.md) (commitade
revisioner a3a1bd0, 30cc9ff). Där finns namnkälla med sha256 och licens,
filterregel v1→v2 med skäl, täckningstal per ark, förutsagd
överflaggning, namnräkning per namndel och efternamnstaket. Det som
står där gäller och upprepas inte här.

---

## Vad som mäts

Ett verktyg som maskar personuppgifter i myndighetsdokument, och en rigg
som mäter hur ofta det misslyckas mot ett facit skapat i samma ögonblick.

| Typ | Enhet | Kommentar |
|---|---|---|
| Personnummer | planterat värde | — |
| Telefonnummer | planterat värde | — |
| Personnamn | namndel | aldrig fullständigt namn; se [`filterregel.md`](filterregel.md) |

Riggen producerar frekvenser för miss och överflaggning per typ. Den
bedömer inte om maskningen i sig är tillräcklig för produktion.

---

## Korpus

Tre högar. Varje hög får samma kvot oberoende av innehållstyp.

| Hög | Syfte |
|---|---|
| 1 — ren | Kontrollgrupp utan avsiktlig skada |
| 2 — trasig text | OCR-liknande korruption (se nästa avsnitt) |
| 3 — namnkollisioner | Svenska ord som råkar vara registrerade namn |

### Kvot per hög — fryst

| Typ | Antal per hög | Grund |
|---|---|---|
| Namndelar | 400 | Statistisk: ±3 procentenheter vid frekvens kring 10 % (se tabell nedan) |
| Personnummer | 200 | Statistisk: ±4,2 procentenheter vid frekvens kring 10 % |
| Telefonnummer | 200 | Statistisk: ±4,2 procentenheter vid frekvens kring 10 % |

Kvoten styr, inte dokumentantalet. Antalet dokument blir vad det blir,
deterministiskt per frö.

```
  per hög
  ┌─────────────────────────────────────┐
  │ 400 namndelar                       │
  │ 200 personnummer                    │
  │ 200 telefonnummer                   │
  └─────────────────────────────────────┘
           │
           ▼
  antal dokument = f(frö, fördelning)   ← ej fryst som tal
```

### Motivering av kvotstorlek

Antagande för storleksberäkning: sann missfrekvens kring **10 %**.

| Parameter | Värde | Grund |
|---|---|---|
| Konfidensnivå | 95 % | Redovisningsregel (se avsnitt Redovisning) |
| Önskad halvbredd på intervall | ±3 procentenheter | Noas beslut: tillräcklig precision utan att kräva orimlig korpus |
| Approximativ n vid p≈0,10 | ca 400 | Binomial approx.: n ≈ z²·p·(1−p) / e² med z≈1,96, e=0,03 → n≈384 |

400 namndelar per hög uppfyller det approximativa kravet (faktiskt ±2,94;
n=384 ger exakt ±3,0). Personnummer och telefon har n=200; halvbredden
blir ±4,2 procentenheter vid samma p — 39 % bredare än kravet — vilket
accepteras.

### Fjärde hög — struken

En hög för **indirekt utpekande** (t.ex. "min dotter Anna") planerades
men ströks före frysning. Facit går inte att ange som entydiga
teckenpositioner för sådana uttryck utan att smuggla in tolkning i
facitgenereringen.

---

## Korruption i hög 2

Korruption modellerar vad en skanner gör med papper, inte vad detektorn
gör med text.

### Korruptionstyper — fryst

| Typ | Andel av korruptionsfall | Grund |
|---|---|---|
| Teckenförväxling (0/O, 1/l, 5/S) | 50 % | Publicerade OCR-studier, engelska/tyska/arabiska texter — **inte** svenska myndighetsskanningar |
| Borttaget eller inskjutet tecken | 30 % | Samma källa |
| Inskjutet mellanslag | 20 % | Samma källa |
| Avstavning över radbryt | ingår i fördelningen ovan | Samma modell |

Fördelningen bygger alltså på empiriska OCR-studier från andra språk och
domäner. Svensk myndighetsskanning har inte studerats här; generalisering
är medveten och obekräftad.

### Takt — fryst

| Parameter | Värde | Grund |
|---|---|---|
| Andel planterade uppgifter som får minst en korruption | 30 % | **Saknad empirisk grund** — valt utan mätunderlag |

---

## Matchningsregel — fryst

Jämförelse sker på teckenpositioner i slutlig text (efter korruption).

### Träff — mäts per facitspann

| Utfall | Definition |
|---|---|
| Full träff | Detektorns union täcker hela facitspannet |
| Delvis | Unionen täcker någon del av facitspannet men inte hela |
| Miss | Unionen berör inte facitspannet alls |

Att en flagga sträcker sig utanför facitspannet påverkar inte
träffbedömningen. Kostnaden för det fångas i stället av
överflaggningsmåttet nedan.

### Överflaggning — mäts i tecken, inte i flaggor

Överflaggning är antalet tecken i detektorns union som inte ligger inom
något facitspann. Redovisas som absolut antal och som antal per 1000
tecken text. Överflaggning redovisas alltid tillsammans med missarna,
aldrig ensam, och aldrig mot dem.

Union sker per typ, inte över typer. Flaggor för personnummer slås ihop
med varandra, aldrig med flaggor för namn. Annars går redovisning per typ
inte att göra. Ett tecken som felaktigt flaggats räknas som
överflaggning för den typ detektorn påstod att det var.

Motivering: teckenmåttet valdes framför ett tak för hur mycket en flagga
får överskjuta, eftersom ett tak skulle kräva ett godtyckligt tal.
Teckenmåttet kräver inget påhittat värde.

```
Detektor som flaggar hela dokumentet:
  träff          full träff på varje facitspann
  överflaggning  ≈ hela dokumentets teckenantal
  utfall         maximal träffsäkerhet, katastrofal överflaggning
                 — båda talen syns, ingen kan dölja det andra
```

---

## Facit

Facit genereras tillsammans med texten, passerar aldrig detektionslagret
(M2), och öppnas först i poängsättningen (M4).

Ordning:

```
  ren text  →  plantera uppgifter  →  korruption (hög 2)  →  skriv facit
```

Facit skrivs **efter** korruption eftersom skadan flyttar teckenpositioner.

---

## Frön — fryst

| Regel | Detalj |
|---|---|
| Ett frö per hög | Tre frön totalt |
| Visning | Fröet redovisas i körresultatet |
| Reproducerbarhet | Samma frö → identisk hög → identiskt resultat |
| Slumpkälla | Egen seedad generator i M1; **inga** anrop till inbyggd slump |

---

## Personnummer — fryst krav

Alla planterade personnummer konstrueras så att de **inte** kan tillhöra
en verklig person. Detta är ett hårdkrav på M1, inte en mätparameter.

---

## Mätuppsättningar

Tre körningar per hög (eller motsvarande matris):

| Uppsättning | Innehåll |
|---|---|
| Mönster ensam | Endast mönsterdetektor |
| Lexikon ensam | Endast lexikondetektor |
| Union | Båda, resultat slås ihop före jämförelse |

| Typ | Redovisningsdjup |
|---|---|
| Personnamn (per namndel, per ark) | Full jämförelse: full träff, delvis, miss, överflaggning |
| Personnummer | Nedtonad: miss och överflaggning |
| Telefonnummer | Nedtonad: miss och överflaggning |

---

## Separation

Skilda mappar, ingen delad `lib/`. Generatorn modellerar verkligheten,
aldrig detektorn.

| Härledning | Källa |
|---|---|
| Korruptioner | Vad en skanner gör med papper |
| Namnkollisioner (hög 3) | Svenska ord som råkar vara namn |
| Detektorns lexikon | [`filterregel.md`](filterregel.md) — **inte** input till generatorn |

Ingen lista i generatorn härleds ur hur M2 fungerar.

### Byggspärrar — fryst

Två tester fäller bygget:

| Test | Vad som fångas |
|---|---|
| Import över modulgräns | Delad kod eller listor mellan generator och detektor |
| Generator läser detektorns listfil vid körning | Läckage från detektor till facit |

Ett tidigare planerat test mot **namnöverlapp** mellan pool och lexikon är
**struket**. Under vald namnpool är överlapp avsiktligt — verkligheten
innehåller Anna och Lars.

---

## Namnpool

| | Generator | Detektor |
|---|---|---|
| Urval | Hela registret, viktat på bärarfrekvens | Topp 1000 per ark efter filterregel v2 |
| Syfte | Verklighetsmodell | Hygien i matchning |

Överlappet är avsiktligt och modellerar drift.

Täckningstalen i [`filterregel.md`](filterregel.md) är **förhandsregistrerad
övre gräns** för lexikondetektorn, inte ett mål för generatorn.

Spärren i filterregel.md gäller: inget namn ur detektorns
förutsagda överflaggningslista får planteras i hög 3.

---

## Redovisning — fryst

| Regel | Detalj |
|---|---|
| Frekvens | Alltid med 95-procentigt konfidensintervall, aldrig punktvärde ensamt |
| Miss och överflaggning | Alltid redovisade tillsammans |
| Aggregering | Per typ — aldrig snitt över typer |
| Namntyper | Förnamn och efternamn är skilda typer |

Konfidensnivån 95 % följer samma antagande som kvotmotiveringen ovan.

---

## Vad som byggs

| Modul | Innehåll | Status |
|---|---|---|
| M1 | Generator — syntetiska dokument och facit | Ingår |
| M2 | Detektorer — mönster och lexikon | Ingår |
| M3 | Minimal regelmotor — regel-id + hash | Ingår |
| M4 | Poängsättning mot facit | Ingår — **producerar mätningssiffrorna** |
| M5 | Batchkörning | Om tiden räcker; struken M5 påverkar inte mätningen |
| M7 | Reducerad logg | Om tiden räcker |
| M6, M8, M9 | — | **Utgår** i version ett |

Version ett: ingen modell, ingen molndel, ingen nyckel.

```
  M1 ──► text + facit (facit stängt till M4)
  M2 ──► flaggor
  M3 ──► regel-id + hash
  M4 ──► frekvenser + konfidensintervall   ← enda sifferkälla
  M5 ──► (valfri omslag, ändrar inte M4:s utdata)
  M7 ──► (valfri logg)
```

---

## Kända begränsningar

| Begränsning | Konsekvens |
|---|---|
| Namnregistret fryst 2022, uppdateras inte mer | Drift mot nyare namn mäts inte |
| Ett register delat på rang (generator vs detektor) | Svagare separation än två oberoende källor |
| Korruptionstakt 30 % utan underlag | Hög 2 kan misrepresentera verklig OCR-felfrekvens |
| Efternamn utan fallback-detektor | Tak enligt [`filterregel.md`](filterregel.md) (efternamnstaket) |
| OCR-fördelning från icke-svenska studier | Korruptionstyper kan skilja sig från svenska myndighetsskanningar |
| Kortare poster i lexikon (känd förorening) | Förutsägs öka överflaggning; se filterregel.md |

---

## Frysta vs ofrysta parametrar

| Fryst (ändras inte efter denna commit) | Ofryst (implementation, inte mätparameter) |
|---|---|
| Kvoter per hög och typ | Antal dokument per hög |
| Korruptionsfördelning och takt | Exakt dokumentlängd |
| Matchningsregel och överflaggningsdefinition | Filformat på disk |
| Fröregler | CLI-flaggors namn |
| Mätuppsättningar | M7-loggformat om M7 byggs |
| Redovisningsregler | — |
| Separations- och byggspärrar | — |
| Krav på ogiltiga personnummer | — |

---

## Tillägg efter frysning — 2026-08-22

Besluten nedan fattades **2026-08-22**, efter frysningen i commit 1f30aee
men före all modulkod. De är låsta från och med detta tillägg och ska inte
redigeras in i tidigare avsnitt som om de alltid funnits där.

### Beslut A — personnummer, formkontroll utan kontrollsiffra

M2:s mönsterdetektor kontrollerar **formen** på ett personnummer, aldrig
kontrollsiffran.

Generatorn planterar personnummer med avsiktligt felaktig kontrollsiffra.
Det uppfyller kravet att inget planterat nummer kan tillhöra en verklig
person.

**Skäl 1 — ofarlighetskravet gör giltiga nummer omöjliga.** En detektor som
krävde giltig kontrollsiffra skulle avvisa exakt de nummer generatorn
planterar, och träffsiffran skulle bli noll av konstruktionsskäl — inte av
mätskäl.

**Skäl 2 — hög 2 skulle förlora sitt syfte.** Korruptionen i hög 2
förvanskar tecken. Varje sådan skada bryter kontrollsiffran. En detektor
som krävde giltig kontrollsiffra skulle aldrig hitta ett skadat
personnummer, och högen skulle inte mäta något.

**Principiell grund:** ett maskningsverktyg ska stryka över allt som ser ut
som ett personnummer. Att släppa igenom en sträng som liknar ett
personnummer men har fel kontrollsiffra vore farligt i drift. Detta är
samma avvägning som dokumentet redan gör till förmån för det billiga
felet.

Formkontrollen omfattar:

| Kontroll | Omfattning |
|---|---|
| Längd | Tio siffror |
| Datumled | Giltigt födelsedatum |
| Skiljetecken | Valfritt mellan födelsedatum och löpnummer |
| Kontrollsiffra | **Kontrolleras inte** |

### Beslut B — dokumenttext

Generatorn producerar tre dokumenttyper:

| Typ | Meningsmallar |
|---|---|
| Ansökan | 6 till 8 |
| Tjänsteanteckning | 6 till 8 |
| Beslut | 6 till 8 |

Uppgifter planteras i mallarna enligt kvoterna.

**Styrande regel:** mallarna modellerar hur myndighetstext ser ut, aldrig
hur M2 fungerar. Ingen mall får utformas för att vara lätt eller svår för
detektorn.

**Känd begränsning:** ett begränsat antal mallar betyder att detektorn i
princip skulle kunna gynnas av återkommande meningsbyggnad. Det motverkas
inte av mätuppsättningen, eftersom varken mönster- eller lexikondetektorn
använder meningskontext i version ett — men det ska stå som en
begränsning, eftersom det skulle spela roll om en modell tillkom senare.

---

## Tillägg C — personnummerformer och rättelse av Skäl 2 — 2026-08-22

Besluten nedan fattades **2026-08-22**, efter tillägget i commit d14052e
men före all modulkod. De är låsta från och med detta tillägg.

### C1 — kontrollsiffra och datumled behandlas olika, och varför

Skäl 2 i Beslut A säger att korruptionen i hög 2 bryter kontrollsiffran,
och att en detektor som krävde giltig kontrollsiffra därför aldrig skulle
hitta ett skadat personnummer. Argumentet är riktigt men ofullständigt:
samma korruption bryter också datumledet, som detektorn ändå kontrollerar.
Skäl 2 anger inte varför de två behandlas olika. Detta avsnitt anger
skillnaden. Beslut A ändras inte.

Skillnaden ligger i var felet uppstår:

```
KONTROLLSIFFRAN
  planteras felaktig med flit, i samtliga högar
    hög 1, ren      detektorn skulle hitta noll   ← kontrollgruppen förlorar sitt syfte
    hög 2, trasig   detektorn skulle hitta noll

DATUMLEDET
  planteras korrekt, skadas bara av korruptionen
    hög 1, ren      detektorn hittar allt         ← kontrollgruppen fungerar
    hög 2, trasig   87O514 hittas inte            ← detta ÄR mätningen
```

Ett krav på giltig kontrollsiffra skulle ge nollträff av konstruktionsskäl i
alla tre högarna, inklusive kontrollgruppen. Ett krav på giltigt datumled
ger full träff i hög 1 och missar i hög 2 — och de missarna är ett verkligt
maskningsfel som hög 2 finns till för att mäta.

Datumkontrollen behålls därför oförändrad, även i hög 2. Missarna som
korruptionen orsakar är ett mätresultat, inte en artefakt.

### C2 — tolvsiffriga personnummer

Beslut A anger tio siffror. Personnummer skrivs i svenska myndighetsdokument
i två former:

```
tiosiffrig    ÅÅMMDD-NNNN        890101-2384
tolvsiffrig   ÅÅÅÅMMDD-NNNN      19890101-2384
```

Med endast den tiosiffriga formen i spec skulle generatorn aldrig plantera
ett tolvsiffrigt nummer och detektorn aldrig leta efter ett. Mätningen skulle
visa hög träffsäkerhet medan verktyget i drift missar varje tolvsiffrigt
nummer, och riggen skulle till sin konstruktion inte kunna avslöja det. Detta
är den felkategori projektet finns till för att fånga.

Båda formerna planteras och detekteras. Formkontrollen gäller fortfarande
enbart form — kontrollsiffrans värde kontrolleras inte i någon av formerna.
Skiljetecknet mellan datumled och löpnummer är valfritt.

### C3 — kvot och redovisning

Kvoten för personnummer höjs från 200 till 400 per hög, jämnt delad:

| Form | Antal per hög |
|---|---|
| Tiosiffriga | 200 |
| Tolvsiffriga | 200 |

Precision per form: ±4,2 procentenheter vid frekvens kring 10 procent —
samma som personnummer hade före delningen. Hade kvoten stannat på 200 hade
varje form fått ±5,9 pe.

Kvoten för telefonnummer är oförändrad, 200 per hög.

Grund för den jämna delningen: Noas beslut. Det finns ingen mätning av hur
formerna fördelar sig i svenska myndighetsdokument. Lika fördelning valdes
för att båda formerna ska mätas med samma precision, inte för att spegla en
verklig frekvens. En viktad fördelning hade krävt ett tal utan underlag.

Resultat redovisas per form, aldrig sammanslaget — samma skäl som håller
förnamn och efternamn åtskilda.

---

## Tillägg E — format, matchning och statistik — 2026-08-22

Besluten nedan fattades **2026-08-22**, efter tillägget i commit f0961ef
men före all modulkod. De är låsta från och med detta tillägg.

En fullständig granskning av dokumentationen gjordes före byggstart. Den
hittade luckor som påverkar mätresultatet; detta avsnitt stänger dem.
Luckor som inte påverkar resultatet har flyttats till
[`byggspec.md`](byggspec.md).

### E1 — Telefonnummerformat

Tre skrivformer planteras och detekteras, jämnt fördelade över kvoten 200:

```
med skiljetecken     070-123 45 67
utan skiljetecken    0701234567
internationellt      +46701234567
```

Formkontroll, aldrig operatörskontroll: detektorn kontrollerar att strängen
ser ut som ett svenskt telefonnummer, inte om numret finns. Samma princip
som personnummer.

Grund för jämn fördelning: Noas beslut. Det finns ingen mätning av hur
formerna fördelar sig i svenska myndighetsdokument. Lika fördelning valdes
för att alla tre ska mätas lika, inte för att spegla en frekvens.

### E2 — Redovisningsnivå för format

Konfidensintervall redovisas per typ och per längdform, inte per
skrivvariant:

```
med CI          personnummer tiosiffriga     n=200   ±4,2 pe
                personnummer tolvsiffriga    n=200   ±4,2 pe
                telefonnummer                n=200   ±4,2 pe
                förnamn / efternamn          per namndel

utan CI         skrivvarianter inom en form (bindestreck, mellanslag,
                landskod) redovisas beskrivande — antal planterade och
                antal missade, som indikation
```

Skäl: CI per skrivvariant hade krävt att kvoten tredubblades. Beskrivande
redovisning är svagare men ärlig, och variationen finns kvar i korpusen.

### E3 — Personnummer, skrivvarianter och datumled

Båda längdformerna förekommer med och utan bindestreck:

```
890101-2384      8901012384
19890101-2384    198901012384
```

Datumledet kontrolleras som form: månad 01–12, dag 01–31. Ingen
skottårskontroll, ingen kalenderkontroll. Ett datum som 890231 accepteras
alltså av detektorn. Detta är avsiktligt: ett maskningsverktyg ska svärta
allt som ser ut som ett personnummer, och det billiga felet väljs framför
det dyra.

Samordningsnummer byggs inte i version ett. Känd begränsning: samordningsnummer
har dag +60 och förekommer i myndighetsdokument. Varken generator eller
detektor hanterar dem, och riggen kan därför inte mäta hur ofta de missas.
Detta är en blind fläck av samma slag som tolvsiffriga nummer var före
Tillägg C, och den redovisas i stället för att byggas bort.

### E4 — Lexikonmatchning

Lexikondetektorn matchar hela ord:

| Regel | Detalj |
|---|---|
| Skiftläge | Okänsligt — Bo, BO och bo behandlas lika |
| Ordgräns | Allt som inte är en bokstav |
| Följd | DE matchar **inte** i DESIGN |
| Följd | bo matchar i "att bo kvar" |
| Bindestreck | Anna-Karin matchas som två segment, Anna och Karin |
| Partiklar | von, af, de matchas **inte** som namn i version ett |

Ordgränsregeln avgör hur stor den förutsagda överflaggningen från BO, EK
och DE faktiskt blir, och måste därför stå före körningen.

### E5 — Korruption, exakt tillämpning

```
takt        30 % av samtliga planterade uppgifter i hög 2, samlat
            över alla typer — inte 30 % per typ
antal       högst en skada per planterad uppgift
plats       skadan träffar endast uppgiftens eget teckenspann,
            aldrig omgivande text
val         vilken uppgift som skadas avgörs av högens frö
```

Skäl till högst en skada: två skador på samma uppgift gör den oigenkännlig
även för en människa, och mätningen ska visa vad ett maskningsverktyg
missar, inte vad ingen kan läsa.

### E6 — Statistisk metod

Konfidensintervall beräknas med **Wilsons metod**. Skäl: den
normalapproximation som ligger bakom ±3-motiveringen uppför sig dåligt vid
låga frekvenser och nära noll, vilket är precis det område mätningen
väntas hamna i. Wilson ger intervall som håller sig inom 0–100 % och är
rätt även vid få träffar.

Överflaggning per 1000 tecken redovisas som punktvärde utan CI. Skäl: det
är ett kvotmått över hela korpusen och inte en andel av oberoende försök,
så samma intervallmetod gäller inte.

### E7 — Teckenkodning

```
kodning         UTF-8
normalisering   NFC, tillämpas på texten innan facit skrivs
radslut         LF
position        teckenindex i den normaliserade texten,
                inte byteindex
```

Skäl: facit och detektor måste räkna samma index på samma text. Utan
angiven normalisering kan å skrivas som ett tecken eller två, och alla
positioner efter det förskjuts.

### E8 — Namndel och ark

Generatorn registrerar i facit vilket av filterregelns fem ark varje
planterad namndel hämtades ur: efternamn, förnamn kvinnor, förnamn män,
tilltalsnamn kvinnor, tilltalsnamn män. Utan det kan M4 inte redovisa per
ark, eftersom samma sträng kan förekomma i flera ark.

### E9 — Rättelse av kollisionsspärren

[`filterregel.md`](filterregel.md) innehåller en spärr: ingen post ur
detektorns förutsagda överflaggningslista får förekomma i generatorns
kollisionslista. Den spärren är **felaktig** och gäller **inte**.

Skäl: BO och EK är de mest självklara svenska orden som också är namn. Att
förbjuda dem i hög 3 därför att M2 råkar innehålla dem är att modellera
detektorn, vilket den styrande regeln uttryckligen förbjuder. Spärren
skyddade mot fel sak.

**Gällande spärr:** generatorns kollisionslista får inte kopieras ur eller
härledas ur detektorns lexikon eller ur filterregel.md. Den härleds ur
svenska ord som råkar vara namn. Att listorna överlappar är oundvikligt
och korrekt, av samma skäl som namnpoolen tillåts överlappa.

filterregel.md ändras inte — den är commitad och rättas här.

### E10 — Tal utan mätunderlag

Följande tal är Noas beslut utan mätunderlag och redovisas som sådana, i
samma anda som korruptionstakten 30 %:

| Tal | Var | Grund |
|---|---|---|
| 6–8 meningsmallar per dokumenttyp | Beslut B | Noas beslut. Tillräckligt för variation, byggbart på tillgänglig tid. |
| Tre dokumenttyper | Beslut B | Noas beslut. Täcker ansökan, anteckning och beslut som vanliga former. |
| 1000 tecken som nämnare | Matchningsregeln | Noas beslut. Konventionell skala, inte härledd. |
| Tre mätuppsättningar | Mätuppsättningar | Följer av att två detektorer jämförs var för sig och tillsammans. |
| Jämn fördelning av telefonformer | E1 | Noas beslut, se E1. |
