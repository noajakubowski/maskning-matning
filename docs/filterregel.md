# Filterregel för namnlistor

Reglerar vilka poster ur SCB:s namnmaterial som får ingå i detektorns
lexikon och i generatorns namnpool. Två separata listor, samma regel,
skilda skäl.

## Källa

| | |
|---|---|
| Fil | namn-med-minst-tva-barare-31-december-2022.xlsx |
| URL | https://www.scb.se/contentassets/9fe7dbb460994c72b835163dbc491ef9/namn-med-minst-tva-barare-31-december-2022.xlsx |
| sha256 | b099822f53baf393fc0dba8b2c8665b7475c3b2001b6efbbe1d96525709792e4 |
| Referenstid | 31 december 2022 |
| Status hos SCB | Uppdateras ej. SCB slutade producera namnstatistik från 2024. |
| Licens | CC BY. Materialet är bearbetat av oss; SCB anges därför inte som källa till de härledda listorna och ansvarar inte för bearbetningen. |

## Regel v1 — förkastad

> Varje bokstavssegment i posten (delat på bindestreck) ska vara minst två
> tecken och innehålla minst en vokal (a e i o u y å ä ö). Posten får inte
> innehålla kolon eller punkt.

Skäl vid införandet: ett svenskt namn har minst en stavelse. Regeln var
avsedd att utesluta initialer (A, A-C, J:R, A:SON) som förekommer som
registrerade namnposter och som annars matchar löptext.

### Utfall

Vokalkravet uteslöt riktiga registrerade namn:

| Post | Bärare, förnamn män | Bärare, tilltalsnamn män |
|---|---|---|
| MD | 1510 | 1361 |
| MHD | 1292 | 1202 |

Dessa är translittererade förkortningar av Muhammad, inte
parsningsartefakter. Uteslutningen är systematisk och träffar en
namntradition.

### Skäl till ändring

Regeln kastade bort verkliga namn. Ändringen görs före första skarpa
körningen och innan några värden är frysta. Längd- och kolonkravet
uteslöt redan allt brus som vokalkravet fångade; vokalkravet modellerade
latinsk ortografi, inte initialer.

Ingen specialregel eller vitlista införs för de uteslutna posterna. En
sådan skulle täcka de instanser som råkade synas i topp 1000 och dölja
att klassen kvarstår.

## Regel v2 — gällande

> Posten delas på bindestreck och mellanslag, inte på apostrof. Varje
> segment ska vara minst två tecken. Posten får inte innehålla kolon
> eller punkt.

Apostrofundantaget är avsiktligt: O'Brien får inte falla på segmentet O.

## Två listor, skilda skäl

| | Skäl |
|---|---|
| Detektorns lexikon | Hygien. En post som "A" matchar löptext, inte personer. |
| Generatorns namnpool | Verklighetsmodell. En initial skrivs i en handling som formatdrag, och ett enteckensspann är inte urskiljbart som facit. |

Reglerna sammanfaller i utfall men delar ingen kod och ingen fil.

## Känd förorening

Poster under tre tecken som passerar v2 stannar i lexikonet. De listas
nedan med bärarantal när räkningen är körd. De höjer överflaggningen.
Ingen åtgärd vidtas: överflaggning är det billiga felet och ska redovisas,
inte gömmas.

<!-- RESULTAT FYLLS I AV NÄSTA COMMIT -->
