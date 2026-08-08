# AI-support

## Syfte

AI-supporten hjälper samordnare, handläggare, mentorer och besökande föräldrar att:

- hitta rätt funktion och rutin,
- förstå hur ett arbetsmoment ska utföras,
- registrera felrapporter,
- registrera utvecklingsförslag.

Supporten utför aldrig verksamhetsbeslut och ändrar inte mentor-, föräldra- eller ärendedata.

## Dataskydd

Klienten skickar endast frågetext, aktuell roll, aktuell vy och relevanta utdrag ur det lokala stödmaterialet. Registerposter skickas inte. Inmatning med personnummer blockeras både i klienten och serverfunktionen. Användaren får dessutom en synlig varning om att inte skriva känsliga uppgifter.

AI-anropet använder Responses API med `store: false`. API-nyckeln finns endast som servermiljövariabel och får aldrig läggas i klientkoden eller i Git.

## Driftlägen

1. **AI aktiverad:** serverfunktionen använder OpenAI och svarar utifrån det avgränsade stödmaterialet.
2. **AI inte aktiverad:** klienten använder den lokala supportsökmotorn. Frågor kan fortfarande registreras som lokala supportärenden.

Supportärenden sparas i prototypens IndexedDB. De visas under **Systemadministration / Supportärenden**. Eftersom prototypdata är lokal synkroniseras kön inte mellan webbläsare. Länken **Skicka även via e-post** öppnar ett adresserat meddelande till `support@programenta.se`.

## Aktivering

Lägg in följande hemlighet i Sites-miljön:

- `OPENAI_API_KEY` - obligatorisk för AI-svar.
- `OPENAI_SUPPORT_MODEL` - valfri modellinställning. Standard är `gpt-5.6-luna`.

Publicera sedan om sajten. Endpointen `POST /api/support` svarar med `503 AI_NOT_CONFIGURED` när nyckeln saknas; klienten växlar då automatiskt till lokalt stöd.

## Inför produktion

IndexedDB-kön ska ersättas av ett centralt supportregister med autentisering, behörighetskontroll, gemensam ärendehistorik, notifiering och fastställda gallringsregler. Prompt, stödmaterial och modellversion bör versionshanteras och loggas utan att frågetext med personuppgifter bevaras okontrollerat.
