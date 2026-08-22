# verktyg/

Skript som inte tillhör någon modul och ligger utanför mätkedjan.

| Fil | Syfte |
|---|---|
| `granska-dokument.py` | Granska markdown mot innehållskrav med normaliserad textsökning |

## Spärr

Ingen kod i `generator/`, `detektor/`, `regelmotor/` eller `matning/` får
importera härifrån vid körning. Verktygen körs för hand, aldrig som del av en
mätning. Testet som fäller bygget vid överträdelse byggs tillsammans med M1.

## Planerat

Skriptet som delar SCB-registret i generatorns och detektorns namnlistor
placeras här när M1 påbörjas — det rör båda modulerna och får därför inte bo
i någon av dem.
