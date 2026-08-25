## Börja här

Det här repot är ett förhandsregistrerat mätsystem för ett verktyg som maskar
personuppgifter i myndighetsdokument. Alla metodval som påverkar mätresultatet
låstes i git innan den första skarpa körningen gjordes; commit-historiken är
beviset för den ordningen.

Siffrorna från mätningen står i [`docs/gallande-varden.md`](docs/gallande-varden.md),
under avsnitten om överflaggning och i tabellen över gällande värden. Metodval
och låsningar finns i [`docs/forhandsregistrering.md`](docs/forhandsregistrering.md).

# maskning-matning

Verktyg som maskar personuppgifter i myndighetsdokument, och en mätrigg som
redovisar hur ofta det misslyckas mot ett känt facit.

Status: inga moduler är byggda. `verktyg/` innehåller ett granskningsskript.

## Ordning

Förhandsregistreringen (`docs/forhandsregistrering.md`) skrivs och commitas
INNAN någon modul byggs. Commit-tidsstämpeln är beviset för att
matchningsregeln och kvoterna låstes före första körningen.

Ingen historikomskrivning. Ingen squash. Ingen force-push.

## Mappar

| Mapp | Innehåll |
|---|---|
| docs/ | Förhandsregistrering och masterdokument |
| verktyg/ | Skript utanför mätkedjan; `kollisionskalla/` med råmaterial för hög 3 |
| generator/ | M1 — syntetiska dokument med facit; `kollisionslista.md` för hög 3 |
| detektor/ | M2 — mönster- och lexikondetektor |
| regelmotor/ | M3 — regel-id och hash |
| matning/ | M4 — poängsättning mot facit |
| test/ | Tester, inklusive spärr mot import över modulgräns |
| cli/ | Ingång från terminalen |

Ingen delad lib/. Generatorn och detektorerna delar ingen kod och inga listor.

## Dokumentationens tre filer

| Fil | Roll |
|---|---|
| `docs/forhandsregistrering.md` | Append-only. Låser det som påverkar mätresultatet. |
| `docs/gallande-varden.md` | Vilka värden som gäller nu vid konflikt mellan avsnitt. |
| `docs/byggspec.md` | Hur modulerna byggs. Får ändras fritt. |

## Licens och källor

Namnmaterial härleds ur SCB:s namnstatistik. Bearbetningen är vår egen;
SCB ansvarar inte för den och anges därför inte som källa till de härledda
listorna. Detaljer i förhandsregistreringen.

## Körmiljö — kända fällor

Upptäckt under uppsättningen. Skrivs här för att nästa session inte ska
behöva upptäcka dem igen.

| Fälla | Gör så här i stället |
|---|---|
| `sha256sum` finns inte på macOS. Under `set -e` avbryter skriptet mitt i. | `shasum -a 256` |
| `grep` är ugrep på den här maskinen. Långa teckenklassrepetitioner som `[^<>]{0,120}` över UTF-8 spräcker komplexitetsgränsen och hänger tills kommandot timar ut. | Textutvinning ur HTML och XML görs i Python, inte med `grep -oE`. |
| `set -euo pipefail` avbryter **inte** vid fel på den här maskinen. Skalet rapporterar errexit som påslaget, och `$-` innehåller `e`, men körningen fortsätter ändå efter ett kommando som avslutar med kod skild från noll. | Avsluta varje kontroll med `|| { echo "AVBRYT: <skäl>"; exit 1; }`. Alternativt: lägg skriptet i en fil och kör `zsh skript.sh` — i en riktig subshell fungerar `set -e` som avsett. |
| zsh har MULTIOS påslaget. Konstruktionen `2>&1 >/dev/null` omdirigerar inte — den **duplicerar** utdata till flera mål. En kontroll av vilken ström en rad hamnar på ger då fel svar: samma rad syns på båda. | Fånga strömmarna i separata filer: `kommando >/tmp/ut.txt 2>/tmp/fel.txt` och läs dem var för sig. |

Samma mönster gäller MULTIOS-fällan: ett kommando som ser ut att göra en sak och gör en annan, och där felet inte syns förrän någon letar efter det.

Detta är den farligaste av de tre fällorna, av samma skäl som gäller de andra två:
skyddet ser ut att fungera.

Varje verifieringsskript i det här projektet har inletts med `set -euo pipefail` och
avslutat med en commit. Avbrottsvillkoren däremellan har varit verkningslösa. Att
ingenting felaktigt commitades beror på att exekveraren stannade manuellt vid varje
utslag, inte på att skriptet hindrade det.

Ett skript som ser säkert ut men inte är det är sämre än ett som uppenbart saknar
skydd, eftersom ingen letar efter felet.

Regeln i avsnittet Arbetsregel — avbrottsvillkor gäller oförändrat: ett exit 1 stoppar
arbetet, alltid. Skillnaden är att stoppet nu måste skrivas ut för hand efter varje
kontroll, aldrig antas följa av `set -e`.

Den andra fällan är den farliga: ett hängt mönster ger tom utdata, och ett
skript som avbryter på "tomt resultat" avbryter då av **rätt utfall men fel
orsak**. Skript i det här repot ska skilja på "hittade inget" och
"kommandot fungerade inte".

## Arbetsregel — avbrottsvillkor

Ett verifieringsskript som avslutar med kod 1 stoppar arbetet. Alltid. Code
rapporterar och väntar; ingen commit sker. Detta gäller även när orsaken vid
närmare granskning visar sig vara falsk — rätt åtgärd är då att laga
kontrollen, inte att gå runt den. Ett avbrottsvillkor som ibland ignoreras är
inget avbrottsvillkor.

Fyra kontroller har hittills fällt på form i stället för sak (radbrytning,
fetstil, kodmarkering, kolumnjustering). Framtida innehållsgranskning sker via
`verktyg/granska-dokument.py`, som normaliserar text innan jämförelse.
