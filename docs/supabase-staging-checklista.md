# Supabase staging: aktiveringschecklista

Den här checklistan gäller den första ärendevertikalen. Det finns tre separata stagingverktyg:

- `scripts/provision-supabase-staging.mjs` skapar två helt syntetiska organisationer, testanvändare och ärenden genom det granskade kontrollplans- och RLS-skyddade verksamhetsflödet,
- `scripts/verify-supabase-staging-isolation.mjs` loggar in med testkontona och gör en direkt, läsande kontroll av tabeller, explicita främmande ID:n, privat Storage, anonym åtkomst och privilegierade funktioner,
- `scripts/verify-supabase-staging.mjs` är den officiella, läsande preflighten genom stagingappens publika HTTPS-runtime och skapar, ändrar eller raderar inga verksamhetsposter.

## Nuvarande stagingstatus (2026-08-26)

- Databasmigrationer, seed, privat dokumentbucket och syntetiskt PDF-objekt är installerade i det externa stagingprojektet.
- En plattformssuperadministratör och två separata demoorganisationer med egna Auth-användare och syntetiska ärenden är provisionerade.
- Den direkta isolationskontrollen är godkänd för 27 organisationsägda tabeller, 8 explicita cross-org-prov, privat Storage, 5 anonyma domäner och klientåtkomst till privilegierade funktioner.
- Security Advisor visar 0 fel och 0 varningar. Auth-skydd mot läckta lösenord är aktiverat.
- Stagingappen är driftsatt i det separata Vercelprojektet `foraldramentorer-staging` på `https://foraldramentorer-staging.vercel.app`; API-funktionerna körs i Stockholm (`arn1`).
- Den officiella runtime-preflighten är godkänd med feature flaggan både `false` och `true`; två organisationer såg vardera endast sitt eget syntetiska ärende.
- Feature flaggan är nu `true` endast i staging. Deploymenten är `Ready`, appskal och pilotresurser svarar 200 och inga funktionsfel hittades efter kontrollen.
- UI-stickprovet är godkänt för båda demoorganisationerna: rätt sessionskontext, exakt ett eget ärende, full arbetsyta, inget främmande ärendenummer och 0 klientfel. Testsessionerna är utloggade.
- GitHub Environment `staging` är skapat med obligatoriskt godkännande. Projektvariablerna och de fyra syntetiska testkontona är konfigurerade; endast ett separat begränsat och långlivat `VERCEL_TOKEN` återstår.

## 1. Förutsättningar

- Stagingappen kör över HTTPS och använder ett separat Supabase-projekt med Postgres 17.
- Databasen är byggd från repositoryts migrationsfiler; inga manuella schemaändringar finns endast i Dashboard.
- Självregistrering och anonyma inloggningar är avstängda.
- `SUPABASE_CASE_WORKSPACE_ENABLED=false` under första kontrollen.
- Två separata, aktiva `demo`-organisationer finns i staging.
- Varje demoorganisation har en egen aktiv Auth-användare som inte är plattformssuperadministratör.
- Varje demoorganisation har minst ett helt syntetiskt ärende. Använd aldrig riktiga namn, kontaktuppgifter eller dokument i stagingkontrollen.

Organisationerna skapas genom det granskade superadminflödet. Testanvändarna aktiveras genom Auth och syntetiska ärenden skapas därefter genom organisationernas normala, RLS-skyddade kommando. Service-role används endast bakom den granskade servergränsen för Auth-administration och får inte användas för att kringgå verksamhetskommandon eller RLS-kontroller.

## 2. GitHub Environment

GitHub Environment `staging` är skapat med obligatoriskt godkännande. Följande värden ska finnas:

- Variable `STAGING_APP_URL`: stagingappens publika HTTPS-origin.
- Variable `VERCEL_ORG_ID`: Vercel-teamets ID från `.vercel/project.json`.
- Variable `VERCEL_PROJECT_ID`: stagingprojektets Vercel-ID från `.vercel/project.json`.
- Secret `VERCEL_TOKEN`: ett begränsat Vercel-token som endast används av deploy-workflowet.
- Secret `STAGING_ORG_A_EMAIL`.
- Secret `STAGING_ORG_A_PASSWORD`.
- Secret `STAGING_ORG_B_EMAIL`.
- Secret `STAGING_ORG_B_PASSWORD`.

Alla värden utom `VERCEL_TOKEN` är konfigurerade. Använd inte den lokala Vercel CLI-sessionens kortlivade OAuth-token i CI. Skapa i stället ett separat, begränsat token avsett för stagingdriftsättning och lagra det endast som GitHub Environment-secret.

Lägg inte Supabase secret/service-role key i detta workflow. Preflighten hämtar endast den webbläsarsäkra publishable key som stagingappen redan publicerar via `/api/runtime-config`.

Workflowet `Deploy Vercel staging` kör applikationstester, bygger med den låsta Vercel CLI-versionen, driftsätter en prebuilt artefakt till det separata stagingprojektets stabila alias och kör därefter samma tvåorganisations-preflight. Direkt Git-integration är förstahandsval när Vercels GitHub-app har installerats för repositoryt; workflowet är en manuellt godkänd reserv- och revisionsväg.

## 3. Kontroll före aktivering

Kör workflow `Supabase staging preflight` manuellt med `expected_case_workspace_enabled=false`.

Kontrollen stoppar om:

- runtime-endpointen inte använder `no-store`, läcker ett serverhemligt fältnamn eller visar fel flaggläge,
- stagingappen eller Supabase-URL:en inte använder HTTPS,
- en oautentiserad klient kan läsa ett ärende,
- kontona är samma Auth-användare, tillhör samma organisation, tillhör en `live`-organisation eller är plattformssuperadministratörer,
- en organisation ser en rad märkt med ett annat `organization_id`,
- ett explicit ärende-ID från organisation A blir synligt för B eller tvärtom.

Ett godkänt jobb skriver endast en kompakt sammanfattning med flaggläge och antal kontrollerade syntetiska ärenden. E-post, tokens, organisations-id och ärende-id loggas inte.

## 4. Aktivering och kontroll

1. Sätt `SUPABASE_CASE_WORKSPACE_ENABLED=true` i stagingappens servermiljö.
2. Driftsätt samma verifierade applikationsversion igen.
3. Kör workflowet med `expected_case_workspace_enabled=true`.
4. Logga in som ett konto i vardera demoorganisationen och genomför ett verksamhetsstickprov i pilotens ärendearbetsyta.
5. Kontrollera Auth-, Data API- och databasloggar efter oväntade RLS-avslag, `VERSION_CONFLICT`, 5xx-fel och långsamma anrop.

Flaggan aktiverar ingen dual-write. Huvudappens ärendeingång går till Supabase medan den gamla lokala prototypinformationen ligger kvar endast som rollbackunderlag.

## 5. Rollback

1. Sätt `SUPABASE_CASE_WORKSPACE_ENABLED=false`; ändra inte Supabase URL eller publishable key samtidigt.
2. Driftsätt konfigurationen.
3. Kör preflight med `expected_case_workspace_enabled=false`.
4. Dokumentera orsak, tid, berörd version och om någon Supabase-skrivning behöver verksamhetsmässig uppföljning.

Radera inte stagingdata under en incident. Eftersom ingen äldre verksamhetsdata importeras och ingen dual-write används behöver data inte synkroniseras tillbaka till IndexedDB.
