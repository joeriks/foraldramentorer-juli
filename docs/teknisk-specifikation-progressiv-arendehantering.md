# Teknisk specifikation: progressiv ärendehantering

Status: Utkast 1.2
Produkt: FöräldraMentorer – Kommunportal  
Målmiljö: Webbaserad SaaS  
Prototyplagring: IndexedDB
Senast uppdaterad: 2026-08-20

Verksamhetsmässig tillämpning: [Verksamhetsflöden och handläggningsrutiner](verksamhetsfloden-och-handlaggningsrutiner.md)

## 1. Syfte

Systemet ska göra det möjligt att registrera ett ärende med mycket få uppgifter och därefter komplettera samma ärende med aktiviteter, handlingar, ansvar, tidsfrister, avvikelser och beslut.

Specifikationen beskriver både den implementerade IndexedDB-prototypen och målarkitekturen för SaaS. Avsnitt om server-API, tenantisolering och produktionslagring är målbild; avsnittet om användargränssnitt beskriver aktuell prototypfunktion om inget annat anges.

Den enkla vägen är standard. Den utökade strukturen visas eller efterfrågas först när användaren behöver den eller när en verksamhetsregel kräver den.

Det får inte finnas separata datamodeller för enkla och avancerade registreringar. En snabbregistrering ska från början skapa ett fullvärdigt ärende med stabil identitet, ägarskap och revisionsinformation.

## 2. Grundprinciper

1. **En gemensam ärendemodell.** Alla registreringar som kräver fortsatt spårbarhet lagras som ärenden.
2. **Progressiv visning.** Gränssnittet visar endast de fält och komponenter som behövs för den aktuella uppgiften.
3. **Progressiv validering.** Fler uppgifter blir obligatoriska först när användaren aktiverar en funktion som behöver dem.
4. **Ingen konvertering.** Ett enkelt ärende kompletteras på plats och byter inte identitet när det får mer struktur.
5. **Strukturerade relationer.** Mentorer, handläggare, aktiviteter och handlingar kopplas med ID, aldrig genom namn i fritext.
6. **Spårbara förändringar.** Betydelsefulla ändringar skapar oföränderliga händelser med tidpunkt och aktör.
7. **Separera observation och beslut.** Ett avvikande aktivitetsresultat ska inte automatiskt innebära att ärendet avslutas.

## 3. Begreppsmodell

### 3.1 Ärende

Ärendet är den sammanhållande datanoden för en handläggningsprocess.

- Ett ärende kan vara kopplat till högst en mentor.
- En mentor kan ha flera ärenden över tid.
- Ett generellt verksamhetsärende kan sakna mentor.
- Ett ärende kan ha en ansvarig handläggare och flera medhandläggare.
- Ett ärende kan existera utan aktiviteter eller handlingar.

### 3.2 Aktivitet

En aktivitet beskriver något som ska utföras eller följas upp inom ärendet.

- Aktiviteten tillhör exakt ett ärende.
- Aktiviteten ärver normalt ärendets ansvariga handläggare.
- Aktiviteten kan uttryckligen tilldelas en annan handläggare.
- En avslutad aktivitet har ett strukturerat resultat.
- Ett avvikande resultat kan skapa behov av ett separat ställningstagande.
- En aktivitet kan vara enkel eller guidad. Ett aktivitetssteg är ett internt moment och har därför inte egen ansvarig, eget förfallodatum eller en egen rad i arbetskön.

### 3.3 Handling

En handling är ett registrerat underlag, dokument eller en tjänsteanteckning.

- Handlingen tillhör exakt ett ärende.
- Handlingen kan valfritt kopplas till en aktivitet.
- Filinnehåll och metadata ska hållas åtskilda i den framtida SaaS-lösningen.

### 3.4 Händelse

En händelse är en automatiskt skapad och oföränderlig post i ärendets historik.

Exempel:

- Ärendet skapades.
- Ansvarig handläggare ändrades.
- En aktivitet avslutades.
- En handling registrerades.
- Ärendet pausades eller avslutades.

Händelsen är inte en aktivitet och ska inte kunna redigeras i efterhand.

### 3.5 Avvikelse och ställningstagande

Ett aktivitetsresultat kan markeras som avvikande. Avvikelsen beskriver att resultatet behöver bedömas, inte vem som ska utföra nästa steg.

En avvikelse ska ha ett separat ställningstagande med något av följande utfall:

- Fortsätt handläggningen.
- Begär komplettering.
- Pausa ärendet.
- Avsluta ärendet.

Om mentorn behöver göra något ska handläggaren skapa en aktivitet som beskriver den egna åtgärden, exempelvis `Begär nytt registerutdrag från mentorn`. Aktiviteten ansvaras fortfarande av en handläggare, medan det kan anges att den inväntar mentorn.

## 4. Datamodell

Fältnamnen nedan är logiska kontrakt. Prototypen kan använda JavaScript-objekt, medan SaaS-versionen bör använda motsvarande databastabeller och validerade API-kontrakt.

Alla verksamhetsposter ska bära `tenantId`. Referenser mellan poster får endast skapas inom samma tenant. Alla tidsstämplar lagras som UTC i ISO 8601-format och konverteras till användarens tidszon vid visning.

```ts
type CaseStatus =
  | "new"
  | "in_progress"
  | "waiting"
  | "paused"
  | "decision_required"
  | "closed";

interface CaseRecord {
  id: string;
  tenantId: string;
  number: string;
  caseTypeId: string;
  caseTypeVersion: number;
  organizationUnitId: string;
  title: string;
  description: string;
  mentorId: string | null;
  parentId: string | null;
  supportCaseId: string | null;
  sourceMatchingCaseId: string | null;
  details: Record<string, unknown>;
  status: CaseStatus;
  priority: "low" | "normal" | "high";
  dueDate: string | null;
  pauseReasonCode: string | null;
  pauseNote: string | null;
  resumeAt: string | null;
  closeReasonCode: string | null;
  closeNote: string | null;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  closedAt: string | null;
  closedBy: string | null;
}
```

Ansvarig handläggare lagras endast som en assignment. `CaseRecord` får inte innehålla ett duplicerat fält för ansvarig.

När ett ärende avslutas ska `closedAt` och `updatedAt` sättas till samma kommandotidpunkt och `closedBy` respektive `updatedBy` till den användare som utför kommandot. Senare tillåtna ändringar kan flytta `updatedAt`, men får inte skriva över den ursprungliga avslutstidpunkten. I personposters länkade ärendelistor visas avslutstid för avslutade ärenden och senaste ändringstid för övriga ärenden. Personpostens egen `updatedAt` är ett separat revisionsfält.

```ts
interface CaseHandlerAssignment {
  id: string;
  tenantId: string;
  caseId: string;
  handlerId: string;
  role: "responsible" | "co_handler";
  version: number;
  assignedAt: string;
  assignedBy: string;
  endedAt: string | null;
  endedBy: string | null;
}
```

Databasen ska garantera högst en aktiv assignment med rollen `responsible` per ärende.

### 4.1 Versionsstyrda definitioner

Ärende- och aktivitetsmallar är versionsstyrda och immutabla efter publicering. Endast livscykelstatus får ändras på en publicerad version. Ett befintligt ärende fortsätter använda den version som gällde när ärendet skapades.

```ts
interface CaseTypeDefinition {
  id: string;
  tenantId: string;
  version: number;
  name: string;
  status: "draft" | "published" | "retired";
  defaultPriority: "low" | "normal" | "high";
  mentorMode: "required" | "optional" | "none";
  helpText: string;
  registrationHint: string;
  workInstruction: string;
  detailFieldIds: string[];
  activityTemplateRefs: Array<{ templateId: string; version: number }>;
  nextCaseTypeId: string | null;
}

interface ActivityTemplateDefinition {
  id: string;
  tenantId: string;
  version: number;
  status: "draft" | "published" | "retired";
  title: string;
  sortOrder: number;
  workInstruction: string;
  allowedStatuses: ActivityStatus[];
  requiresResultOnCompletion: boolean;
  quickCompletionResultCodes: string[];
  resultDefinitions: ResultDefinition[];
  activityMode: "simple" | "guided";
  stepTemplate?: ActivityStepTemplate;
}

interface ActivityStepTemplate {
  version: number;
  steps: ActivityStepDefinition[];
}

interface ActivityStepDefinition {
  id: string;
  title: string;
  nextAction: string;
  checkpoint: string;
  required: boolean;
  active: boolean;
  sortOrder: number;
}

interface ResultDefinition {
  code: string;
  label: string;
  classification: "acceptable" | "deviation";
  requiresNote: boolean;
}
```

`nextCaseTypeId` är ett valfritt förslag till nästa registrering. Det skapar inte ett följdärende och uttrycker inte alla domänrelationer. Systemstyrda relationer, exempelvis att en matchning måste tillhöra ett stödärende eller att ett mentoruppdrag måste referera till en accepterad matchning, valideras separat.

```ts
interface CaseTypeRelationshipDefinition {
  id: string;
  fromCaseTypeId: string;
  toCaseTypeId: string;
  kind: "suggested_successor" | "linked_successor" | "prerequisite" | "process_step";
  description: string;
  systemManaged: boolean;
}
```

### 4.1.1 Stödområden och matchningsunderlag

Stödområden är en versionsstyrd referensdomän som återanvänds i stödärenden, mentorprofiler och matchning. Tekniska ID:n är globala och stabila. Kommunen kan välja ur katalogen men får inte skapa lokala fritext-ID:n som gör data inkompatibla mellan kommuner.

Geografiska områden är däremot en kommunägd katalog eftersom lokala områdesnamn varierar. Varje post har ett stabilt lokalt ID, ett visningsnamn och aktiv status. Språk och återkommande tillgänglighetsfönster kommer från gemensamma kataloger. Mentorprofil och stödprofil lagrar ID-listor; visningsnamn och äldre fritext är projektioner för läsning och bakåtkompatibilitet.

```ts
interface SupportAreaDefinition {
  id: string;
  catalogVersion: number;
  categoryId: string;
  title: string;
  publicDescription: string;
  scopeNote: string;
  status: "published" | "retired";
}

interface TenantSupportAreaSelection {
  tenantId: string;
  supportAreaId: string;
  enabled: boolean;
  public: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface MentorMatchingProfile {
  id: string;
  tenantId: string;
  mentorId: string;
  version: number;
  status: "active" | "superseded";
  area: string | null;
  availability: string | null;
  meetingModes: string[];
  availableAssignmentCapacity: number | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

interface MentorMatchingSupportArea {
  tenantId: string;
  profileId: string;
  mentorId: string;
  supportAreaId: string;
  confidenceLevel: "some" | "good" | "very_good";
  experienceLevels: Array<"lived" | "practical" | "trained">;
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

interface MentorMatchingLanguage {
  tenantId: string;
  profileId: string;
  mentorId: string;
  languageId: string;
  label: string;
  conversationLevel: "works_well" | "fluent";
}

interface SupportMatchingProfile {
  id: string;
  tenantId: string;
  supportCaseId: string;
  parentId: string;
  version: number;
  status: "active" | "superseded";
  area: string | null;
  availability: string | null;
  preferredMeetingModes: string[];
  sharedExperiencePreference: string | null;
  complementarySupport: Record<string, unknown> | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

interface SupportMatchingSupportArea {
  tenantId: string;
  profileId: string;
  supportCaseId: string;
  supportAreaId: string;
  priority: "primary" | "additional";
}

interface SupportMatchingLanguage {
  tenantId: string;
  profileId: string;
  supportCaseId: string;
  languageId: string;
  label: string;
  preference: "preferred" | "accepted";
}

interface MatchingAssessmentSnapshot {
  id: string;
  tenantId: string;
  matchingCaseId: string;
  supportCaseId: string;
  mentorId: string;
  parentId: string;
  supportProfile: Record<string, unknown>;
  mentorProfile: Record<string, unknown>;
  overlapSupportAreaIds: string[];
  createdAt: string;
  createdBy: string;
}
```

En mentor har högst en aktiv matchningsprofil, men tidigare versioner bevaras. Profilen är den auktoritativa datakällan för matchningsuppgifter; mentorposten innehåller person- och godkännandeuppgifter. Stödområden och språk är underposter till profilen. Geografiska områden och tillgänglighetsfönster lagras som stabila ID-listor på profilversionen och får därför variera oberoende av mentorpostens livscykel.

Mentorn markerar endast områden där hen vill bli matchad. `confidenceLevel` är den primära självskattningen av hur trygg mentorn är att ge vardagsnära stöd inom området. Erfarenhetsgrunderna är sekundärt underlag: `lived` betyder egen eller närståendes erfarenhet, `practical` betyder erfarenhet av att stödja andra och `trained` betyder utbildning eller yrkeserfarenhet. Minst en grund krävs för ett valt område. Uppgifterna innebär inte professionell behörighet.

Varje stödärende har högst en aktiv matchningsprofil. Förälderns uppgifter gäller det avgränsade stödbehovet och får inte lagras som en permanent profil på personen. Om området ännu inte är känt används inga påhittade standardvärden; ärendet markeras för komplettering.

När ett matchningsärende skapas sparas en oföränderlig `MatchingAssessmentSnapshot` med de profilversioner, områden, språk och praktiska förutsättningar som handläggaren bedömde. Senare ändringar av mentor- eller stödprofilen får inte skriva om en historisk matchning. När ett mentoruppdrag skapas refererar uppdraget till denna snapshot och behåller samtidigt oföränderliga referenser till stödärendet och matchningsärendet.

Matchningsläsmodellen får beräkna mängden gemensamma områden och använda antalet för sortering. Den får inte automatiskt acceptera eller neka en matchning. Godkännandestatus, tillgänglighet och behörighet är hårda filter. Stödområden, språk, geografi, erfarenhetsnivå och parternas önskemål är beslutsunderlag som visas öppet för handläggaren.

Ett inaktiverat eller pensionerat område döljs i nya registreringar men ska fortfarande kunna läsas i historiska poster. En betydelseförändring får därför inte genomföras genom att återanvända samma ID för ett annat begrepp.

Administrationsvyn ska skilja på kommunens valbara nästa ärendetyp och systemstyrda relationer. Kommunens val får vara högst en föreslagen efterföljare per ärendetyp och får inte skapa en cykel. En systemstyrd relation får visas men inte ändras genom den förenklade administrationsvyn.

Administrationsvyn för ärendetyper är avsiktligt begränsad. Administratören kan ändra hjälptext, registreringsanvisning, mentorkoppling och välja kompletterande fält ur en centralt definierad fältkatalog. Namn, tekniskt ID, datatyp och lagringsnyckel kan inte ändras i denna vy. Därmed kan verksamheten anpassa formulären utan att skapa egna inkompatibla datamodeller.

Varje sparad ändring publicerar en ny version och pensionerar den tidigare versionen. Nya ärenden använder den nya publicerade versionen. Befintliga ärenden fortsätter använda sin sparade `caseTypeVersion`. Om ett fält tas bort från en ny version döljs det i nya registreringar, men tidigare sparade värden raderas inte.

### 4.1.2 Ärendebeskrivning och arbetsanteckningar

Ärendets aktuella `description` används som läsmodell, medan varje ändring sparas oföränderligt för revision:

```ts
interface CaseDescriptionVersion {
  id: string;
  tenantId: string;
  caseId: string;
  text: string;
  version: number;
  createdAt: string;
  createdBy: string;
}

interface CaseNoteVersion {
  id: string;
  tenantId: string;
  caseId: string;
  noteId: string;
  targetType: "case" | "activity" | "interaction";
  targetId: string | null;
  text: string;
  version: number;
  supersedesVersionId: string | null;
  createdAt: string;
  createdBy: string;
}
```

En ändring av beskrivningen uppdaterar `Case.description`, ökar ärendets version och skapar `CaseDescriptionVersion` i samma kommando. En rättad anteckning får samma stabila `noteId`, högre `version` och `supersedesVersionId`; den tidigare versionen skrivs aldrig över. Formella tjänsteanteckningar ligger fortsatt i `CaseDocument`.

Historikvyn är en läsprojektion av `CaseEvent` och de versionshanterade anteckningarna. En händelse som endast pekar på en anteckningsversion visas inte som en extra rad. Tekniska händelser finns kvar men markeras och tonas ned.

### 4.2 Aktiviteter

```ts
type ActivityStatus =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "completed"
  | "not_applicable";

interface CaseActivity {
  id: string;
  tenantId: string;
  caseId: string;
  templateId: string;
  templateVersion: number;
  title: string;
  instruction?: string | null;
  status: ActivityStatus;
  resultCode: string | null;
  resultClassification: "acceptable" | "deviation" | null;
  handlerIdOverride: string | null;
  waitingForParty: "mentor" | "handler" | "external" | null;
  dueDate: string | null;
  sortOrder: number;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  completedAt: string | null;
  completedBy: string | null;
  guidedState?: GuidedActivityState;
}
```

En enkel aktivitet saknar `guidedState` och fungerar som tidigare. När en guidad aktivitet skapas kopieras den publicerade stegmallen till en oföränderlig snapshot på aktiviteten:

```ts
type ActivityStepStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "blocked"
  | "not_applicable";

interface GuidedActivityState {
  templateId: string;
  templateVersion: number;
  stepTemplateVersion: number;
  steps: Array<ActivityStepDefinition & {
    status: ActivityStepStatus;
    reason: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
    completedAt: string | null;
    completedBy: string | null;
  }>;
}
```

Snapshoten gör att en publicerad ändring av stegordning, text, obligatoriskhet eller aktivt läge endast påverkar nya aktiviteter. Varje stegändring sparar aktör och tidpunkt och skapar en händelse i ärendeloggen. Ett obligatoriskt steg måste vara `complete`; endast ett valfritt steg får sättas till `not_applicable`, och då krävs en orsak. Om något steg är `blocked` härleds aktivitetens övergripande status till `waiting`. Arbete med separat ansvar eller bevakningsdatum ska fortfarande skapas som en riktig aktivitet.

Aktivitetens resultat är skilt från stegens status. En guidad aktivitet kan inte avslutas förrän samtliga obligatoriska steg är klara, men färdiga steg avslutar aldrig aktiviteten automatiskt.

En aktivitetsmall kan dessutom ange en stabil koppling till en strukturerad registrering:

```ts
interface ActivityWorkInputDefinition {
  kind: string;
  featureKey: string;
  label: string;
  required: boolean;
}

type WorkInputState = "not_started" | "in_progress" | "complete";
```

`featureKey` är en stabil funktionsnyckel, exempelvis `mentor.identity`, `case.matching` eller `case.assignment-followup`. En central router löser nyckeln tillsammans med `caseId`, `activityId` och vid behov `mentorId` till aktuell adress. Aktivitetsmallar och lagrade poster får inte innehålla hårdkodade vyadresser.

`WorkInputState` lagras inte på aktiviteten. Den härleds från den kanoniska verksamhetsposten, exempelvis identitetsuppgifterna på mentorn, matchningsunderlaget, mötet eller uppdragsuppföljningen. Läsmodellen ska även lämna `updatedAt` och `updatedBy` från samma post. Därmed kan aktivitetslista, aktivitetskort och målvy visa samma status utan parallella statusfält.

Om `required` är sant får aktiviteten inte avslutas förrän läsmodellen ger `complete`. Avslutande resultat ska då vara inaktiverade och aktivitetsvyn ska förklara vilken registrering som saknas samt ge en direktlänk dit. Ett avvikande verksamhetsresultat och ett ofullständigt registreringsunderlag är olika tillstånd och får inte blandas ihop.

`resultClassification` är en snapshot av den versionsstyrda resultatdefinitionen. Systemet ska inte räkna om historiska aktivitetsresultat mot en senare mallversion. Kombinationen `tenantId`, definitions-ID och version identifierar alltid exakt en definition. Högst en version per definitions-ID får vara `published` samtidigt.

Även en manuellt tillagd aktivitet ska referera till en versionsstyrd standardmall för ad hoc-aktiviteter. Rubriken kan vara fri, men status- och resultatreglerna är därmed alltid definierade.

Aktivitetens effektiva ansvariga är `handlerIdOverride` när det är satt, annars ärendets aktiva ansvariga assignment. Om båda saknas visas `Ej tilldelad`. Ett byte av ärendets ansvariga slår därför igenom på alla aktiviteter som inte är särskilt tilldelade, utan att aktivitetsraderna behöver skrivas om.

`quickCompletionResultCodes` finns kvar i mallmodellen för bakåtkompatibilitet och administration, men den aktuella klienten avslutar inte aktiviteter direkt från listan. Alla resultat väljs i aktivitetsvyn, där resultat, eventuell anteckning och avslutningskommando visas tillsammans. Resultatfältet får aldrig förväljas och ett valt resultat ska kunna avmarkeras innan aktiviteten avslutas.

När alla tillämpliga aktiviteter är `completed` eller `not_applicable`, inga öppna avvikelser finns och ärendet inte är avslutat eller pausat, är ärendet redo för ett uttryckligt nästa beslut. Detta är en härledd läsmodell och inte en ny lagrad ärendestatus.

```ts
interface CaseCompletionReadModel {
  caseId: string;
  activitiesCompleted: boolean;
  caseStillOpen: boolean;
  openDeviationCount: number;
  suggestedAction:
    | { type: "open_linked_case"; caseId: string }
    | { type: "create_successor"; caseTypeId: string }
    | { type: "review_case" }
    | { type: "close_case" };
  automaticEffects: [];
}
```

`automaticEffects` är tom för ett vanligt aktivitetsavslut. Ett sammansatt verksamhetskommando, exempelvis ett godkännandebeslut, ska i stället ha ett eget kontrakt som deklarerar och loggar samtliga effekter.

### 4.3 Avvikelser och ställningstaganden

En avvikelse är en egen post med tydlig livscykel. Ett nytt ställningstagande ersätter aldrig ett tidigare genom uppdatering; det skapas som en ny post som refererar till det ställningstagande som ersätts.

```ts
interface ActivityDeviation {
  id: string;
  tenantId: string;
  caseId: string;
  activityId: string;
  activityCompletionEventId: string;
  resultCode: string;
  status: "open" | "resolved" | "superseded";
  version: number;
  openedAt: string;
  openedBy: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  activeDecisionId: string | null;
}

interface DeviationDecision {
  id: string;
  tenantId: string;
  deviationId: string;
  outcome: "continue" | "request_supplement" | "pause_case" | "close_case";
  reasonCode: string;
  note: string;
  resumeAt: string | null;
  supersedesDecisionId: string | null;
  decidedAt: string;
  decidedBy: string;
}
```

Det får finnas högst en avvikelse per avslutningstillfälle, identifierat av `activityCompletionEventId`, och högst en öppen avvikelse per aktivitet. Ett ställningstagande som ändras kräver särskild behörighet, motivering och en ny `DeviationDecision`.

### 4.4 Handlingar och kontakttillfällen

```ts
interface CaseDocument {
  id: string;
  tenantId: string;
  caseId: string;
  activityId: string | null;
  meetingId: string | null;
  type: "incoming" | "created" | "service_note";
  title: string;
  description: string;
  documentDate: string;
  storageObjectId: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  informationClass: "normal" | "restricted";
  supersedesDocumentId: string | null;
  createdAt: string;
  createdBy: string;
}

interface InteractionParticipant {
  id: string;
  partyType: "parent" | "mentor" | "handler" | "external";
  partyId: string | null;
  displayName: string;
  required: boolean;
  invitationStatus: "not_prepared" | "prepared" | "handed_over";
  responseStatus: "no_response" | "accepted" | "tentative" | "declined";
  attendanceStatus: "not_recorded" | "attended" | "did_not_attend";
}

interface Interaction {
  id: string;
  tenantId: string;
  kind: "meeting" | "phone" | "email" | "visit" | "other";
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  direction: "incoming" | "outgoing" | "not_applicable";
  startsAt: string;
  endsAt: string | null;
  caseId: string | null;
  activityId: string | null;
  organizerId: string;
  participants: InteractionParticipant[];
  title: string;
  mode: "physical" | "digital" | "phone" | "email" | "visit" | "other";
  location: string;
  invitationText: string;
  summary: string;
  nextStep: string;
  rescheduledFromInteractionId: string | null;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}
```

`Interaction` är den kanoniska posten för både planerade möten och genomförda kontakter. Ärendekopplingen är valfri för ren planering, men `activityId` får endast anges tillsammans med `caseId`. Handläggningsdokumentation, aktivitetsunderlag och statuspåverkan kräver ärendekoppling. Ett planerat möte kan därför skapas fristående och kopplas senare utan att ett konstruerat ärende behöver skapas.

Organisatören är skild från deltagarlistan och kan därför ansvara för bokningen utan att själv delta. Kallelsesvar och faktisk närvaro är skilda uppgifter. Ett bokat möte övergår till samma posts genomförandefas och ska inte registreras en gång till som en separat kontakt. I prototypen betyder `prepared` att en kallelsetext har skapats; systemet får inte påstå att ett meddelande har skickats utan en faktisk e-post- eller kalenderintegration.

För den guidade aktiviteten `Genomför första mötet` fungerar ett ärende- och aktivitetskopplat möte som checkpunkt. En bokning markerar `Förbered`, `Hitta tid` och `Boka och kalla` som klara och gör `Genomför` aktuellt. Status `completed` med en saklig sammanfattning markerar även `Genomför` och `Dokumentera` som klara. Mötesändringen registrerar vilka steg som flyttades, men väljer inte aktivitetens slutresultat.

Statusarna `cancelled` och `no_show` uppfyller aldrig ett aktivitetskrav på bokat eller genomfört möte. Ombokning skapar en ny `Interaction` vars `rescheduledFromInteractionId` pekar på den inställda eller uteblivna posten. Originalposten och dess historik skrivs inte över av den nya tiden.

`CaseMeeting` och äldre mötesposter läses under övergången genom en kompatibilitetsprojektion till `Interaction`. Nya ärendekopplade möten skriver båda representationerna tills alla befintliga läsmodeller använder den kanoniska interaktionsposten.

### 8.7 Global kommunikationshantering

`CommunicationRecord` är den kanoniska posten för kommunikation som passerar en teknisk kanal in i eller ut ur systemet. Den är skild från `Interaction`: mötet eller kontakttillfället beskriver verksamhetshändelsen, medan kommunikationsposten beskriver det meddelande som en kanaladapter tog emot eller försökte leverera. Samma kommunikationspost kan länkas till ärende, möte, aktivitet eller annan verksamhetspost utan att innehållet kopieras dit.

Varje post ska minst innehålla tenant, riktning, kanal, leverantör, leverantörsläge, extern meddelandeidentitet, avsändare, mottagare, ämne/innehåll, objektlänkar, aktuell leveransstatus samt en append-only-lista med leveranshändelser. En utgående post skapas genom ett sändningskommando till en kanaladapter. En inkommande post skapas genom motsvarande mottagningskommando från leverantörens webhook eller inkorgskoppling. Gränssnittet får inte skapa en fristående loggrad som påstår att ett meddelande har skickats.

Prototypens `email-demo` och `sms-demo` implementerar samma adapterkontrakt som framtida produktionsleverantörer. De returnerar ett externt demo-id och status `registered_demo`, men utför ingen nätverksleverans. Produktionsadaptrar ska köras serverbaserat, hålla leverantörshemligheter utanför klienten, verifiera inkommande signaturer, använda idempotensnycklar och översätta leveranskvittens till samma gemensamma statusmodell.

Det globala kommunikationsregistret är en läsmodell över samtliga `CommunicationRecord` för aktuell tenant. Objektvyer, exempelvis mötet eller ärendet, visar filtrerade utdrag ur samma poster. De får inte lagra en separat redigerbar kopia av kommunikationshistoriken.

En rättelse av en handling skapar en ny version via `supersedesDocumentId`; den tidigare versionen skrivs inte över. När en handling registreras från en aktivitet sätts både `caseId` och `activityId`. Den visas då både i ärendets handlingslista och som underlag på aktiviteten. En tjänsteanteckning saknar filobjekt, medan en uppladdad fil ska få metadata, kontrollsumma och filinnehåll registrerade som en sammanhållen operation utan tomma platshållarposter.

### 4.5 Händelser och kommandospårning

```ts
type CaseEventType =
  | "case_created"
  | "case_updated"
  | "case_description_updated"
  | "case_note_created"
  | "case_note_corrected"
  | "assignment_changed"
  | "activity_updated"
  | "deviation_opened"
  | "deviation_decided"
  | "document_registered"
  | "registration_added_to_case"
  | "meeting_registered"
  | "interaction_registered"
  | "case_paused"
  | "case_resumed"
  | "case_closed"
  | "case_reopened";

interface CaseEvent {
  id: string;
  tenantId: string;
  caseId: string;
  eventType: CaseEventType;
  schemaVersion: number;
  entityType: "case" | "case_note" | "activity" | "deviation" | "document" | "meeting" | "interaction" | "assignment" | "decision";
  entityId: string;
  actorId: string;
  occurredAt: string;
  correlationId: string;
  idempotencyKey: string;
  payload: Record<string, string | number | boolean | null>;
}

interface ProcessedCommand {
  tenantId: string;
  idempotencyKey: string;
  commandType: string;
  requestHash: string;
  response: Record<string, unknown>;
  processedAt: string;
}
```

Varje händelsetyp ska ha ett validerat payload-schema. Visningstext genereras från händelsetyp och payload. Personnummer, registerinnehåll och annan känslig fritext får inte kopieras till händelseloggen. Det sparade kommandosvaret ska begränsas till de ID:n och statusvärden som krävs för säker återuppspelning. Om samma idempotensnyckel återanvänds med ett annat `requestHash` ska kommandot avvisas som konflikt.

## 5. Obligatoriska invarianter

Följande regler ska gälla oavsett gränssnitt eller lagringsteknik:

1. Varje post tillhör exakt en tenant och får endast referera till poster inom samma tenant.
2. Ett ärende har alltid `id`, `tenantId`, `number`, `caseTypeId`, `caseTypeVersion`, `organizationUnitId`, `title`, `status`, `version`, `createdAt` och `createdBy`.
3. Kombinationen `tenantId` och `number` är unik.
4. Ärendenummer allokeras atomärt inom en tenant och återanvänds aldrig.
5. Ett ärende har högst en aktiv assignment med rollen `responsible`.
6. Ett ärende har högst en mentor.
7. Ett publikt stödområde måste vara aktiverat för samma tenant.
8. Ett stödärende får endast referera till kända stödområdes-ID:n.
9. Ett matchningsförslag får inte automatiskt övergå till uppdrag enbart på grund av stödområdesöverlappning.
7. Alla aktiviteter, avvikelser, handlingar, möten och händelser refererar till ett befintligt ärende.
8. En aktivitet med status `completed` måste ha ett resultat som är giltigt för aktivitetens sparade mallversion.
9. Ett avvikande resultat måste ha en tjänsteanteckning och skapa en `ActivityDeviation` i samma transaktion.
10. En öppen avvikelse sätter ärendet i `decision_required` om ärendet inte redan är pausat eller avslutat.
11. Paus kräver orsak och den handläggare som fattat ställningstagandet.
12. Avslut kräver avslutsorsak, tidpunkt och beslutsfattare.
13. När ett ärende avslutas markeras återstående aktiviteter som `not_applicable` i samma transaktion.
14. En betydelsefull förändring av ärende, aktivitet, ansvar, handling, möte eller beslut skapar en händelse i samma transaktion.
15. Händelser och publicerade mallversioner får inte uppdateras eller tas bort genom det vanliga användargränssnittet.
16. Ett kommando med samma `tenantId` och `idempotencyKey` får bara ge en verksamhetsmässig effekt.
17. Ärenden och relaterade poster tas inte bort genom normal handläggning. Rättelse, avslut och gallring är separata, behörighetsstyrda processer.

## 6. Snabbregistrering

### 6.1 Användarflöde

Standardkommandot ska vara `Snabbregistrera` eller ett verksamhetsnära kommando, exempelvis `Registrera kontakt` eller `Starta uppföljning`.

Minsta formulär:

- Registreringstyp.
- Mentor, om registreringen gäller en person.
- Rubrik eller sammanfattning.
- Kort beskrivning.

Följande sätts automatiskt:

- Ärende-ID och ärendenummer.
- Status `new`.
- Normal prioritet.
- Skapad av och skapad tidpunkt.
- Ansvarig handläggare när typen eller användarkontexten ger ett säkert standardvärde.

### 6.2 Applikationskommando

```ts
interface QuickRegisterCaseCommand {
  idempotencyKey: string;
  caseTypeId: string;
  mentorId?: string;
  title: string;
  description?: string;
  caseSelection:
    | { mode: "new" }
    | { mode: "existing"; caseId: string };
}

interface QuickRegisterCaseResult {
  outcome: "case_created" | "attached_to_case" | "selection_required";
  caseId: string | null;
  caseNumber: string | null;
  candidateCases: Array<{ id: string; number: string; title: string }>;
  suggestedNextActions: string[];
}
```

Innan formuläret bekräftas gör klienten ett läsanrop som söker kompatibla öppna ärenden för samma tenant, mentor och ärendetyp. Användaren får välja ett föreslaget ärende eller `Skapa nytt ärende`. Skrivkommandot ska i en transaktion:

1. Validera tenant, idempotensnyckel, ärendetyp och eventuell mentor.
2. Slå upp `caseTypeId` mot den publicerade `CaseTypeDefinition` som ska användas och låsa dess version.
3. Upprepa sökningen efter kompatibla öppna ärenden för att undvika att klientens förhandsvisning hunnit bli inaktuell.
4. Vid `new`, returnera `selection_required` utan skrivning om nya relevanta kandidater har tillkommit sedan förhandsvisningen; annars skapa ärendet med vald mallversion.
5. Vid `existing`, kontrollera att målärendet fortfarande är öppet, kompatibelt och tillåtet. Beskrivning krävs och registreras som en tjänsteanteckning utan att ärendets ursprungliga beskrivning skrivs över.
6. Skapa standardaktiviteter endast när ett nytt ärende skapas och ärendetypens mall kräver dem.
7. Skapa händelsen `case_created` eller `registration_added_to_case` i samma transaktion.
8. Returnera ärendets identitet och föreslagna nästa steg.

En snabbregistrering får inte skapa tomma aktivitets- eller handlingsposter som platshållare.

Dublettkontrollen ska vara rådgivande när verksamhetsreglerna tillåter parallella ärenden. Användaren ska alltid se vilket befintligt ärende en registrering kopplas till innan kommandot bekräftas. API:t ska därför erbjuda ett separat läsanrop för möjliga målärenden och får inte göra en dold automatisk koppling i skrivkommandot. För mentorärenden används mentor, ärendetyp och organisationsenhet som grund. För generella ärenden utan mentor måste ärendetypen ange en uttrycklig grupperingsnyckel; annars föreslår systemet inte automatiskt befintliga ärenden.

## 7. Komplettering av ett ärende

Efter sparandet visas ärendets sammanfattning och kommandot `Redigera ärendeuppgifter`.

Komplettering kan ske stegvis genom separata kommandon:

- Tilldela ansvarig.
- Lägg till aktivitet.
- Lägg till medhandläggare.
- Registrera handling.
- Ange prioritet eller förfallodatum.
- Registrera möte.
- Hantera avvikelse.
- Pausa eller avsluta ärendet.

Det ska inte finnas ett globalt fält som heter `Avancerat läge`. Användaren aktiverar i stället den komponent som behövs. När strukturerad information finns ska den fortsätta visas på ärendekortet.

Ett vanligt `CompleteActivityCommand` får endast ändra aktiviteten, registrera eventuell tjänsteanteckning eller möteskoppling, skapa nödvändig avvikelse och skriva händelser. Kommandot får inte stänga ärendet, skapa ett följdärende eller ändra en personpost som en dold bieffekt.

När `CaseCompletionReadModel.activitiesCompleted` blir `true` väljer användaren ett separat kommando:

- `CreateSuccessorCaseCommand` skapar ett uttryckligen valt och länkat följdärende,
- `CloseCaseCommand` avslutar ärendet med strukturerad orsak,
- `AddActivityCommand` fortsätter handläggningen i samma ärende,
- ett typbundet domänkommando, exempelvis `ApproveMentorCommand`, utför en dokumenterad sammansatt övergång.

Alla kommandon ska vara idempotenta och returnera vilka poster som skapades eller ändrades. Klienten visar svaret som bekräftelse och får inte härleda genomförda effekter enbart från den föreslagna nästa ärendetypen.

## 8. Validering efter användarens avsikt

Validering ska ske när informationen behövs, inte vid första registreringen.

| Åtgärd | Ytterligare obligatoriska uppgifter |
| --- | --- |
| Snabbregistrera | Typ och rubrik. Tenant, aktör, tidpunkt och idempotensnyckel sätts eller valideras av systemet. |
| Tilldela aktivitet | Giltig handläggare |
| Ange förfallodatum | Giltigt datum |
| Avsluta aktivitet | Uttryckligen vald resultatkod; notering, möte eller handling när resultatdefinitionen kräver det |
| Registrera avvikelse | Notering |
| Begära komplettering | Ansvarig och beskrivning av nästa steg |
| Pausa ärende | Orsak, beslutsfattare och valfritt bevakningsdatum |
| Avsluta ärende | Avslutsorsak, motivering och beslutsfattare |
| Återöppna aktivitet | Motivering och behörig aktör |
| Återöppna ärende | Motivering och behörig samordnare |

## 9. Tillstånd och övergångar

### 9.1 Ärendestatus

Ärendestatus lagras för effektiva sökningar men får endast uppdateras av domänlogiken. Efter varje transaktion beräknas nästa status enligt följande prioritet:

1. `closed` när ett giltigt avslut finns.
2. `paused` när ärendet uttryckligen har pausats.
3. `decision_required` när minst en öppen avvikelse saknar aktivt ställningstagande.
4. `in_progress` när minst en aktivitet eller annan handläggningsåtgärd kan utföras nu, eller när alla aktiviteter är klara men ett uttryckligt nästa verksamhetsbeslut återstår.
5. `waiting` när inget steg kan utföras nu och minst en öppen aktivitet inväntar mentor eller extern part.
6. `new` i övriga fall.

```text
new -> in_progress
new -> closed
in_progress -> waiting
in_progress -> decision_required
in_progress -> paused
in_progress -> closed
waiting -> in_progress
waiting -> paused
waiting -> closed
decision_required -> in_progress
decision_required -> waiting
decision_required -> paused
decision_required -> closed
paused -> in_progress
paused -> decision_required
paused -> closed
closed -> in_progress  (endast särskilt återöppningskommando)
```

Status ska ändras genom domänkommandon, inte genom fri direktredigering av statusfältet. Ett avslutat ärende kan bara återöppnas av behörig samordnare, med obligatorisk motivering. Återöppning återställer inte automatiskt aktiviteter som markerats `not_applicable`; nya eller uttryckligen återöppnade aktiviteter krävs.

### 9.2 Aktivitetsstatus

```text
not_started -> in_progress
not_started -> waiting
not_started -> completed
not_started -> not_applicable
in_progress -> waiting
in_progress -> completed
in_progress -> not_applicable
waiting -> in_progress
waiting -> completed
waiting -> not_applicable
completed -> in_progress       (endast återöppningskommando)
not_applicable -> not_started  (endast återöppningskommando)
```

En avslutad aktivitet får endast återöppnas med motivering och behörighetskontroll. Resultat och avslutningstid bevaras i händelseloggen, medan aktivitetens aktuella resultat nollställs. En eventuell öppen avvikelse markeras `superseded` i samma transaktion.

För guidade aktiviteter är stegens normala övergångar `not_started -> in_progress -> complete`. Ett steg kan gå från `not_started` eller `in_progress` till `blocked` och åter till `in_progress`. Endast valfria steg kan gå till `not_applicable`. Stegstatus får inte ändras efter att aktiviteten har avslutats annat än genom ett särskilt återöppningskommando.

### 9.3 Aktivitet och avvikelse

1. Handläggaren avslutar aktiviteten med ett resultat.
2. Systemet bedömer resultatkoden enligt aktivitetens mall.
3. Ett godtagbart resultat lämnar ärendets flöde öppet.
4. Ett avvikande resultat skapar en `ActivityDeviation` med status `open` och sätter ärendet i `decision_required`.
5. Handläggaren gör ett separat ställningstagande.
6. Ställningstagandet skapar en `DeviationDecision`, avslutar eller behåller avvikelsen enligt utfallet och skapar en händelse.
7. Om utfallet är `request_supplement` skapas en ny uppföljningsaktivitet eller väljs en befintlig aktivitet som nästa steg.

Exempel för belastningsregister:

- `shown_and_checked`: kontroll genomförd utan öppen avvikelse.
- `not_shown`: komplettering eller vänteläge behövs.
- `authenticity_unconfirmed`: ställningstagande krävs.
- `deviation_for_assessment`: lämplighetsbedömning krävs.

Känsligt innehåll ur belastningsregistret ska inte registreras i resultat eller fritext. Själva beslutet och den verksamhetsmässiga motiveringen registreras separat enligt organisationens behörighets- och informationshanteringsregler.

## 10. Användargränssnitt

### 10.1 Standardvy

Första vyn för en registrering ska vara ett kort formulär. Efter sparandet visas ett fokuserat ärendekort med:

- Ärendenummer och rubrik.
- Status.
- Relevanta personkopplingar och ansvarig, om de finns.
- Senaste registrering.
- Ett primärt rekommenderat nästa steg.
- En versionshanterad ärendebeskrivning.
- Aktivitetslistan i den första fliken `Arbete`.
- De senaste verksamhetsrelevanta händelserna.

Tomma eller irrelevanta faktarader ska inte visas. Ärendenummer, rubrik och status ska alltid vara synliga. Personkopplingar, ansvar, ändringstid och längre vägledning om ärendetypen är stängda från start men kan öppnas vid behov. Sällan använda ärendeuppgifter och åtgärder samlas också i en utfällbar sektion.

### 10.2 Utökad ärendevy

När användaren kompletterar ärendet används följande uppdelning:

- Arbete, i ordningen nästa åtgärd, ärendebeskrivning, aktiviteter, senaste händelser och kollapsade ärendeuppgifter.
- Handlingar.
- Kontakter, med möten, telefonsamtal, e-post och besök.
- Historik, med filtren `Allt`, `Anteckningar`, `Aktiviteter`, `Kontakter`, `Handlingar` och `Systemhändelser`.

Flikarna använder samma ärende-ID och laddar relaterade poster separat.

Menyn `Lägg till` öppnar befintliga registreringskommandon för aktivitet, kontakt, möte och handling samt ett separat kommando för fri ärendeanteckning. En fri aktivitet kräver endast `title`; ansvar ärvs från ärendet om `handlerIdOverride` är null och övriga planeringsfält är valfria.

### 10.3 Mentorpost

Mentorposten är ett personregisterkort och visar `Grunduppgifter`, `Ärenden` och `Mentorlogg`. Kontroller, möten och beslut får inte ha parallella redigeringsvyer på mentorposten utan öppnas i det ärende där de hör hemma. Mentorposten får visa en sammanfattning och ett rekommenderat nästa steg, men kommandot ska länka till rätt ärende och aktivitet.

Personnummer och verifieringssätt hör till mentorpostens identitetsuppgifter. Att identiteten har kontrollerats, kontrollens resultat och handläggningshistoriken hör till aktiviteten i ärendet om godkännande.

### 10.4 Systemförslag

Systemet kan föreslå struktur utan att fatta verksamhetsbeslut åt användaren.

Exempel:

- `Registreringen innehåller en avvikelse. Hantera avvikelsen?`
- `Mentorn saknar ansvarig handläggare. Tilldela nu?`
- `Ett återkopplingsdatum har angetts. Skapa bevakning?`
- `Ärendet har flera steg. Lägg till föreslagna aktiviteter?`

Förslag ska kunna avböjas när ingen verksamhetsregel kräver uppgiften.

### 10.5 Aktivitetsvy

Enkla aktiviteter ska utgå från det normala flödet `resultat → eventuell anteckning → avslut`. Tillåtna resultat visas som en lista med radioknappar och inget resultat är förvalt. Ett valt resultat kan avmarkeras innan sparande.

Guidade aktiviteter visar i stället en kompakt vertikal steglista. Färdiga steg är hopfällda men kan öppnas, och det aktuella steget är normalt utvecklat med relevanta checkpunkter och ett tydligt kommando för nästa åtgärd. Ärendets aktivitetslista visar bara `Steg X av Y`, aktuellt stegnamn och nästa åtgärd; stegen skapar inte egna rader. Resultat och avslut visas separat och är spärrade så länge ett obligatoriskt steg återstår.

Om aktiviteten har ett obligatoriskt `ActivityWorkInputDefinition` och dess härledda läge inte är `complete` ska avslutande resultat vara inaktiverade. Vyn visar kraven för fullständighet och ett direkt kommando till den kopplade registreringen. Domänspecifika lägen får ersätta det generella ordet `Fullständig`; intervju visas exempelvis som `Inte bokad`, `Bokad` eller `Genomförd`, där genomförd kräver passerad mötestid och sammanfattning.

Avslutningsknappen placeras i direkt anslutning till resultatet och anger nästa navigeringsmål, exempelvis nästa aktivitet eller återgång till ärendet. Ansvar, förfallodatum, vänteläge, `Pågår`, `Ej aktuell` och andra undantag finns under `Planering och undantag`.

### 10.6 Slutläge för aktivitetsflödet

När alla tillämpliga aktiviteter är klara och inga öppna avvikelser finns ska aktivitetsvyn visa en särskild beslutsyta. Den ska ange:

- att ärendet fortfarande är öppet,
- att aktivitetsresultat, aktör och tidpunkt har sparats,
- att inget följdärende eller registerkort har ändrats automatiskt,
- om ett länkat följdärende redan finns,
- nästa rekommenderade kommando och ett separat kommando för att avsluta ärendet.

Förslaget beräknas från länkat följdärende, ärendetyp och `nextCaseTypeId` i den ordningen. En befintlig efterföljare ska alltid öppnas i stället för att en dubblett skapas.

### 10.7 Översikt, register och responsivitet

`Översikt` ska visa arbetskön före processöversikten. Arbetskön har köfiltren `Aktiviteter`, `Otilldelade`, `Försenade` och `Ställningstaganden` och visar kolumnerna `Ärende` och `Nästa aktivitet`. Ett separat ansvarigfilter ska kunna visa alla ärendeansvariga, inloggad handläggares ärenden eller en vald handläggares ärenden. Filtret gäller alla köer utom `Otilldelade`, där det ska vara inaktiverat. Processöversikten visar antal öppna ärenden per ärendetyp. Centrala flöden visas direkt och sekundära samband kan fällas ut.

`Kalender` ska vara en separat huvudvy som projicerar befintliga `CaseMeeting.occurredAt`, öppna `CaseActivity.dueDate` och öppna `Case.dueDate`. Kalendern får inte skapa en parallell datumkälla. Månad, posttyp och ansvarig ska kunna filtreras. Varje post ska länka till sitt ärende, sin aktivitet eller ärendets mötesflik. Desktop visar en månadsmatris med måndag som första veckodag; mobil visar samma filtrerade poster i en dagsgrupperad agenda.

Ärenderegistret ska kunna sökas och filtreras på ärendetyp och status. Kolumnerna är `Ärende`, `Person`, `Läge` och `Ansvarig`; flera närliggande uppgifter får kombineras i samma cell för att begränsa bredden.

Grid- och flexbarn ska kunna krympa med `min-width: 0`. Ärendeflödet ska använda två kolumner vid mellanbredder och vertikal layout på mobil. Korttitlar får inte delas mitt i ord. Filter ska radbrytas på mobil. Breda tabeller får ha horisontell skroll inom `.table-responsive`, men `documentElement.scrollWidth` får inte överstiga `clientWidth` vid 1280 × 720 eller 390 × 844.

### 10.8 Kontaktmottagning och matchning

`Registrera kontakt` ska vara direkt nåbar som underåtgärd till `Kontaktmottagning`, från Översikt och i mottagningsvyn. Registreringen får inte kräva personkoppling. Den ska lagra kontaktväg, kontaktuppgift, saklig anteckning och fri nästa-steg-text i ett mottagningsärende.

Stöd- och matchningsunderlaget är `complete` först när stödets syfte, önskat resultat och minst ett bekräftat stödområde finns. Formuläret ska markera obligatoriska fält och visa en dynamisk checklista utan att hindra sparande av utkast.

Ett matchningsärende startas från stödärendet och får ett förifyllt namn. Mentorurvalet ska kunna sökas och filtreras. För varje mentor visas matchande och saknade kriterier. Användaren kan tillfälligt avaktivera kriterier för ett bredare urval utan att skriva om stödärendets sparade profil.

### 10.9 Administration av definitioner

Ärendetypsvyn ska visa och versionshantera hjälptext, registreringsanvisning, handläggningsanvisning, mentorkoppling, kompletterande fält, aktivitetsflöde och föreslagen nästa ärendetyp. Samordnaren kan skapa egna manuella ärendetyper, ordna deras aktivitetsmallar och inaktivera dem. Aktivitetsmallsvyn ska visa aktivitetsläge, handläggningsanvisning, statusregler, avslutsregel, resultatdefinitioner och användande ärendetyper. För en guidad mall kan systemadministratören lägga till, ordna, redigera och inaktivera steg. Där kan samordnaren också skapa egna generella aktivitetsmallar och inaktivera mallar som inte längre används av ett aktivt flöde. Äldre konfiguration för listavslut bevaras endast för bakåtkompatibilitet och visas inte i den aktuella administrationen.

Publicering är versionsstyrd, inte en ändring på plats. Ett nytt ärende sparar `caseTypeId` och exakt `caseTypeVersion`. Varje aktivitet sparar `templateId`, exakt `templateVersion` och vid behov en snapshot av `stepTemplateVersion`. När en använd aktivitetsmall publiceras i administrationsvyn skapas även en ny version av de berörda ärendetyperna med referens till den nya aktivitetsmallversionen. Pågående och avslutade ärenden och aktiviteter behåller sina tidigare versionsreferenser och stegsnapshots. Ingen automatisk migrering av historiska poster sker.

Inaktivering motsvarar säker borttagning: den publicerade versionen pensioneras och försvinner från nya val, men historiska poster och revisionsdata raderas inte. En ärendetyp får inte inaktiveras om en aktiv ärendetyp leder till den. En aktivitetsmall får inte inaktiveras om en aktiv ärendetyp använder den. Cirkulära följdflöden ska blockeras före publicering. Administrationsvyn ska före åtgärden visa antal öppna och avslutade poster samt aktiva beroenden.

De inbyggda kärntypernas namn, skapandeväg, föräldrakoppling och aktivitetsstruktur är strukturellt skyddade eftersom särskilda domänkommandon och valideringar är knutna till deras stabila ID:n. På motsvarande sätt är inbyggda aktivitetsmallars namn, resultatkoder och registreringskrav skyddade. Handledande texter och uttryckligen valbara verksamhetsfält får versionshanteras utan att kärnreglerna ändras. Egna typer och mallar kan administreras inom den generella modellen.

Stödområdesvyn ska visa den centrala katalogen grupperad efter kategori samt två lokala val per område: `Används av kommunen` och `Visas publikt`. Tekniskt ID, kategori och central betydelse är skrivskyddade. Om ett område inaktiveras ska gränssnittet förklara att historiska registreringar bevaras. Kommunen ska inte behöva administrera egna fält, regler eller matchningsalgoritmer för varje område.

Vyn `Geografiska områden` ska låta samordnaren lägga till, byta namn på och inaktivera lokala områden. Inaktivering är säker borttagning: området döljs i nya val men behåller ID och senast sparat namn i profiler, ärenden och matchningsögonblick. Ett befintligt ID får aldrig återanvändas för ett annat område.

Kommunen får redigera de fält som uttryckligen är verksamhetskonfiguration. Tekniskt ID, lagringsnycklar och systemstyrda relationer är skrivskyddade. Varje sparad ändring skapar en ny publicerad version och pensionerar den föregående; historiska ärenden och aktiviteter behåller sina versionsreferenser.

## 11. API och transaktioner i SaaS-versionen

API:t bör exponera domänkommandon och läsmodeller, inte enbart generell CRUD.

Förhandsvisningen inför snabbregistrering använder `GET /cases/registration-targets?mentorId={mentorId}&caseTypeId={caseTypeId}`. Svaret innehåller endast öppna, behörighetsfiltrerade och kompatibla ärenden.

Exempel på skrivkommandon:

```text
POST /cases/quick-register
POST /cases/{caseId}/activities
POST /cases/{caseId}/documents
POST /cases/{caseId}/meetings
POST /cases/{caseId}/assignments
POST /activities/{activityId}/assign
POST /activities/{activityId}/schedule
POST /activities/{activityId}/complete
POST /activities/{activityId}/reopen
POST /deviations/{deviationId}/decisions
POST /documents/{documentId}/supersede
POST /meetings/{meetingId}/revise
POST /cases/{caseId}/pause
POST /cases/{caseId}/resume
POST /cases/{caseId}/close
POST /cases/{caseId}/reopen
```

Varje skrivkommando ska:

1. Härleda tenant och aktör från den autentiserade sessionen, aldrig från redigerbara formulärfält.
2. Kontrollera tenantgräns, resursbehörighet och kommandospecifik roll.
3. Kräva `Idempotency-Key` och för ändringar av befintlig data även `expectedVersion`.
4. Validera aktuell version, referenser och tillståndsövergång.
5. Uppdatera domändata och eventuella relaterade poster.
6. Skriva händelsepost.
7. Genomföras atomärt.

Optimistisk låsning ska användas genom versionsfält på ärende och andra samtidigt redigerbara poster. Vid konflikt returneras `409 VERSION_CONFLICT` med aktuell version, och användaren måste läsa in den senaste informationen innan en ny ändring sparas. Ett lyckat kommando med samma idempotensnyckel ska returnera det tidigare resultatet utan att skapa nya poster eller händelser. `selection_required` från snabbregistrering är ett verksamhetsutfall, inte ett tekniskt fel.

Läsanrop ska alltid filtreras på sessionens tenant före övrig filtrering. Ett resurs-ID från en annan tenant ska ge samma externa svar som ett okänt resurs-ID.

Filuppladdning är inte atomär över databas och objektlagring och hanteras därför i tre steg: servern skapar en kortlivad uppladdningsreservation, klienten laddar upp filen till ett tillfälligt objekt och ett slutkommando verifierar kontrollsumma samt skapar `CaseDocument` och `CaseEvent` i en databastransaktion. Misslyckade eller övergivna reservationer rensas automatiskt. En handling blir synlig först efter lyckad slutregistrering.

## 12. Lagring i prototypen

IndexedDB behålls tills en serverbaserad databas införs.

Rekommenderade object stores:

```text
cases
caseAssignments
caseActivities
activityDeviations
deviationDecisions
caseDocuments
caseDocumentBlobs
caseMeetings
caseEvents
caseTypeDefinitions
activityTemplateDefinitions
tenantSupportAreaSelection
supportTickets
processedCommands
mentors
handlers
```

Rekommenderade index:

```text
cases.[tenantId+number] (unik)
cases.[tenantId+status]
cases.[tenantId+mentorId]
cases.[tenantId+organizationUnitId]
cases.[tenantId+updatedAt]
caseAssignments.[tenantId+caseId]
caseAssignments.[tenantId+handlerId]
caseActivities.[tenantId+caseId]
caseActivities.[tenantId+status]
caseActivities.[tenantId+handlerIdOverride]
caseActivities.[tenantId+dueDate]
activityDeviations.[tenantId+activityId]
activityDeviations.[tenantId+status]
deviationDecisions.[tenantId+deviationId]
caseDocuments.[tenantId+caseId]
caseDocuments.[tenantId+activityId]
caseDocuments.[tenantId+meetingId]
caseDocumentBlobs.[tenantId+documentId]
caseMeetings.[tenantId+caseId]
caseMeetings.[tenantId+occurredAt]
caseEvents.[tenantId+caseId]
caseEvents.[tenantId+occurredAt]
processedCommands.[tenantId+idempotencyKey] (unik)
tenantSupportAreaSelection.[tenantId+supportAreaId] (unik)
supportTickets.[tenantId+status]
supportTickets.[tenantId+createdAt]
```

Ändringar av schema ska göras genom versionsstyrda IndexedDB-migreringar. I prototypen pekar `storageObjectId` på en post i `caseDocumentBlobs`; i SaaS-versionen pekar det på behörighetsskyddad objektlagring. Ett kommando som berör flera stores ska köras i en enda `readwrite`-transaktion. Domänlagret ska upprätthålla invarianter som IndexedDB inte kan uttrycka som unika villkor, exempelvis högst en aktiv ansvarig assignment. Exempeldata ska använda samma kommandon, validering och relationer som användarskapad data.

Demoläget är en administrativ demonstrationsyta och använder stabila funktions-ID:n för länkar till systemets riktiga vyer. Återkoppling från ett demosteg lagras i `supportTickets` med kategorin `feature_request`, källan `demo_feedback` och demostegets stabila ID. Den får inte skapa eller ändra ett verksamhetsärende och ska inte lagras i en separat parallell kommentarsmodell.

## 13. Behörighet och spårbarhet

Minsta framtida roller:

- **Handläggare:** registrera och handlägga egna eller tilldelade ärenden.
- **Samordnare:** tilldela ansvar, se arbetsköer och fatta definierade beslut.
- **Administratör:** administrera användare, mallar och behörigheter.
- **Läsbehörig:** läsa tillåtna ärenden utan att ändra dem.

Roll ger inte automatiskt åtkomst till alla poster. Varje läsning och ändring ska först avgränsas till användarens tenant och därefter till de organisatoriska enheter och ärenden som användaren får hantera.

| Kommando | Handläggare | Samordnare | Administratör |
| --- | --- | --- | --- |
| Snabbregistrera och komplettera tillåtet ärende | Ja | Ja | Enligt särskild verksamhetsroll |
| Ändra eget eller särskilt tilldelat ansvar | Begränsat | Ja | Nej som standard |
| Göra ställningstagande vid avvikelse | Om tilldelad och delegerad | Ja | Nej som standard |
| Pausa eller avsluta ärende | Om delegerad | Ja | Nej som standard |
| Återöppna aktivitet eller ärende | Nej | Ja | Nej som standard |
| Publicera ny mallversion | Nej | Enligt särskild mallroll | Ja |

Systemet ska lagra stabilt användar-ID i revisionsfält. Visningsnamn kan visas i gränssnittet men får inte vara den tekniska identiteten. Aktör, tenant och tidpunkt ska sättas av systemet. Behörighetsavslag och försök till åtkomst över tenantgräns ska säkerhetsloggas utan att röja om posten finns.

Personnummer, registeruppgifter och andra skyddsvärda uppgifter ska ha fältspecifik åtkomstkontroll. Sökindex, händelsepayload och felmeddelanden får inte oavsiktligt exponera sådana uppgifter. Handlingar ska märkas med informationsklass och omfattas av organisationens regler för bevarande och gallring.

## 14. Läsmodeller och arbetsköer

Översikt och register ska byggas från samma ärendedata genom tenantavgränsade läsmodeller.

Exempel:

- Mina öppna aktiviteter.
- Otilldelade ärenden.
- Försenade aktiviteter.
- Ärenden som inväntar mentor.
- Avvikelser där ställningstagande saknas.
- Pausade ärenden med passerat bevakningsdatum.

Läsmodellerna får inte skapa egna kopior av domändata som kan redigeras separat. De får vara fördröjda men ska visa när de senast uppdaterades och får aldrig användas för behörighetsbeslut.

## 15. Migrering till serverbaserad SaaS

Övergången bör ske i följande ordning:

1. Inför validerade, tenantmedvetna domänfunktioner ovanpå IndexedDB.
2. Separera lagringsanrop bakom repository-gränssnitt.
3. Inför autentisering, tenantkontext och behörighetskontroll innan server-API:t öppnas för verksamhetsdata.
4. Inför server-API med samma kommandokontrakt och servergenererade revisionsfält.
5. Flytta persistens till relationsdatabas och filinnehåll till behörighetsskyddad objektlagring.
6. Migrera IndexedDB-data endast för uttryckligen valda prototypmiljöer; produktionsdata ska inte förlita sig på webbläsarlagring.

Exempel på repository-gränssnitt:

```ts
interface CaseRepository {
  getById(tenantId: string, id: string): Promise<CaseRecord | null>;
  save(tenantId: string, record: CaseRecord, expectedVersion: number): Promise<void>;
  list(tenantId: string, query: CaseQuery): Promise<CasePage>;
}
```

## 16. Acceptanskriterier

### Enkel registrering

- En handläggare kan skapa ett ärende med högst fyra manuella inmatningar.
- Ärendet får direkt ett stabilt ID, ärendenummer, aktör och tidpunkt.
- Inga aktiviteter eller handlingar behöver skapas för att ärendet ska vara giltigt.
- Efter sparande kan ärendet öppnas i den fullständiga ärendevyn.
- Om exakt ett kompatibelt öppet ärende finns kan registreringen kopplas dit efter att valet visats för användaren.
- Om flera kompatibla ärenden finns sparas inget förrän användaren har valt ärende eller uttryckligen valt att skapa ett nytt.
- Samma idempotensnyckel skapar aldrig dubbla ärenden eller registreringar.
- Två användare som samtidigt försöker skapa samma typ av ärende får en ny målärendekontroll innan någon möjlig dubblett skapas.

### Komplettering

- Ansvar, aktivitet, handling, möte och tidsfrist kan läggas till oberoende av varandra.
- Komplettering ändrar inte ärendets ID eller skapar en kopia.
- Befintliga värden flyttar inte position oförutsägbart mellan läs- och redigeringsläge.
- Varje betydelsefull ändring visas i loggen med användare och tidpunkt.
- En handling som läggs till från en aktivitet kopplas både till ärendet och aktiviteten och visas från båda sammanhangen.
- Ett möte kan registreras utan handling och kan senare kompletteras med tjänsteanteckning eller handling.

### Avslutade aktiviteter och nästa steg

- Resultatfältet är tomt tills användaren väljer ett resultat.
- Resultatalternativen visas i aktivitetsvyn, saknar förvalt värde och kan avmarkeras före avslut.
- Om en obligatorisk kopplad registrering inte är klar är avslutande resultat inaktiverade och kraven visas för användaren.
- Efter avslut öppnas nästa aktivitet eller ärendet enligt den text som visades på avslutningsknappen.
- När alla aktiviteter är klara ligger ärendet kvar som öppet tills ett separat kommando avslutar eller för processen vidare.
- Beslutsytan visar vad som sparades och att inget följdärende eller registerkort ändrades automatiskt.
- Ett befintligt länkat följdärende öppnas i stället för att en dubblett föreslås.
- Ett följdärende skapas endast efter ett uttryckligt användarkommando och länkas till ursprungsärendet.
- Ett sammansatt typbundet beslut visar och loggar alla effekter atomärt.

### Guidade aktiviteter

- Enkla aktiviteter fungerar utan stegdata och med oförändrat resultatflöde.
- En guidad aktivitet visar aktuellt steg och nästa konkreta åtgärd utan separata köposter för stegen.
- Obligatoriska steg blockerar aktivitetens slutresultat tills de är klara.
- Ett blockerat steg sätter aktiviteten i vänteläge och bevarar orsak, aktör och tidpunkt.
- Ett valfritt steg kan hoppas över endast med registrerad orsak.
- Ett bokat möte för `Genomför första mötet` flyttar aktiviteten till steget `Genomför`.
- Ett genomfört möte med anteckning gör även steget `Dokumentera` klart.
- Aktivitetens slutresultat väljs separat och sätts aldrig automatiskt av ett steg eller möte.
- En publicerad ändring av stegmallen påverkar endast nya aktiviteter.
- Första leveransen aktiverar guidning endast för `Genomför första mötet`; registerkontroll, intervju och matchning fortsätter som enkla aktiviteter tills pilotflödet har utvärderats.

### Avvikelse

- Ett avvikande resultat visas som `Ställningstagande krävs`, inte som det otydliga `Kräver åtgärd`.
- Gränssnittet visar att ställningstagandet tillhör ansvarig handläggare.
- Handläggaren kan fortsätta, begära komplettering, pausa eller avsluta.
- Paus och avslut kräver strukturerad orsak och loggas.
- Återstående aktiviteter blir `Ej aktuella` när ärendet avslutas.
- En avvikelse kan inte försvinna genom att aktivitetens status ändras direkt.
- Ett nytt ställningstagande ersätter inte historiken utan länkas till föregående beslut.

### Datakvalitet

- Inga person- eller handläggarkopplingar lagras enbart som namntext.
- Inga föräldralösa aktiviteter, handlingar eller händelser kan skapas.
- Exempeldata klarar samma regler som manuellt registrerad data.
- Upprepade sparkommandon utan ändringar skapar inte nya händelser.
- Två samtidiga ändringar med samma förväntade version kan inte båda lyckas.
- Data från en tenant kan inte läsas, sökas eller refereras från en annan tenant.
- Händelseloggen använder definierade händelsetyper och innehåller inte personnummer eller registerinnehåll.
- Ett ärende kan inte ha mer än en aktiv ansvarig assignment.
- En aktivitets effektiva ansvariga följer ärendets ansvariga om aktiviteten saknar särskild tilldelning.

## 17. Rekommenderad första implementation

1. Inför tenantavgränsning, versionsfält, gemensamma domänkommandon och repository-gränssnitt ovanpå IndexedDB.
2. Inför versionsstyrda ärende-, aktivitets- och resultatdefinitioner samt migrera befintlig exempeldata.
3. Inför `Snabbregistrera` med idempotens, kontroll av kompatibla öppna ärenden och ett minimalt giltigt ärende utan tomma underposter.
4. Lägg till `Redigera ärendeuppgifter` på ärendekortets översikt samt separata kommandon för ansvar, aktivitet, handling och möte.
5. Ersätt `Kräver åtgärd` med `Ställningstagande krävs` och inför `ActivityDeviation` samt versionsbevarande `DeviationDecision`.
6. Inför fullständiga kommandon för paus, avslut och behörighetsstyrd återöppning.
7. Lägg till IndexedDB-migreringar, atomära transaktioner och automatiska integritetskontroller.
8. Testa tenantisolering, samtidiga ändringar, idempotens, snabbregistrering och successiv komplettering med 1, 10 och 250 mentorer.
9. Testa slutläget efter sista aktiviteten för varje ärendetyp, inklusive befintligt följdärende, avvikelse, paus och sammansatt godkännandebeslut.

## 18. Avgränsningar

Denna specifikation definierar inte:

- Kommunens formella diarieförings- eller arkiveringsregler.
- Slutlig informationsklassning och gallringsplan; värdena `normal` och `restricted` är tekniska platshållare tills organisationens klassningsmodell har fastställts.
- Produktionsleverantör, autentisering, webhookadress och gallringsregler för e-post, SMS, e-arkiv, BankID och externa register. Prototypens e-post- och SMS-adaptrar utför ingen extern leverans.
- Exakt beslutsdelegation mellan kommunala roller.

Dessa delar måste fastställas tillsammans med verksamhetsansvarig, informationssäkerhetsansvarig och kommunens jurist innan produktionssättning.
