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

## Utfall v2, rå terminalutskrift

```
REGEL v2: delning på bindestreck OCH mellanslag (ej apostrof),
          segment >= 2 tecken, ingen kolon eller punkt

========================================================================
ARK: Efternamn

-- topp 1000 --
  uteslutna ............. 0
  TÄCKNING EFTER FILTER . 47.72 %   (före: 47.72 %)
  KÄND FÖRORENING, poster under 3 tecken som passerar: 5
    KVAR 'EK'                 8764
    KVAR 'LI'                 2528
    KVAR 'LE'                 1545
    KVAR 'WU'                 1149
    KVAR 'XU'                 1023

-- topp 5000 --
  uteslutna ............. 0
  TÄCKNING EFTER FILTER . 62.32 %   (före: 62.32 %)
  kontroll 'MD'            8  BEHÅLLS
  kontroll 'BO'           17  BEHÅLLS
  kontroll 'MY'            2  BEHÅLLS
  kontroll 'LI'         2528  BEHÅLLS
  kontroll 'ED'          236  BEHÅLLS
  kontroll 'UR'            2  BEHÅLLS

========================================================================
ARK: Förnamn kvinnor

-- topp 1000 --
  uteslutna ............. 2
  TÄCKNING EFTER FILTER . 85.06 %   (före: 85.08 %)
    UT  'M'                  1170  (segment under 2 tecken)
    UT  'A'                   942  (segment under 2 tecken)
  KÄND FÖRORENING, poster under 3 tecken som passerar: 4
    KVAR 'MY'                10664
    KVAR 'LO'                 4271
    KVAR 'LI'                 3529
    KVAR 'DE'                 1241

-- topp 5000 --
  uteslutna ............. 18
  TÄCKNING EFTER FILTER . 93.41 %   (före: 93.45 %)
  kontroll 'MD'            4  BEHÅLLS
  kontroll 'MHD'          34  BEHÅLLS
  kontroll 'BO'          281  BEHÅLLS
  kontroll 'MY'        10664  BEHÅLLS
  kontroll 'LI'         3529  BEHÅLLS
  kontroll 'ED'            7  BEHÅLLS
  kontroll 'VY'          126  BEHÅLLS
  kontroll 'UR'           34  BEHÅLLS

========================================================================
ARK: Förnamn män

-- topp 1000 --
  uteslutna ............. 2
  TÄCKNING EFTER FILTER . 86.90 %   (före: 86.93 %)
    UT  'M'                  1726  (segment under 2 tecken)
    UT  'A'                  1238  (segment under 2 tecken)
  KÄND FÖRORENING, poster under 3 tecken som passerar: 3
    KVAR 'BO'                85448
    KVAR 'LO'                 1575
    KVAR 'MD'                 1510

-- topp 5000 --
  uteslutna ............. 20
  TÄCKNING EFTER FILTER . 94.62 %   (före: 94.68 %)
  kontroll 'MD'         1510  BEHÅLLS
  kontroll 'MHD'        1292  BEHÅLLS
  kontroll 'BO'        85448  BEHÅLLS
  kontroll 'MY'           23  BEHÅLLS
  kontroll 'LI'          160  BEHÅLLS
  kontroll 'ED'          162  BEHÅLLS
  kontroll 'VY'           12  BEHÅLLS
  kontroll 'UR'          172  BEHÅLLS

========================================================================
ARK: Tilltalsnamn kvinnor

-- topp 1000 --
  uteslutna ............. 0
  TÄCKNING EFTER FILTER . 82.26 %   (före: 82.26 %)
  KÄND FÖRORENING, poster under 3 tecken som passerar: 3
    KVAR 'MY'                 6418
    KVAR 'LO'                 2011
    KVAR 'LI'                 1395

-- topp 5000 --
  uteslutna ............. 0
  TÄCKNING EFTER FILTER . 92.88 %   (före: 92.88 %)
  kontroll 'BO'           65  BEHÅLLS
  kontroll 'MY'         6418  BEHÅLLS
  kontroll 'LI'         1395  BEHÅLLS
  kontroll 'ED'            3  BEHÅLLS
  kontroll 'VY'           29  BEHÅLLS
  kontroll 'UR'            5  BEHÅLLS

========================================================================
ARK: Tilltalsnamn män

-- topp 1000 --
  uteslutna ............. 0
  TÄCKNING EFTER FILTER . 84.70 %   (före: 84.70 %)
  KÄND FÖRORENING, poster under 3 tecken som passerar: 3
    KVAR 'BO'                35872
    KVAR 'MD'                 1361
    KVAR 'LO'                  521

-- topp 5000 --
  uteslutna ............. 3
  TÄCKNING EFTER FILTER . 94.33 %   (före: 94.34 %)
  kontroll 'MD'         1361  BEHÅLLS
  kontroll 'MHD'        1202  BEHÅLLS
  kontroll 'BO'        35872  BEHÅLLS
  kontroll 'MY'            8  BEHÅLLS
  kontroll 'LI'           71  BEHÅLLS
  kontroll 'ED'          103  BEHÅLLS
  kontroll 'VY'            4  BEHÅLLS
  kontroll 'UR'            8  BEHÅLLS
```

