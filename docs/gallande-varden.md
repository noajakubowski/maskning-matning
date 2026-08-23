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
| Överflaggning per 1000 tecken | punktvärde utan CI | Tillägg E | (inget) |
| Teckenkodning | UTF-8, NFC, LF | Tillägg E | ospecificerat tidigare |
| Kollisionsspärr | kopieringsförbud, inte överlappsförbud | Tillägg E | spärren i filterregel.md |
| Frysningen binder | vid commit av första M4-resultat på redovisat frö | Tillägg E | tabellhuvudets formulering rad 305 |
| Redovisning | per typ och längdform, aldrig sammanslaget | Tillägg C och E | "per typ" i grunddokumentet |
| Hög 3, namnkvotens fördelning | 200 kollisionsord, 200 vanliga namn | Tillägg F | ospecificerat tidigare |
| Kollisionslista | 32 ord, `generator/kollisionslista.md` | Tillägg G | 26 ord i Tillägg F |
| Årsled tolvsiffriga personnummer | 1900 till innevarande år | Tillägg I | 19xx eller 20xx jämnt fördelat i Tillägg H |
| Skiftläge vid plantering | inledande versal per segment | Tillägg H | ospecificerat tidigare |
| Parad jämförelse mellan högar | alla tre högarna parvis parade | Tillägg I | hög 1 mot hög 2 i Tillägg H |
| Mallplatser | lämnas aldrig tomma; mall väljs bara när kvot finns kvar för varje typ den har platshållare för | Tillägg I | ospecificerat tidigare |

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
