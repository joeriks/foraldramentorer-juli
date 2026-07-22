# FöräldraMentorer - koncept och systemskiss

## Övergripande idé

FöräldraMentorer är en webbtjänst för kommuner som vill koppla samman erfarna seniorer med föräldrar som behöver ett tryggt, mänskligt och prestigelöst stöd i vardagen.

Kärnan är att återaktivera ett samhällskapital som ofta finns outnyttjat: livserfarenhet, tid och relationsförmåga hos äldre vuxna. Konceptet ska samtidigt minska föräldrars ensamhet och oro, samt ge seniorer ett meningsfullt uppdrag.

Plattformens roll är att göra detta möjligt i kommunal skala utan att mötet blir myndighetslikt. Systemet ska vara strikt, mätbart och säkert bakom kulisserna, men enkelt och varmt i kontakten med mentorer och föräldrar.

## Bärande principer

- Mentorn är en medmänniska, inte terapeut, myndighetsperson eller barnvakt.
- Kommunens samordnare har alltid sista ordet i godkännande, matchning och uppföljning.
- Systemet ska minska administration, inte skapa mer.
- Så mycket som möjligt ska kunna mätas utan att känsliga samtalsdetaljer samlas in.
- Mentorernas digitala vy måste fungera för äldre användare med låg teknisk vana.
- Kommunens vy ska ge kontroll, spårbarhet och beslutsunderlag.

## Systemets huvudmoduler

### 1. Onboarding och certifiering

Syfte: Säkerställa att varje mentor är lämplig innan personen kan matchas med en förälder.

Delfunktioner:

- Intresseanmälan och självskattning.
- Identitetskontroll, på sikt BankID och manuellt alternativ via handläggare.
- Bakgrundskontroll med belastningsregister.
- Referenshantering.
- E-learning med korta utbildningsblock.
- Kunskapsavstämningar.
- Intervjubokning och intervjuprotokoll.
- Gemensam mötesjournal för intervjuer, uppföljningar, avstämningar och andra kontakter med mentorn.
- Kontroller ska vara spårbara med status, tidpunkt och ansvarig handläggare.
- Certifieringsbeslut och aktivering i matchningsdatabasen.

### 2. Matchningsmotorn

Syfte: Ge samordnaren ett beslutsstöd för att hitta rätt mentor till rätt förälder.

Delfunktioner:

- Mentor- och föräldraprofiler.
- Hårda kriterier: område, språk, tillgänglighet och kapacitet.
- Mjuka kriterier: erfarenhetsområden, behovsområden och intressen.
- Toppförslag med matchningsgrad.
- Kort motivering till varför en match föreslås.
- Manuell sökning och filtrering.
- Förfrågan till mentor.
- Bokning av första mötet med kommunen.
- Avstämning efter första mötet och efter cirka fyra veckor.
- Odramatisk om-matchning om kemin inte fungerar.

### 3. Uppdragshantering och kommunikation

Syfte: Stötta vardagen när en matchning är aktiv, utan att övervaka relationen.

Delfunktioner:

- Uppdragskort för mentor.
- Aktivitetsstatus för samordnare.
- Enkel mötesrapportering med tid, mötesform och ämneskategori.
- Påminnelser via SMS eller systemnotiser.
- Enkel och säker kommunikation för praktisk planering.
- Funktion för att begära stöd från samordnare.
- Månatlig mående-check för mentorn.
- Påminnelse om uppdragets slutdatum.
- Digital utvärdering vid avslut.

### 4. Ersättning och arvode

Syfte: Göra ersättningshanteringen tydlig, korrekt och lätt att granska.

Delfunktioner:

- Automatiskt underlag baserat på rapporterade möten.
- Regler för timarvode och eventuella utlägg.
- Transparens för både mentor och kommun.
- Export till ekonomiunderlag.

### 5. Statistik och effektmätning

Syfte: Ge kommunen beslutsunderlag utan att bryta deltagarnas integritet.

Delfunktioner:

- Aggregerad statistik över mötesfrekvens.
- Samtalskategorier utan känslig fritext.
- Status över aktiva och inaktiva uppdrag.
- Trender över behovsområden.
- Underlag för politiker, förvaltning och verksamhetsledning.

## E-learningmodulen

E-learningdelen ska vara seniorvänlig och byggas med mycket få distraktioner.

Viktiga UX-principer:

- Stor text.
- Tydliga knappar.
- En-klicks-navigation.
- Automatisk sparfunktion.
- Möjlighet till uppläst text.
- Inget tidsbegränsat prov.

Utbildningen föreslås bestå av fyra block:

1. Rollen som FöräldraMentor.
2. Gränssättning och praktiska spelregler.
3. Sekretess och tystnadsplikt.
4. Orosanmälan.

Pedagogiken bör bygga på case och dilemman snarare än långa regeltexter. Kunskapsavstämningen ska lära ut genom återkoppling och låta mentorn försöka igen direkt vid fel svar. Kritiska frågor om sekretess och orosanmälan måste däremot vara korrekt förstådda innan certifiering.

## Första prototyp: Kommunens kontrollpanel

Den första prototypen ska visa administratörens vy för onboarding och certifiering.

Prioriterade funktioner:

- Enkel pipeline över kandidater.
- Status för varje steg i certifieringen.
- Kandidatdetaljer.
- Intervjuanteckningar.
- Manuell statusändring.
- Certifieringsknapp när alla krav är uppfyllda.
- Lokal datalagring i IndexedDB under prototypfasen.

Denna prototyp är avsiktligt enkel. Målet är att tidigt kunna känna på arbetsflödet, inte att låsa slutlig informationsarkitektur eller visuell identitet.
