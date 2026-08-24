# Referensfixturer för intervallmetoder

Intervall räknade av en OBEROENDE källa, som M4:s egen implementation
testas mot. Byggs av exekveraren, aldrig av modellkod, och läses endast
av tester — aldrig av något i mätkedjan.

## Vad som är validerat och vad som inte är det

| Metod | Referens | Status |
|---|---|---|
| Wilson | statsmodels.stats.proportion.proportion_confint | ÄKTA oberoende referens |
| Tango score | PropCIs::scoreci.mp i R | ÄKTA oberoende referens |

Wilson-värdena kommer ur ett publicerat, granskat bibliotek skrivet av
andra. En avvikelse mellan M4 och dessa tal är ett fel i M4.

Tango-värdena kommer ur R-paketet PropCIs, skrivet av en annan författare
i ett annat språk. En avvikelse mellan M4 och dessa tal är ett fel i M4.

## TECKENKONVENTION — läs innan du rör Tango-värdena

`scoreci.mp(n01, n10, n)` ger intervallet för **(n10 − n01)/n**.
Tillägg L2 definierar delta som **(n01 − n10)/n**. Tecknet är alltså
inverterat, och värdena i fixturen är `[-hi, -lo]` av R:s utdata.

Bevis: spegelparet ger exakta spegelintervall.

    scoreci.mp(60, 20, 1000)  ->  [-0,0584; -0,0231]
    scoreci.mp(20, 60, 1000)  ->  [+0,0231; +0,0584]

De symmetriska fallen (0,0), (30,30) och (5,5) ligger centrerade kring
noll, vilket visar att det är en teckenvändning och inte en förskjutning.

Byggs fixturen rakt av från R får varje parad differens i M4 fel tecken.
Intervallet blir korrekt brett, korrekt centrerat, ligger inom rätt
område och innehåller punktskattningen — varje rimlighetskontroll
passerar. Rapporten hade sagt att OCR-skada gör detektorn bättre.

## Kandidat för Tango-referens

R-paketet PropCIs, funktionen `scoreci.mp()`, är Tango (1998) direkt, av
en annan författare i ett annat språk. Enda riktiga referensen som
identifierats.

Undersökt och förkastat lokalt: `statsmodels.stats.contingency_tables`
har bara McNemars test, inget intervall. `confint_proportions_2indep` är
för oberoende stickprov. `_confint_riskratio_paired_nam` är parad men
ger riskkvot, inte differens. `scipy.stats` har inget relevant.

## Om ingen referens hittas

Täckningssimulering får bära ensam: många parade stickprov med känt
delta, och kontroll av att intervallet täcker det sanna värdet i omkring
95 procent av fallen. Det validerar att metoden beter sig som ett
95-procentigt intervall, men inte att den är just Tango — en annan
korrekt metod skulle också klara det. Skillnaden ska då stå utskriven i
förhandsregistreringen.

## Återskapa miljön

    python3 -m venv ~/.venv-maskning
    ~/.venv-maskning/bin/python3 -m pip install --upgrade pip
    ~/.venv-maskning/bin/python3 -m pip install scipy statsmodels

Versionerna som användes står i `byggd_med` i fixturfilen. Basen var
systemets python3, på den här maskinen 3.9.6.
