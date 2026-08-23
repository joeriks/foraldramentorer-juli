# FöräldraMentorer - koncept och systemskiss

Status: Aktuell konceptbeskrivning för prototypen

Senast uppdaterad: 2026-08-22

Teknisk fördjupning: [Progressiv ärendehantering](teknisk-specifikation-progressiv-arendehantering.md)

Verksamhetsflöden: [Verksamhetsflöden och handläggningsrutiner](verksamhetsfloden-och-handlaggningsrutiner.md)

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

### 1. Introduktion och godkännande

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
- Beslut om godkännande och aktivering i matchningsdatabasen.

### 2. Matchningsmotorn

Syfte: Ge samordnaren ett beslutsstöd för att hitta rätt mentor till rätt förälder.

Delfunktioner:

- Mentorprofil och stödprofil för det aktuella stödärendet.
- Strukturerade grundkriterier: kommunens geografiska områden, språk, återkommande tillgänglighetsfönster och kapacitet.
- Mjuka kriterier: erfarenhetsområden, behovsområden och intressen.
- Toppförslag med matchningsgrad.
- Kort motivering till varför en match föreslås.
- Manuell sökning och filtrering.
- Förfrågan till mentor.
- Bokning av första mötet med kommunen.
- Avstämning efter första mötet och efter cirka fyra veckor.
- Odramatisk om-matchning om kemin inte fungerar.

Matchningen använder en gemensam katalog med stödområden. Kommunen väljer sitt lokala och publika urval, föräldern anger vad det aktuella stödärendet gäller och mentorn anger relevanta erfarenhetsområden. Kommunen administrerar dessutom sina geografiska områden, medan språk och återkommande tillgänglighet väljs ur gemensamma listor. Systemet jämför stabila ID:n och visar överlappning som beslutsunderlag men fattar inte matchningsbeslut. Praktiska förutsättningar, parternas önskemål och handläggarens professionella bedömning är fortfarande avgörande.

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
- Ett tydligt nästa steg före stödmaterial och övriga val.
- Automatisk sparfunktion.
- Möjlighet till uppläst text.
- Inget tidsbegränsat prov.

Utbildningen föreslås bestå av fyra block:

1. Rollen som FöräldraMentor.
2. Gränssättning och praktiska spelregler.
3. Sekretess och tystnadsplikt.
4. Orosanmälan.

Pedagogiken bör bygga på case och dilemman snarare än långa regeltexter. Kunskapsavstämningen ska lära ut genom återkoppling och låta mentorn försöka igen direkt vid fel svar. Kritiska frågor om sekretess och orosanmälan måste däremot vara korrekt förstådda innan godkännande.

## Aktuell prototyp: kommunportalen

Den aktuella prototypen omfattar ett sammanhängande kommunalt arbetsflöde från behovsanalys och rekrytering till godkännande av mentor, stödärende, matchning, mentoruppdrag och uppföljning. Den innehåller också kontaktmottagning, personregister, utbildningsinnehåll, administration, support och versionshistorik.

Utbildningsvyn visar mentorens nästa del först och samlar material och fristående kunskapstest i en sekundär utfällbar del. Systemadministrativa funktioner är märkta med både text och en återhållen grågrön visuell ram, så att användaren tydligt ser när arbetet gäller systemets konfiguration och inte ett vanligt verksamhetsärende.

Prototypens viktigaste funktioner är:

- **Översikt** med arbetskö, genvägar för att skapa nytt och en visuell bild av hur ärendetyperna hänger ihop.
- Centralt ärenderegister med sökning samt filtrering på ärendetyp och status.
- Personanknutna och generella ärenden med ansvarig handläggare, versionshanterad beskrivning, aktiviteter, handlingar, kontakter, arbetsanteckningar och fullständig historik.
- Enkla och guidade aktiviteter som handläggarens huvudsakliga arbetsyta, med strukturerade resultat och tydligt nästa steg.
- Godkännandeflöde för mentor med kontroller, utbildning, intervju och beslut.
- Publik intresseanmälan där en ny mentor kan registrera kontaktuppgifter, förutsättningar, erfarenhetsområden och motivation samt följa ansökans status.
- Stöd- och matchningsflöde med sökbar mentorlista och synliga matchande respektive saknade kriterier.
- Kontaktmottagning för inkommande samtal och e-post utan krav på personkoppling.
- Lokal datalagring i IndexedDB med realistiska exempelärenden och bevarad historik.

Vyerna använder progressiv visning. Det som behövs för nästa normala arbetsmoment visas först. Sällan använda uppgifter, planering och undantag finns kvar men tar inte plats förrän användaren behöver dem. Prototypen är avsedd för verksamhetsprövning och är inte en produktionslösning för autentisering, central lagring eller kommunal arkivering.

### Ärendemodell

Ärendet är den sammanhållande handläggningsakten. Ett ärende kan vara kopplat till högst en mentor och, för stöd till förälder, högst en förälder. En person kan ha flera avgränsade ärenden över tid. Generella verksamhetsärenden kan sakna personkoppling. Matchningar och mentoruppdrag hör alltid till ett bestämt stödärende och skapar inte en permanent direktrelation mellan en förälder och en mentor.

Stödområden hör till stödbehovet och lagras därför på stödärendet. De ska inte bli permanenta etiketter på föräldern. Mentorns erfarenhetsområden hör däremot till mentorprofilen och kan återanvändas i flera matchningar. När ett uppdrag skapas sparas en ögonblicksbild av de områden som uppdraget avser, så att senare katalogändringar inte skriver om historiken.

Handläggaren arbetar normalt med aktiviteter. När en aktivitet ändras eller slutförs skapar systemet en händelse i historiken med tidpunkt och användare. Ett dokument, meddelande eller annat underlag registreras som en handling och kan kopplas till den aktivitet där underlaget användes.

Ärendebeskrivningen är ärendets långsiktiga nuläge och kan innehålla rubriker, listor, länkar och checklistor. Varje ändring skapar en ny beskrivningsversion; tidigare text bevaras med användare och tidpunkt. En fri ärendeanteckning används endast när informationen saknar en bättre strukturerad plats och kan kopplas till hela ärendet, en aktivitet eller ett kontakttillfälle. En rättelse skapar en ny anteckningsversion. Formella tjänsteanteckningar är fortsatt handlingar och blandas inte ihop med fria arbetsanteckningar.

En aktivitet kan också guida handläggaren genom flera interna arbetssteg utan att varje steg blir en egen post i arbetskön. Sådana steg saknar eget ansvar och eget förfallodatum; de visar i stället aktivitetens progression och nästa konkreta åtgärd. Obligatoriska steg måste vara klara innan aktivitetens separata slutresultat kan registreras. Den första piloten är `Genomför första mötet`, där ett bokat respektive dokumenterat genomfört möte flyttar aktiviteten framåt.

Minnesregel:

> Aktivitet = att göra. Händelse = gjort. Handling = formellt underlag. Ärendeanteckning = nödvändig fri arbetsinformation som saknar bättre plats.

När en ny mentor registreras är `Skapa ärende om godkännande` förvalt, men användaren kan välja bort det. Godkännandeärendet använder aktiviteter för identitet, belastningsregister, referenser, utbildning, kunskapsavstämning, kallelse, intervju och beslut. Handläggaren kan även lägga till fria uppföljningsaktiviteter, exempelvis att kontakta mentorn när en referens inte går att nå.

En ny mentor kan också börja i den publika portalen. Intresseanmälan är ett separat objekt tills en handläggare har granskat den. Den sökande fyller i namn, kontaktväg, geografiska områden, språk, tillgänglighet, stödområden, erfarenhetsgrund och motivation i fyra steg. Personnummer efterfrågas inte publikt. Den sökande kan spara ett utkast och ser därefter ansökans status, meddelanden och historik under `Min ansökan` i samma webbläsare.

I mentorregistret visas inskickade ansökningar i en egen granskningskö. Handläggaren ser vilka uppgifter som är självregistrerade, kontrollerar möjliga dubbletter och kan begära komplettering. När ansökan tas emot skapas den ordinarie mentorposten, matchningsprofilen och ärendet `Godkännande av mentor`. Identitetskontroll och övriga lämplighetskontroller sker alltså fortsatt i det skyddade godkännandeflödet och inte i den publika ansökan.

### Översikt, register och ärendekort

Översiktens arbetskö är den primära ingången till det dagliga arbetet. Den kan växlas mellan `Aktiviteter`, `Otilldelade`, `Försenade` och `Ställningstaganden` och avgränsas till alla ärendeansvariga, egna ärenden eller en vald handläggare. `Otilldelade` visas separat eftersom posterna saknar ansvarig. Varje rad visar ärendet och dess nästa aktivitet. Processöversikten visar antal öppna ärenden per ärendetyp och leder till ett register som redan är filtrerat på den valda typen.

Under `Föräldrar` finns en direkt genväg till alla ärenden av typen `Stödärende för förälder`. Genvägen öppnar samma ärenderegister med ärendetypen förvald.

Ärenderegistret visar när varje ärende skapades och visar även senast ändrat datum när posten har uppdaterats efter registreringen. Under `Skapa nytt` på Översikt finns direktval för att registrera både förälder och mentor.

Mentorregistret skiljer på verksamhetsstatus och registerstatus. Det kan filtreras på aktiva eller inaktiva mentorer. En inaktiv mentor är tydligt märkt i listan och kan återaktiveras med ett direkt kommando på mentorkortet; historiken bevaras hela tiden.

Kalendern ger en stor samlad månadsvy över bokade och genomförda möten, genomförda kontakter samt förfallodatum för öppna aktiviteter och ärenden. Från kalendern kan handläggaren boka ett möte eller registrera en redan genomförd kontakt. Den återanvänder datum från respektive källpost och används för överblick och navigering, inte för separat dubbelregistrering. På mobil visas innehållet som en agenda grupperad per dag.

Ärenderegistret samlar rubrik, typ och registreringsdatum i kolumnen `Ärende`, personkopplingen i `Person`, status och nästa aktivitet i `Läge` samt handläggare i `Ansvarig`. Tabeller får skrolla inom sin egen yta på små skärmar men ska aldrig göra hela sidan bredare.

På mentorpostens ärendeflik visas varje öppet ärendes senaste ändringstid och varje avslutat ärendes avslutstid direkt tillsammans med statusen. Mentorpostens egen ändringstid benämns `Mentorpost ändrad` och påverkas bara när mentoruppgifter eller mentorstatus ändras, inte av alla händelser i länkade ärenden.

På ärendekortet är fliken `Arbete` den första arbetsytan. Ordningen är nästa rekommenderade åtgärd, ärendebeskrivning, hela aktivitetslistan, de tre senaste verksamhetshändelserna samt kollapsade ärendeuppgifter och fler åtgärder. Övriga flikar är `Handlingar`, `Kontakter` och `Historik`. Rubrik, ärendenummer och status ligger kvar i sidhuvudet, medan personkopplingar, ansvar och ändringstid är stängda från start under `Ärendeinformation`. Sekundära ärendeuppgifter visas endast när de har ett relevant värde eller när användaren öppnar den utfällbara delen för fler åtgärder.

Menyn `Lägg till` samlar aktivitet, kontakt, möte, handling och sist fri ärendeanteckning. Alla ärendetyper kan få en fri aktivitet med endast rubrik; ansvar ärvs från ärendet och instruktion, särskild ansvarig samt förfallodatum är valfria. Styrda och guidade aktiviteter behåller sina befintliga mallar och regler.

### Aktiviteter och kommunal handläggningsrutin

Ärendet har en ansvarig handläggare. Aktiviteter ärver normalt denna ansvariga, men kan uttryckligen tilldelas en annan handläggare. Ett byte av ärendeansvarig påverkar endast aktiviteter som använder det ärvda ansvaret.

Aktivitetens arbetsläge och resultat är två skilda uppgifter:

- Status beskriver arbetet: Ej påbörjad, Pågår, Väntar, Avslutad eller Ej aktuell.
- Resultat beskriver utfallet och anpassas efter aktivitetstypen.

I den normala vyn väljer handläggaren ett resultat i en alltid synlig lista. Valet kan avmarkeras om det gjordes av misstag. Resultat, valfri eller obligatorisk tjänsteanteckning och avslutningsknapp ligger tillsammans. När aktiviteten avslutas öppnar systemet nästa aktivitet eller återgår till ärendet. Vänteläge, särskild planering och `Ej aktuell` finns under `Planering och undantag`.

Om aktiviteten kräver en strukturerad registrering är avslutande resultat spärrade tills underlaget är klart. Gränssnittet visar vilka uppgifter som saknas och länkar direkt till registreringen. Intervjuer använder verksamhetsnära lägen som `Inte bokad`, `Bokad` och `Genomförd` i stället för det generella ordet `Fullständig`; en genomförd intervju kräver passerad mötestid och en saklig sammanfattning.

Ett avvikande resultat markerar ärendet som `Ställningstagande krävs` och ligger kvar i arbetskön tills avvikelsen har hanterats. En kort tjänsteanteckning krävs för resultat som behöver följas upp.

Att den sista aktiviteten avslutas stänger inte ett vanligt ärende och skapar inte automatiskt ett nytt ärende. Systemet visar vad som har sparats och låter handläggaren uttryckligen välja nästa verksamhetssteg. Sammansatta beslut, exempelvis att godkänna en mentor, ska visa och logga samtliga effekter innan de genomförs.

För belastningsregister registreras endast neutrala resultat som Visat och kontrollerat, Inte visat eller Äkthet inte bekräftad. Aktiviteten ger en kort kontrollinstruktion och en utfällbar checklista med länk till [Polismyndighetens information för arbetsgivare](https://polisen.se/tjanster-tillstand/belastningsregistret/information-till-arbetsgivare-om-registerutdrag/). Prototypen ska inte uppmana handläggaren att dokumentera innehållet i ett registerutdrag eller att ladda upp en kopia. Den slutliga rutinen måste fastställas utifrån kommunens verksamhet och tillämpligt lagstöd.

Förfallodatum används när det finns en beslutad tidsfrist, bokad tid eller överenskommen återkoppling. Försenade och snart förfallna aktiviteter markeras särskilt. Ändringar av ansvarig, status, resultat och förfallodatum registreras automatiskt i ärendets händelselogg.

Handlingar kan gälla hela ärendet eller kopplas till en viss aktivitet. Kopplingen ska visas både på aktivitetskortet och i ärendets handlingslista.

### Kontaktmottagning

`Registrera kontakt` är en tydlig underåtgärd i navigationen och finns även på Översikt och i vyn `Kontaktmottagning`. En inkommande kontakt registreras som ett mottagningsärende med kontaktväg, kontaktuppgift, kort saklig anteckning och en fri beskrivning av nästa steg. Den som kontaktar kommunen behöver inte vara en förälder och någon personpost behöver inte skapas under samtalet. Ett stödärende eller annan fortsatt handläggning kan kopplas senare när behovet är tydligt.

Själva samtalet, mejlet, besöket eller mötet lagras samtidigt som ett gemensamt kontakttillfälle. Ett planerat möte kan vara fristående eller kopplas till ett ärende. När ett ärende väljs föreslås kända parter och ansvarig handläggare, men organisatör och deltagare kan justeras var för sig. Kallelsesvar registreras separat från faktisk närvaro. Ett ärendekopplat kontakttillfälle visas i kalendern och ärendets historik utan att behöva registreras på nytt.

Teknisk kommunikation via e-post, SMS och framtida kanaler hanteras i ett separat globalt kommunikationslager. Det registrerar sändnings- och mottagningskommandon, leverantörens meddelande-id och statuskedja och länkar posten till exempelvis möte och ärende. Mötet beskriver alltså vad som ska hända, medan kommunikationsposten visar vad systemets kanal faktiskt har hanterat. I prototypen används e-post- och SMS-demo som registrerar men inte levererar externt.

Mötesutfall anges som genomfört, inställt eller uteblivet. En ombokning blir en ny bokning så att den ursprungliga händelsen finns kvar. Samma kronologiska kontaktlista visas på ärendet samt på berörd förälder och mentor, med nästa planerade kontakt överst.

### Stödärende och matchning

Ett stöd- och matchningsunderlag räknas som fullständigt först när följande finns:

1. Stödets syfte.
2. Önskat resultat.
3. Minst ett bekräftat stödområde.

Obligatoriska fält markeras med asterisk och en dynamisk checklista visar vad som återstår. Ett ofullständigt utkast kan sparas, men en aktivitet som kräver fullständigt underlag kan inte avslutas.

När handläggaren väljer `Starta matchning` hämtas det nya ärendets namn från stödärendet. Matchningsärendet innehåller en sök- och filtrerbar lista över godkända, tillgängliga mentorer. Varje förslag visar vilka kriterier som matchar och vilka som saknas eller behöver kontrolleras. Handläggaren kan tillfälligt avaktivera enskilda kriterier för att bredda urvalet; systemet visar beslutsunderlag men väljer aldrig mentor automatiskt.

### Administration av flöden

Samordnaren kan skapa egna manuella ärendetyper och generella aktivitetsmallar. En egen ärendetyp kan få vägledning, kompletterande fält, mentorkoppling, ett ordnat aktivitetsflöde och en föreslagen nästa ärendetyp. Ett följdärende skapas aldrig automatiskt, och cirkulära samband tillåts inte.

Ändringar publiceras som nya versioner. Nya ärenden använder den senaste publicerade ärendetypversionen, och nya aktiviteter använder de mallversioner som uttryckligen valts i den versionens flöde. Befintliga poster fortsätter använda exakt den version de skapades med. Inaktivering tar bort definitionen från nya val men bevarar ärenden, aktiviteter, loggar och revisionshistorik. Innan en definition ändras eller inaktiveras visar systemet hur många poster och aktiva flöden som berörs.

De inbyggda kärnflödena har särskilda verksamhetsregler. Därför är deras tekniska struktur skyddad; endast handledande texter och uttryckligen valbara verksamhetsinställningar kan versionshanteras. Egna definitioner kan administreras inom den generella modellen.

### Prototypens gräns

Kommunportalen använder realistiskt prototypdata med sammanhängande ärenden, aktiviteter och logghistorik. Data lagras lokalt i webbläsarens IndexedDB. Väljaren **Visa prototypen som** skiljer mellan Samordnare med systemadministration, Handläggare med verksamhetsvyer samt separata portaler för Mentor och Ej inloggad besökare. Testrollerna simulerar behörighetsstyrda vyer men ersätter inte autentisering, tenantavgränsning eller serverbaserad behörighetskontroll. Produktionsinförande kräver därför central databas, säker filhantering, fastställda rättsliga rutiner och integrationer för exempelvis identitet, notifiering och arkivering.
