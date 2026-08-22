# Kollisionslistans ursprung

Hög 3 kräver ord som är både vanliga svenska ord och registrerade
personnamn. Den styrande regeln säger att listan ska härledas ur svenskt
språkbruk, aldrig ur detektorns lexikon eller ur namnregistret.

Varken Claude eller Cursor kunde göra den härledningen bevisbart: båda
hade läst `docs/filterregel.md`, inklusive den förutsagda
överflaggningslistan, i samma session. Ett påstående om oberoende hade
inte gått att granska.

Listan härleddes därför av en lokal språkmodell utan tillgång till något
projektmaterial. Prompterna och de råa svaren är bevarade ordagrant i
denna mapp.

| Fil | Innehåll |
|---|---|
| prompt-1.txt | Första prompten, ordagrant |
| svar-1.txt | Modellens råa svar, ordagrant |
| prompt-2.txt | Andra prompten |
| svar-2.txt | Andra svaret |
| prompt-3.txt | Tredje prompten |
| svar-3.txt | Tredje svaret |
| prompt-4.txt | Fjärde prompten |
| svar-4.txt | Fjärde svaret |

## Vad som hände

Första försöket gav 60 numrerade poster men **27 unika ord av 60 poster**
— resten var **åtta ord i cykel från post 34**. Flera poster var inte
personnamn. Modellen var för liten för uppgiften som ställd.

Andra och tredje prompten var kortare och ställde ett kriterium i taget.
De gav användbara ord.

Fjärde prompten gav ord som modellen redan nämnt. Modellen följde inte
prompt 4:s uteslutningslista utan gav tillbaka ord den redan nämnt:
Fält, Lund, Skog, Sjö.

Att det första försöket misslyckades redovisas i stället för att döljas.
Vilken modell och version som användes fylls i av Noa nedan.

MODELL: ej angivet
VERSION: ej angivet
DATUM: 2026-08-22

## Lexikontrösklar

Strykning skedde bland annat mot ordets eget arks lexikontröskel — inte
mot den strängaste tröskeln:

| Ark | Tröskel (bärare) |
|---|---|
| Efternamn | 955 |
| Förnamn kvinnor | 778 |
| Förnamn män | 723 |
| Tilltalsnamn kvinnor | 460 |
| Tilltalsnamn män | 419 |

Ett ord som inte når tröskeln i sitt ark kan inte utlösa en flagga i hög
3 och ströks därför ur listan.

## Känd försvagning av oberoendet (prompt 4)

Den fjärde prompten formulerades **efter** att lexikontrösklarna var
uträknade, och bad om efternamn som "minst några tusen personer" bär. Den
som skrev prompten kände alltså till ungefär var tröskeln låg. Oberoendet
är svagare för ord som kom ur den fjärde omgången (Ström, Gran, Ljung,
Mark, Sköld) än för ord från tidigare omgångar. Se Tillägg F3 i
`docs/forhandsregistrering.md`.

## Urvalsregel

Ur de råa svaren har ord endast STRUKITS, aldrig lagts till. Varje ord i
den slutliga kollisionslistan går att hitta ordagrant i något av
svarsfilerna i denna mapp.
