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
| Terminalutskrift — innehåll | öppet — avgörs vid bygget |
| Ordning | öppet — avgörs vid bygget |
| Frö och korpusbeskrivning | ska visas; exakt format öppet — avgörs vid bygget |
| Differens mellan två högar | beräknas parat; märks som parad i utskriften (Tillägg H, I) |

---

## Termen union

Ordet används på två sätt i förhandsregistreringen och ska hållas isär i
koden:

```
detektorunion   flaggor från mönster och lexikon slås ihop
                — hör till mätuppsättningen "union"

spannunion      överlappande flaggor inom samma typ slås ihop
                innan de jämförs mot facit
```

Spannunion sker **alltid per typ** och **aldrig** över typgränser.
