# Frö för den skarpa körningen

Detta dokument commitas FÖRE körningen och innehåller inga resultat.

    frö    skarp-2026-08-24

Tillägg E anger att frysningen binder när ett M4-resultat på redovisat
frö commitas till repot, och att utvecklingskörningar inte binder.

Fröet låses här, i en egen commit, innan någon skarp körning har skett.
Nästa commit som innehåller M4:s utskrift på detta frö är den som binder
frysningen.

## Varför fröet commitas separat

Ett frö som väljs efter att resultaten är kända kan väljas för att ge
snygga siffror. Att fröet ligger i en egen commit med egen tidsstämpel,
före den commit som innehåller utfallet, gör det påståendet
kontrollerbart i stället för bara utsagt. Det är samma konstruktion som
bär förhandsregistreringen.

## Körning

    node cli/generera.js skarp-2026-08-24 1
    node cli/generera.js skarp-2026-08-24 2
    node cli/generera.js skarp-2026-08-24 3
    node cli/detektera.js arbetsyta/hog1-skarp-2026-08-24
    node cli/detektera.js arbetsyta/hog2-skarp-2026-08-24
    node cli/detektera.js arbetsyta/hog3-skarp-2026-08-24
    node cli/mat.js skarp-2026-08-24

## Tidigare frön

Följande har använts i utvecklingskörningar och binder ingenting:
test42, kodgranskning, strukturkoll, kontrakt, efterkontrakt, plantid,
determinism, annatfro, m2koll, m2commit, m4kontrakt, m4koll, estimand.
