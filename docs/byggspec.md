# Byggspec

Förhandsregistreringen låser det som påverkar mätresultatet och dateras.
Denna fil beskriver hur modulerna byggs och får ändras fritt under bygget,
eftersom inget här påverkar vad som mäts. Ändras något här som visar sig
påverka resultatet ska det flyttas till ett tillägg i förhandsregistreringen.

---

## Facitets struktur

Per planterad uppgift:

| Fält | Innehåll |
|---|---|
| plant_id | Tilldelas vid plantering, före all högbehandling; stabil identifierare i facit (Tillägg L) |
| dokument-id | Identifierare inom högen |
| typ | personnummer, telefonnummer, personnamn |
| undertyp eller ark | längdform, skrivform, eller filterregel-ark |
| startposition | teckenindex, inklusive |
| slutposition | teckenindex, exklusive |
| ursprunglig sträng | text före korruption |
| skadad sträng | text efter korruption, om skada skett |
| korruptionstyp | typ av skada, om skada skett |

Positioner i teckenindex i NFC-normaliserad text.

Serialiseras som JSON, ett facit per hög.

---

## Filnamn och katalogstruktur

öppet — avgörs vid bygget

---

## Hur mallar itereras

Fördelningen av kvoter över dokument och mallar ska vara **deterministisk
per frö** och redovisas i utskriften.

| Parameter | Status |
|---|---|
| Hur kvoten fördelas över dokument och mallar | öppet — avgörs vid bygget |
| Dokumentens längd | öppet — avgörs vid bygget |
| Hur många mallar per dokument | öppet — avgörs vid bygget |

---

## Hög 3 — kollisionslistans konstruktion

| Parameter | Beskrivning |
|---|---|
| Urvalskriterium | Svenska ord som också är registrerade namn |
| Ungefärlig storlek | öppet — avgörs vid bygget |
| Dubbelförekomst | Kollisionsordet ska förekomma minst två gånger i samma dokument — en gång som namn, en gång som vanligt ord |
| Källa | Listan skrivs för hand ur svenskt språkbruk, aldrig genereras ur namnregistret eller detektorns lexikon |

---

## M2 — detektorns utdata

### Flaggan struktur

En flagga är ett påstående om att ett teckenspann innehåller en
personuppgift. Den bär:

| Fält | Innehåll |
|---|---|
| dokument-id | Identifierare inom högen |
| startposition | teckenindex, inklusive |
| slutposition | teckenindex, exklusive |
| typ | personnummer, telefonnummer, personnamn |
| detektor | monster, lexikon |
| ark | endast för lexikonträffar: vilket ark i lexikon.json som matchade, angivet med strängen ur arknamn |

En flagga bär **aldrig undertyp** för personnummer och telefonnummer.
Detektorn vet inte om det den hittade är tio- eller tolvsiffrigt, eller vilken
skrivform ett telefonnummer har — den har bara matchat en form. Låter man
detektorn ange undertyp bygger man in kunskap den inte kan ha. M4 avgör
undertypen genom att jämföra flaggan mot facit.

För personnamn är ark däremot legitimt: det är detektorns egen lexikonstruktur,
inte information om vad som planterades.

### Var flaggorna skrivs

En fil per hög och mätuppsättning, parallellt med facit.json i högens katalog:

```
flaggor-monster.json
flaggor-lexikon.json
```

Unionsuppsättningen beräknas av M4 ur de två och skrivs **inte** av M2 —
annars finns samma information på två ställen och kan glida isär.

Toppnivån speglar facit: seed, hogtyp, meta med antal flaggor, och en lista
flaggor.

### M2 läser aldrig facit

Projektets viktigaste spärr. M2 får läsa högens textfiler och
detektor/namn/lexikon.json — ingenting annat i högens katalog.

Spärren ska finnas som ett test som fäller bygget. Den kontrolleras
strukturellt med verktyg/granska-kod.js, inte med textsökning.

Den befintliga spärren i test/m1.test.js testar bara riktningen
generator → detektor. Den omvända riktningen, detektor → facit, saknas och
byggs tillsammans med M2.

---

## M3 — minimal regelmotor

| Parameter | Status |
|---|---|
| Regel-id per flagga | öppet — avgörs vid bygget |
| Hash — beräknas över | öppet — avgörs vid bygget |
| Koppling till M2:s utdata | öppet — avgörs vid bygget |
| Koppling till M4:s inläsning | öppet — avgörs vid bygget |

---

## M4 — utdataformat

| Parameter | Status |
|---|---|
| Regelkälla | `docs/gallande-varden.md`, inte grunddokumentets matchningsavsnitt (Tillägg K, L) |
| Terminalutskrift — innehåll | frö, högtyp, antal dokument, antal facitposter; per typ: full träff, delvis, miss, typförväxling per riktning, överflaggning absolut och per 1000 tecken med percentilintervall; Wilson-intervall där det är en proportion (Tillägg K, L) |
| Ordning | öppet — avgörs vid bygget |
| Differens mellan två högar | Tango score-intervall, 95 %, för varje par av högar; märks som parad i utskriften (Tillägg H, I, L) |
| Parningsnyckel | plant_id; saknat plant_id stoppar körningen med felkod (Tillägg L) |
| Parad differens — utskrift | n01, n10 och n01+n10 skrivs alltid ut (Tillägg L) |
| Hypotestest | inget p-värde beräknas (Tillägg L) |
| Delvis träff | räknas som miss i binära beräkningar; redovisas i egen kolumn (Tillägg L) |
| Spannunion | beräknas över samtliga flaggor i en mätuppsättning, inte per typ (Tillägg J) |
| Träffar och missar | grupperas efter facitets typ, inte flaggans (Tillägg J) |
| Typförväxling | räknas per riktning; redovisas i egen kolumn; fullt ut för alla typer där den kan uppstå (Tillägg J, K) |
| Överflaggningens nämnare | högens totala teckenantal (Tillägg K) |
| Överflaggningens osäkerhet | klusterbootstrap på dokument, B = 10 000, percentilintervall; antal spann redovisas (Tillägg L) |
| Hög 1, namn | märks som implementationsverifiering (Tillägg L) |

**M1 före M4:** generatorn måste tilldela `plant_id` i facit. Det kräver en
ändring i generatorn och i facitets fältuppsättning, som byggs i egen omgång före
M4.

---

## Termen union

Ordet används på två sätt i förhandsregistreringen och ska hållas isär i
koden:

```
detektorunion   flaggor från mönster och lexikon slås ihop
                — hör till mätuppsättningen "union"

spannunion      överlappande flaggor slås ihop till ett spann
                innan de jämförs mot facit
```

Spannunion beräknas över **samtliga** flaggor i en mätuppsättning och
**aldrig** per typ (Tillägg J). Detektorunion och spannunion ska hållas
isär: detektorunion slår ihop mönster och lexikon; spannunion slår ihop
överlappande flaggspann oavsett typ.
