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
