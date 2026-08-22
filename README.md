# maskning-matning

Verktyg som maskar personuppgifter i myndighetsdokument, och en mätrigg som
redovisar hur ofta det misslyckas mot ett känt facit.

Status: repot är nyss skapat. Ingen kod är skriven.

## Ordning

Förhandsregistreringen (`docs/forhandsregistrering.md`) skrivs och commitas
INNAN någon modul byggs. Commit-tidsstämpeln är beviset för att
matchningsregeln och kvoterna låstes före första körningen.

Ingen historikomskrivning. Ingen squash. Ingen force-push.

## Mappar

| Mapp | Innehåll |
|---|---|
| docs/ | Förhandsregistrering och masterdokument |
| generator/ | M1 — syntetiska dokument med facit |
| detektor/ | M2 — mönster- och lexikondetektor |
| regelmotor/ | M3 — regel-id och hash |
| matning/ | M4 — poängsättning mot facit |
| test/ | Tester, inklusive spärr mot import över modulgräns |
| cli/ | Ingång från terminalen |

Ingen delad lib/. Generatorn och detektorerna delar ingen kod och inga listor.

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
