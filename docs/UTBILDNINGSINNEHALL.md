# Tekniskt format för utbildningsinnehåll

Status: Implementerat prototypformat och målbild för produktion

Senast uppdaterad: 2026-08-19

## Princip

Utbildningsinnehåll lagras som versionshanterade innehållspaket. Ett paket kan vara `material`, `course` eller `test` och har ett stabilt tekniskt ID samt ett versionsnummer.

Kommunens urval lagras separat som referenser till innehållspaket. Gemensamt material kopieras därför inte när en kommun väljer att använda det. En kurs tar automatiskt med de material och test som kursen refererar till.

I den aktuella prototypen kan användaren filtrera utbildningsbiblioteket på kurser, referensmaterial och kunskapstest. Administratören kan välja kommunens innehåll, se versionsläge och styra publik exponering för referensmaterial. Mentorportalen visar den valda utbildningen, sparar progress och låter mentorn genomföra test. Den publika vyn visar endast referensmaterial som kommunen uttryckligen har valt och publicerat.

Urvalet har två skilda dimensioner:

- `selectedForTenant`: innehållet ingår i kommunens bibliotek och kan visas för behöriga användare,
- `publiclyExposed`: ett valt referensmaterial visas även för oinloggade föräldrar.

Endast `material` får exponeras publikt. `course` och `test` kräver inloggad mentor. Ett publikt material måste först ingå i kommunens urval. Om det tas bort ur urvalet upphör även den publika exponeringen.

## Gemensamma fält

- `id`: stabilt tekniskt ID
- `version`: positivt versionsnummer
- `type`: `material`, `course` eller `test`
- `scope`: `shared` för gemensamt bibliotek eller ett kommunägt omfång
- `title` och `summary`: sökbar metadata
- `bodyMarkdown`: presenterande text i Markdown
- `status`: exempelvis `draft`, `published` eller `retired`

Kommunens val lagras separat:

```ts
interface TenantContentSelection {
  tenantId: string;
  contentId: string;
  selectedVersion: number;
  selectedForTenant: boolean;
  publiclyExposed: boolean;
  selectedAt: string;
  selectedBy: string;
}
```

## Varför hybridformat

Markdown används för rubriker, brödtext, listor, länkar och citat. Systembärande uppgifter lagras strukturerat:

- en kurs har en ordnad lista av moduler med referenser till innehållspaket,
- ett test har frågor, svarsalternativ, rätt svar och godkändgräns,
- genomförande, reflektionssvar och testförsök lagras separat från innehållet.

Detta gör innehållet portabelt utan att verksamhetslogik behöver döljas i egna Markdown-styrkoder. Formatet kan senare kompletteras med validerade direktiv för enklare interaktiva block, men direktiv får inte bära testfacit eller referensintegritet.

Rå HTML tillåts inte i Markdown-fältet. HTML behandlas som text för att innehåll från biblioteket inte ska kunna föra in körbar kod i kommunportalen.

## Kursberoenden

En kursversion innehåller en ordnad lista med modulreferenser. Varje modul anger innehållspaketets stabila ID och version. När kommunen väljer en kurs ska administrationsvyn visa vilka referensmaterial och test som kursen kräver. Beroenden tas med i kommunens urval och kan inte tas bort separat så länge den valda kursversionen behöver dem.

Ett beroende som valts genom en kurs markeras som indirekt. Administratören ska kunna se vilken kurs som kräver det. Detta förhindrar ofullständiga kurser utan att gemensamt material behöver kopieras.

## Genomförande och testförsök

Mentorns genomförande lagras separat från innehållspaketet:

```ts
interface LearningProgress {
  tenantId: string;
  mentorId: string;
  contentId: string;
  contentVersion: number;
  status: "not_started" | "in_progress" | "completed";
  completedModuleIds: string[];
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

interface TestAttempt {
  id: string;
  tenantId: string;
  mentorId: string;
  testId: string;
  testVersion: number;
  answers: Array<{ questionId: string; selectedOptionId: string }>;
  score: number;
  passed: boolean;
  submittedAt: string;
}
```

Ett test kan rättas först när alla obligatoriska frågor har ett valt svar. Resultat, poäng, innehållsversion och tidpunkt sparas för varje försök. Tidigare försök skrivs inte över. Facit skickas inte som fritt redigerbart Markdown-innehåll och ska i SaaS-versionen rättas på serversidan.

Ett slutfört test eller en kurs uppdaterar utbildningsprogressen men fattar inte automatiskt beslut om mentorens godkännande. Handläggaren använder resultatet som underlag i aktiviteten för utbildning eller kunskapsavstämning. Systemet ska undvika en parallell manuellt underhållen utbildningsstatus när ett verifierbart genomförande redan finns.

## Behörighet och visning

- **Administratör:** väljer kommunens innehåll, publik exponering och när en ny publicerad version ska tas i bruk.
- **Samordnare och handläggare:** ser kommunens urval och mentorens relevanta genomförandestatus, men ändrar inte mentorens testresultat.
- **Mentor:** ser kommunens valda material, kurser och test samt sin egen progress och sina resultat.
- **Oinloggad förälder:** ser endast valt och publikt exponerat referensmaterial.

Prototypens val av testanvändartyp simulerar dessa vyer. Det ersätter inte autentisering, tenantavgränsning eller serverbaserad behörighetskontroll.

## Administrationsflöde

1. Administratören öppnar det gemensamma och kommunägda biblioteket.
2. Ett publicerat innehållspaket väljs för aktuell kommun.
3. Systemet visar version, typ och eventuella kursberoenden.
4. För referensmaterial kan administratören separat välja publik exponering.
5. Ändringen loggas med kommun, användare, vald version och tidpunkt.
6. När en ny version publiceras fortsätter pågående genomföranden använda sin sparade version tills kommunen uttryckligen byter.

## Versionshantering

Publicerat innehåll ändras genom att en ny version skapas. Ett pågående eller avslutat genomförande behåller referensen till den version som användes. Kommunen kan därefter välja när en ny publicerad version ska tas in i det egna urvalet.

En pensionerad version får inte väljas för nya genomföranden men måste kunna visas i historiken när den refereras av ett genomförande eller testförsök. Byte av vald version får inte skriva om tidigare progress eller resultat.
