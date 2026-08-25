# Gällande värden

Förhandsregistreringen är append-only och ändras aldrig bakåt, så ett tidigt
avsnitt kan ange ett värde som ett senare tillägg har ersatt. Denna fil är den
enda platsen där gällande värden står samlade. Vid konflikt gäller det som står
här, med hänvisning till tillägget.

| Värde | Gäller nu | Satt i | Ersätter |
|---|---|---|---|
| Kvot namndelar per hög | 400 | grunddokumentet 1f30aee | (inget) |
| Kvot personnummer per hög | 400, delat 200 tiosiffriga och 200 tolvsiffriga | Tillägg C, f0961ef | 200 i grunddokumentet, rad 46–47, 56, 305 |
| Kvot telefonnummer per hög | 200, delat jämnt över tre skrivformer | Tillägg E | (inget) |
| Personnummerformer | tio- och tolvsiffriga, med och utan bindestreck | Tillägg C och E | enbart tiosiffriga i Beslut A, rad 353 |
| Telefonnummerformer | tre skrivformer | Tillägg E | ospecificerat tidigare |
| Datumled | månad 01–12, dag 01–31, ingen kalenderkontroll | Tillägg E | ospecificerat tidigare |
| Samordningsnummer | byggs inte, känd begränsning | Tillägg E | (inget) |
| Kontrollsiffra | kontrolleras inte | Beslut A, d14052e | (inget) |
| Lexikonmatchning | hela ord, skiftlägesokänsligt | Tillägg E | ospecificerat tidigare |
| Korruptionstakt | 30 % samlat, högst en skada per uppgift | Tillägg E förtydligar 1f30aee | (inget) |
| Konfidensintervall | Wilson, 95 % | Tillägg E | ospecificerat tidigare |
| Överflaggning per 1000 tecken | percentilintervall från klusterbootstrap på dokument, B = 10 000 | Tillägg L | punktvärde utan CI (Tillägg E) |
| Teckenkodning | UTF-8, NFC, LF | Tillägg E | ospecificerat tidigare |
| Kollisionsspärr | kopieringsförbud, inte överlappsförbud | Tillägg E | spärren i filterregel.md |
| Frysningen binder | vid commit av första M4-resultat på redovisat frö | Tillägg E | tabellhuvudets formulering rad 305 |
| Redovisning | per typ och längdform, aldrig sammanslaget | Tillägg C och E | "per typ" i grunddokumentet |
| Hög 3, namnkvotens fördelning | 200 kollisionsord, 200 vanliga namn | Tillägg F | ospecificerat tidigare |
| Kollisionslista | 32 ord, `generator/kollisionslista.md` | Tillägg G | 26 ord i Tillägg F |
| Årsled tolvsiffriga personnummer | 1900 till innevarande år | Tillägg I | 19xx eller 20xx jämnt fördelat i Tillägg H |
| Skiftläge vid plantering | inledande versal per segment | Tillägg H | ospecificerat tidigare |
| Parad jämförelse mellan högar | endast hög 1 mot hög 2; hög 3 har egen korpus och egen dragning, och delar varken dokument eller planterade värden med de andra | Tillägg O | alla tre högarna parvis parade i Tillägg I |
| Mallplatser | lämnas aldrig tomma; mall väljs bara när kvot finns kvar för varje typ den har platshållare för | Tillägg I | ospecificerat tidigare |
| Undertyp för telefonnummer | med skiljetecken, utan skiljetecken, internationellt | kontraktsrättelse före M2 | understrecksformerna |
| Flaggans struktur | bär aldrig undertyp för personnummer och telefon | byggspec, M2-avsnittet | ospecificerat tidigare |
| Träff | bedöms på spann, oavsett flaggans typ | Tillägg J | träff per typ i Tillägg E |
| Spannunion | över samtliga flaggor i en mätuppsättning | Tillägg J | union per typ i Tillägg E |
| Typförväxling | eget mått, redovisas per riktning, aldrig som miss eller överflaggning; redovisas fullt ut för alla typer där den kan uppstå; nedtoningen avser bara jämförelsen mellan de tre mätuppsättningarna | Tillägg J och K | ospecificerat tidigare |
| Överflaggning | tecken utanför samtliga facitspann oavsett typ | Tillägg J | per typ i Tillägg E |
| Överflaggningens nämnare | högens totala teckenantal | Tillägg K | ospecificerat tidigare |
| Parningsnyckel | plant_id; räckvidd inom EN hög, löpnummer per hög; parning giltig endast mellan högar som delar plantering, alltså hög 1 och hög 2 | Tillägg L och O | dokument-id och startposition i K |
| Saknat plant_id | stoppar körningen med felkod | Tillägg L | uteslutningsregeln i K |
| Parad differens | endast hög 1 mot hög 2; Tango score-intervall, 95 %, δ = (n01−n10)/n | Tillägg O | varje par av högar i Tillägg I och K |
| Hypotestest | ingår inte; n01, n10 och n01+n10 redovisas | Tillägg L | McNemar i K |
| Delvis träff | räknas som miss i binära beräkningar, redovisas alltid som egen kolumn | Tillägg L | ospecificerat tidigare |
| Överflaggningens osäkerhet | klusterbootstrap på dokument, B = 10 000, percentilintervall; antal spann redovisas | Tillägg L | punktvärde utan intervall i K |
| Kvotmotiveringens precision | talen i kvotmotiveringen avser ett aggregat som inte får redovisas; varje redovisad siffra bär sitt eget Wilson-intervall | Tillägg L | normalapproximationen i grunddokumentet |
| Hög 1, namn | implementationsverifiering, inte empiri; jämförelsen omfattar endast namndelar utan bindestreck, antalet uteslutna redovisas | Tillägg L och M | ospecificerat tidigare |
| plant_id | löpnummer inom den hög som genereras; tilldelas vid plantering, före korruption; inte en global identitet | Tillägg L och O | ospecificerat tidigare |
| Tillägg D | existerar inte; hänvisningar avser Tillägg E | Tillägg L | ospecificerat tidigare |
| M3 regelmotor | utgår ur version ett | Tillägg N | "byggs" i grunddokumentet |

## När frysningen binder

Dokumentet säger på rad 4–5 att frysta värden binder efter första körningen,
och på rad 305 att de binder efter den commiten. Den gällande läsningen är
den första, i enlighet med projektets styrande regel.

**Första skarpa körningen** definieras som det ögonblick då resultatet av en
M4-körning på en korpus med redovisat frö commitas till repot. Utvecklingskörningar
binder inte.

Definitionen knyts till en commit och inte en avsikt: en avsikt går inte att
granska i efterhand, en tidsstämpel gör det.

Tillägg C:s kvothöjning skedde före bindningen och var därför tillåten.

---

Filen uppdateras i samma commit som varje nytt tillägg som ändrar ett värde.

Ett ämne har exakt en rad. När ett tillägg ändrar ett värde **ändras** raden — en ny
rad läggs aldrig till vid sidan av den gamla. Det gamla värdet bevaras i kolumnen
Ersätter, inte som en egen rad.

Filen är repots konfliktlösare. Två rader för samma ämne gör den oanvändbar för
sitt enda syfte.

## Begränsning — hög 3 saknar attribution

Hög tre innehåller ord som fungerar både som personnamn och som vanliga ord i
löptext. Varje kollisionsord förekommer två gånger i samma dokument: en gång
planterat som namn och en gång som vanligt ord i brödtexten.

Den redovisade träffgraden för personnamn och kollisionsord avser endast
namnförekomsten. Om den andra förekomsten flaggas fel hamnar den i den samlade
överflaggningsmetriken tillsammans med all annan överflaggning, utan att kunna
särskiljas från den.

Överflaggningen är högre i hög tre än i hög ett, men skillnaden kan inte
tillskrivas kollisionsorden. Korpusarna skiljer sig åt, och Tillägg O förbjuder
parad jämförelse mellan högar som inte delar samma plantering. Talen för
respektive hög står i avsnittet om överflaggning.

Att kunna säga hur mycket av överflaggningen som kommer från kollisionsordens
vanliga ord hade krävt att varje överflaggat spann märktes med om strängen finns
i kollisionslistan. Det är inte byggt — tiden räckte inte.

## Förkastad körning — skarp-2026-08-24

Körningen på fröet skarp-2026-08-24 gjordes innan M4:s utskriftsfel var rättat.
Felet var att utskriften redovisade färre poster än facit innehöll, eftersom
blockordningen byggde på en hårdkodad lista som saknade en undertyp. Själva
beräkningen var korrekt; redovisningen var det inte.

Körningen förkastas i sin helhet. Den är inte frusen och inga värden ur den
gäller. En ny skarp körning görs på rättad kod; frö anges i den körningens
resultat.

Rättningen är verifierad genom att en post medvetet tappades i koden, varpå
avstämningsspärren avbröt körningen med felkod och namngav det saknade blocket.
