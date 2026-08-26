# Lokal Supabase-utveckling

## Kommandon

```bash
npm run supabase:start
npm run supabase:reset
npm run test:db
npm run lint:db
npm run supabase:stop
```

`supabase:reset` bygger om den lokala databasen från migreringarna, kör seed-filen och seedar deklarerade Storage-buckets och demoobjekt. Seed-filen ska inte innehålla verkliga person- eller produktionsdata.

## Provisionering

Första plattformssuperadministratören bootstrapas som en separat, manuellt godkänd driftsåtgärd efter att användaren skapats i Supabase Auth. Lägg aldrig bootstrap-SQL, användar-id eller secret/service-role-nyckel i klientkod eller seed-data.

Normal organisationsprovisionering sker i denna ordning:

1. Ett betrott server-/Edge Function-flöde bjuder in den första organisationsadministratören med Supabase Auth Admin API.
2. Den inloggade plattformssuperadministratören anropar `platform_create_organization` med Auth-användarens id, visningsnamn, skäl och en unik idempotensnyckel.
3. Databasen skapar organisation, profil, aktivt administratörsmedlemskap och kontrollplanshändelse i samma transaktion.
4. Organisationen kan spärras eller återaktiveras med `platform_set_organization_status`. Spärrning stänger omedelbart både RLS-läsningar och verksamhetskommandon.

Auth Admin API får endast användas på servern. En publishable key används i webbläsaren; secret/service-role-nyckel får aldrig skickas dit.

## Auth- och repositorypilot

`/supabase-pilot.html` är en separat pilotvy för Supabase Auth och RLS-skyddade läsningar. Den befintliga applikationen på `/` fortsätter som uttryckligt prototyp-/demoläge under övergången. Piloten innehåller:

- e-post/lösenordsinloggning och beständig Supabase-session,
- `current_session_context` för organisation, roll och plattformssuperadminstatus,
- ett Supabase-repository för ärendelista och en komplett första ärendearbetsyta med beskrivningsversioner, aktiviteter, anteckningar, avvikelser, dokument och historik,
- explicit skapande av aktiviteter från organisationens aktiva publicerade definitioner, med vald version fryst på aktiviteten,
- idempotenta och versionskontrollerade övergångar mellan planerad/pågående och vänteläge, med väntande part, bevakningsdatum, motivering och audit,
- motiverad återöppning av slutförda eller inställda aktiviteter för administratör/samordnare, inklusive atomisk supersede av öppen avvikelse,
- strukturerade ärendekommandon för paus, återupptagning, avslut och återöppning, där avslut korrelerar och auditerar varje inställd restaktivitet,
- idempotent aktivitetsslutförande genom `complete_case_activity` med förväntad version,
- versionsstyrd uppdatering av ärendebeskrivning och append-only rättelser av anteckningar,
- databasstyrd avvikelseöppning och ställningstagande med fortsätt, komplettera, pausa eller avsluta,
- uppladdning av ärendedokument genom den privata Storage-reservationen,
- ett typat `VERSION_CONFLICT`-flöde som läser om ärendet och visar den vinnande ändringen utan att skriva över den,
- en administratörsyta som granskar och atomiskt publicerar nya immutable aktivitetsdefinitionsversioner med obligatoriskt skäl,
- ett serveranrop där en inloggad plattformssuperadministratör skapar organisation och bjuder in dess första administratör.

Kopiera `.env.example` till `.env.local` och fyll i:

- `SUPABASE_URL`,
- `SUPABASE_PUBLISHABLE_KEY` (webbläsarsäker),
- `SUPABASE_SECRET_KEY` (endast server),
- `SUPABASE_INVITE_REDIRECT_URL`,
- `SUPABASE_CASE_WORKSPACE_ENABLED` (`false` som standard).

Starta därefter med `npm start` och öppna `http://127.0.0.1:5173/supabase-pilot.html`. Lokalt kan URL och nycklar läsas med `supabase status -o env`; lägg aldrig utskriften i Git eller dokumentation. Självregistrering är avstängd, men e-postprovidern är aktiverad så att inbjudna användare kan logga in.

När piloten är verifierad i en miljö kan `SUPABASE_CASE_WORKSPACE_ENABLED=true` sättas server-side. Då skickar huvudappens ärendelista, direkta ärendelänkar, inkommande kontakt och nyregistrering till `/supabase-pilot.html`. Ingen post skrivs till både IndexedDB och Supabase. Rollback är att återställa flaggan till `false`; den senaste verifierade flaggan sparas i webbläsaren så att ett tillfälligt fel i konfigurationsanropet inte återöppnar den gamla ärendevägen.

Den manuella GitHub Actions-kontrollen `Supabase staging preflight` verifierar två demoorganisationer utan service-role och utan verksamhetsskrivningar. Miljökrav, secrets, aktiveringsordning och rollback finns i [stagingchecklistan](../docs/supabase-staging-checklista.md).

Inbjudningsendpointen verifierar anroparens bearer-session genom `is_platform_superadmin`, använder secret key endast för Auth Admin API och genomför sedan den idempotenta databasprovisioneringen med anroparens egen JWT. Om provisioneringen misslyckas försöker servern ta bort den nyss skapade Auth-användaren och returnerar en separat kod om även kompensationen misslyckas.

Pilotens aktivitetsresultat läses från organisationsägda och versionsstyrda `activity_result_definitions`. Varje ny organisation får en egen publicerad standarddefinition med tre resultat. När en aktivitet skapas fryser den `activity_definition_id` och `activity_definition_version`, så en senare publicering ändrar varken historiska val eller klassificeringar. Publicerade versioner och deras resultat är immutable.

Manuell aktivitetsskapning använder den entydiga RPC-signaturen `create_case_activity(case_id, activity_definition_id, expected_activity_definition_version, title, due_date, idempotency_key)`. Definitionen måste vara aktiv, tillhöra samma organisation och ha den bekräftade versionen publicerad och aktuell. En samtidig publicering ger SQLSTATE `40001`; klienten läser då om katalogen i stället för att skapa mot en inaktuell version. Ett redan lyckat idempotent anrop kan fortfarande återspelas efter en senare publicering och returnerar den ursprungliga frysta aktiviteten. Internt skapade uppföljningsaktiviteter använder organisationens publicerade standarddefinition genom samma tabellinvariant.

`complete_case_activity` verifierar resultatkoden mot aktivitetens frysta version och härleder klassificeringen i databasen. Parametern `p_classification` finns tillfälligt kvar för bakåtkompatibilitet men ignoreras. En manipulerad klient kan därför varken skicka en okänd kod eller styra om ett accepterat resultat till en avvikelse.

Endast en aktiv organisationsadministratör kan anropa `publish_activity_definition`. Kommandot validerar en komplett katalog med 1–20 unika resultat, kräver ett publiceringsskäl och idempotensnyckel samt använder `expected_current_version` för att stoppa inaktuella redigerare. Ny version, resultat, aktuell versionspekare, processed command och append-only `activity_definition_events` skrivs i samma transaktion. Pilotens separata granskningssteg visar exakt titel, version, resultatkod och klassificering före anropet. Rättelser publiceras som ytterligare en version; historik skrivs aldrig om. Direkta klientskrivningar till definitions- och audittabellerna är fortsatt stängda.

## Första verksamhetskommandon

Följande RPC:er är exponerade för autentiserade användare men genomför egna organisations- och rollkontroller:

- `create_case`
- `create_case_activity`
- `transition_case_activity_work_state`
- `complete_case_activity`
- `reopen_case_activity`
- `transition_case_lifecycle`
- `update_case_description`
- `save_case_note`
- `decide_activity_deviation`
- `publish_activity_definition`
- `create_mentor`
- `create_parent`
- `link_case_people`
- `create_document_upload`
- `complete_document_upload`

Alla kräver en idempotensnyckel. Skapande, arbetslägesändring, slutförande och återöppning av en aktivitet, ärendets livscykel samt koppling av personer till ett ärende kräver dessutom förväntad version och avvisar en inaktuell skrivning. Arbetslägesändring och slutförande kräver ett öppet ärende. Återöppning av aktivitet eller ärende kräver administratörs-/samordnarroll och motivering. Ärendeavslut avvisas om en öppen avvikelse saknar beslut, markerar oavslutade aktiviteter som inställda i samma transaktion och lämnar dem inställda efter en eventuell återöppning. Direkta klientskrivningar till tabellerna är fortfarande stängda.

De exponerade funktionerna är tunna `security invoker`-wrappers. Privilegierad implementation ligger i `private`, som inte ingår i Data API-konfigurationens exponerade scheman och saknar klientgrants till tabeller.

## Privat dokumentlagring

Bucketen `organization-documents` är privat, har 20 MiB-gräns och tillåter endast konfigurerade dokumentformat. Uppladdning sker i två steg:

1. `create_document_upload` skapar dokumentmetadata och en kortlivad reservation med servergenererad sökväg.
2. Klienten laddar filen till den utfärdade sökvägen genom Supabase Storage API utan upsert.
3. `complete_document_upload` verifierar objektets storlek och MIME-typ och gör versionen läsbar.

Det finns ingen klientpolicy för UPDATE eller DELETE på Storage-objekt. En rättelse ska bli en ny dokumentversion i stället för att originalet ersätts. Staffroller kan läsa organisationens dokument; en mentor kan endast läsa tillåtna dokumentkategorier som är kopplade till den egna mentorprofilen. Dokumenthändelser är endast synliga för staffroller.

Storage-schemat behandlas som Supabase-ägt och read-only. Filer ska laddas upp och senare gallras genom Storage API, aldrig genom direkta SQL-skrivningar mot `storage.objects`.

## Demokurser och prototypscenarier

Demoinnehåll ska finnas kvar, men det får inte bli globalt delad verksamhetsdata:

- demokurser lagras som versionsstyrda plattformsmallar och kopieras till organisationsägda kursrader,
- en live-organisation kan få valda demokurser men inga syntetiska personer eller ärenden automatiskt,
- kompletta prototypscenarier placeras i en uttryckligt demo-klassificerad organisation med separata demokonton,
- demoorganisationen följer samma RLS-regler och exkluderas från live-rapportering och verkliga notifieringar.

Den lokala seed-filen innehåller två deterministiska, privata kursmallar utan personuppgifter. En aktiv administratör eller koordinator kan:

- läsa katalogen med `list_available_course_templates`,
- skapa en organisationsägd kopia med `install_course_template`.

Installationen kräver en idempotensnyckel. Samma mall kan installeras i flera organisationer, men varje organisation får egna kurs-, versions- och modul-id:n och kan därför ändra sin kopia utan påverkan på någon annan.

Seed-filen skapar dessutom `Prototypkommun`, en explicit demoorganisation med en syntetisk mentor, en syntetisk förälder, två länkade ärenden, aktiviteter, en ärendeanteckning, en öppen avvikelse, en egen kopia av introduktionskursen och ett case-kopplat syntetiskt PDF-dokument i den privata bucketens organisationssökväg. Kontaktadresserna använder reserverade exempelvärden och samtliga personhändelser markeras `synthetic`.

Den seedade Auth-raden är endast en intern aktör för foreign keys och revisionshistorik. Den har inget lösenord och är inte ett delat demokonto. Ett interaktivt demokonto ska bjudas in genom serverflödet för Auth Admin API.
