# Resultat — skarp mätning på frö skarp-2026-08-24

Denna commit binder frysningen enligt Tillägg E. Talen nedan gäller och ändras
inte. Rättas ett fel i koden härefter är det en ny körning på ett nytt frö, med
ett eget resultatdokument; detta upphävs inte utan står kvar bredvid.

    frö                skarp-2026-08-24
    kod                aa495be68ada665257f624c5f163497871239ab4
    checksumma M4      1dd600532b6d26109c089a86b742c18292808287d586d6e5053780123582da4f

Fröet är hämtat ordagrant ur [`docs/fro.md`](docs/fro.md), som commitades före
körningen och innehåller inga resultat. Koden är den commit som låg på disk när
körningen gjordes, verifierad mot `git rev-parse HEAD` innan mätningen startade.

## Hur talen togs fram

Tre högar genererades ur samma frö och detekterades var för sig:

    node cli/generera.js skarp-2026-08-24 1
    node cli/generera.js skarp-2026-08-24 2
    node cli/generera.js skarp-2026-08-24 3
    node cli/detektera.js arbetsyta/hog1-skarp-2026-08-24
    node cli/detektera.js arbetsyta/hog2-skarp-2026-08-24
    node cli/detektera.js arbetsyta/hog3-skarp-2026-08-24
    node cli/mat.js skarp-2026-08-24

Hög 1 är ren text. Hög 2 är samma plantering med OCR-skada. Hög 3 är en egen
korpus där vanliga ord som också är efternamn planterats som kollisionsord.

Fyra spärrar gick före mätningen, alla med utskrivet antal granskade enheter:
arbetsträdet var rent, facit innehöll 1000 poster per hög med kvoterna 400
personnamn, 400 personnummer och 200 telefonnummer, varje facitposition
kontrollerades mot dokumenttexten, och avstämningsspärren krävde att M4
redovisade 1000 av 1000 poster i varje hög. Facit är listan över var varje
planterad uppgift finns i texten; en position som inte pekar på den strängen
gör hela mätningen meningslös, och därför granskas alla 1000 per hög.

Under mätningen uteslöts 10 av 400 namnposter i hög 1 från
bindestreck-jämförelsen. Det står i utskriften som implementationsverifiering.

## Dokumentens egenskaper

Hög 1 och hög 2 består av 273 dokument vardera, hög 3 av 331. Dokumenten följer
myndighetsform: rubrik, diarienummer, beslutsdatum, formalia, och därefter
brödtext i avsnitten bakgrund, skäl och beslut. Personuppgifter planteras endast
i formalia. Varje beslutsdokument har exakt en sökande.

Diarienummer och beslutsdatum är dekoration. De står inte i facit och räknas
varken som träff eller som överflaggning.

Att brödtexten saknar personuppgifter är avsiktligt. Utan den hade
överflaggningen mätts i ett gynnsamt fall där nästan all text bär planterade
uppgifter och det knappt finns något att flagga fel på.

## Resultat

Andel full träff per undertyp, mätuppsättning union.

| Undertyp | n hög 1 | Hög 1 ren | Hög 2 skadad | Hög 3 kollision |
|---|---|---|---|---|
| personnummer tiosiffriga | 200 | 100.0 % | 69.0 % | 100.0 % |
| personnummer tolvsiffriga | 200 | 100.0 % | 65.0 % | 100.0 % |
| telefonnummer med skiljetecken | 67 | 100.0 % | 64.2 % | 100.0 % |
| telefonnummer utan skiljetecken | 67 | 100.0 % | 80.6 % | 100.0 % |
| telefonnummer internationellt | 66 | 100.0 % | 71.2 % | 100.0 % |
| personnamn efternamn | 100 | 48.0 % | 36.0 % | 33.3 % |
| personnamn förnamn kvinnor | 100 | 83.0 % | 68.0 % | 78.2 % |
| personnamn förnamn män | 106 | 92.5 % | 67.9 % | 87.5 % |
| personnamn tilltalsnamn kvinnor | 45 | 84.4 % | 60.0 % | 72.7 % |
| personnamn tilltalsnamn män | 49 | 81.6 % | 59.2 % | 100.0 % |

Hög 3 har egna n per undertyp, eftersom 200 av dess 400 namnposter är
kollisionsord. Kolumnen n gäller hög 1 och hög 2, som delar plantering.
Talet 100.0 % för tilltalsnamn män i hög 3 vilar på n=19 och bär därför
knappt någon precision alls.

De två mätuppsättningarna delar arbetet helt. Mönster tar samtliga
personnummer och telefonnummer och noll namn. Lexikon tar samtliga namn och
noll nummer. Unionen är därför summan av två icke-överlappande detektorer,
inte två som konkurrerar om samma poster.

Efternamn är sämst av alla undertyper i alla tre högarna. I den rena högen
hittas mindre än hälften.

## Estimandet — parad differens hög 1 mot hög 2

Parningen sker på plant_id, 1000 av 1000 poster parade.

| Mätuppsättning | delta | Tango 95 % | n01 | n10 |
|---|---|---|---|---|
| mönster | 18.8 pp | 16.5–21.3 pp | 188 | 0 |
| lexikon | 7.5 pp | 6.0–9.3 pp | 75 | 0 |
| union | 26.3 pp | 23.7–29.1 pp | 263 | 0 |

Talet n10 är noll i alla tre uppsättningarna. Ingen enda post som missades i den
rena högen träffades i den skadade. OCR-skadan är strikt monoton i detta
material: den kostar recall och räddar aldrig en miss.

## Överflaggning

Tecken flaggade utanför facit, mätuppsättning union.

| | tecken | per 1000 tecken | percentilintervall 95 % | spann |
|---|---|---|---|---|
| hög 1 | 81 | 0.316 | 0.174–0.483 | 27 |
| hög 2 | 81 | 0.316 | 0.174–0.483 | 27 |
| hög 3 | 750 | 2.669 | 2.341–3.017 | 191 |

Bootstrap över dokument, B=10000.

Hög 1 och hög 2 har identisk överflaggning: samma antal tecken, samma antal
spann, samma intervall. Det är ingen bugg utan följer av konstruktionen. Skadan
träffar bara planterade uppgifter, och de ligger per definition i facit.
Brödtexten, som all överflaggning kommer ur, är oförändrad mellan högarna.

Konsekvensen är att detta mått inte kan bära någon slutsats om OCR-skada.
Överflaggningen bär ingen information om skada, och delta på 26.3 pp är därför
en ren recall-effekt. Påståendet att skadad text skulle göra detektorn mer
aggressiv går inte att stödja på dessa tal, och görs inte här.

I mönsteruppsättningen ensam är överflaggningen 0.000 per 1000 tecken i samtliga
högar. Hela överflaggningen kommer från lexikonet.

## Kollisionsord — hög 3

32 unika kollisionsord planterades i 200 förekomster. Urvalet är handskrivet och
dras inte på fröet.

    ord där samtliga förekomster missades      6 av 32
    missade förekomster                        36 av 200
    delvis                                     0 av 200

Delvis räknas som miss i detta block. Ett ord träffas eller missas i alla sina
förekomster samtidigt i den mån detektorn är deterministisk, varför talen
redovisas som antal ord och antal förekomster, inte som andel med
konfidensintervall.

Överflaggningen i hög 3 är högre än i hög 1. Skillnaden
kan inte tillskrivas kollisionsorden. Korpusarna är olika och Tillägg O
förbjuder parad jämförelse
mellan högar som inte delar plantering. Att avgöra hur mycket av de 750 tecknen
som är kollisionsordens vanliga ord hade krävt att varje överflaggat spann
märktes med om strängen finns i kollisionslistan. Det är inte byggt.

## Vad detta inte säger

Talen gäller denna korpus, dessa detektorer och detta frö. De är inte ett
estimat av hur en maskningslösning beter sig på verkliga myndighetshandlingar.
Korpusen är syntetisk, namnen kommer ur en lista, och brödtexten är byggd av
ett fåtal meningsmallar.

Ett könsmönster syns i två av tre högar men bärs inte av intervallen. I hög 1 är
förnamn kvinnor 83.0 % med Wilson 74.5–89.1 mot förnamn män 92.5 % med Wilson
85.8–96.1. Intervallen överlappar. I hög 3 går skillnaden åt samma håll, 78.2 %
mot 87.5 %. I hög 2 försvinner den helt, 68.0 % mot 67.9 %. Detta könsmönster
var inte förhandsregistrerat och redovisas som icke-fynd. Det tas upp här för
att en läsare annars kan se det i tabellen och tro att det doldes; att nämna det
efteråt utan att ha nämnt det nu vore efterhandsletande.

Hög 3 kan inte paras mot hög 1 eller hög 2. plant_id är ett löpnummer inom en
hög, inte en global identitet. Spärren i parningen faller om det försöks.

Skillnaden mellan hög 1 och hög 3 i namnundertyperna blandar två saker:
kollisionsorden och att korpusen är en annan. Den ska inte läsas som en effekt
av kollisionsord.

## Reproducerbarhet

Ingen systemklocka används i generatorn. Födelseår och beslutsår läses som fasta
intervall ur [`docs/gallande-varden.md`](docs/gallande-varden.md). Samma frö ger
samma korpus oavsett när kommandona körs, vilket verifieras av testsviten.

M4:s utskrift ligger inte i repot. Checksumman överst i detta dokument är tagen
på den, och en omkörning på samma frö och samma kod ska ge en utskrift med samma
checksumma. Går det inte att återskapa den summan har något i kedjan ändrats,
och talen i detta dokument gäller inte längre den kod som körs.
