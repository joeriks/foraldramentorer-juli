# Tekniskt format för utbildningsinnehåll

## Princip

Utbildningsinnehåll lagras som versionshanterade innehållspaket. Ett paket kan vara `material`, `course` eller `test` och har ett stabilt tekniskt ID samt ett versionsnummer.

Kommunens urval lagras separat som referenser till innehållspaket. Gemensamt material kopieras därför inte när en kommun väljer att använda det. En kurs tar automatiskt med de material och test som kursen refererar till.

## Gemensamma fält

- `id`: stabilt tekniskt ID
- `version`: positivt versionsnummer
- `type`: `material`, `course` eller `test`
- `scope`: `shared` för gemensamt bibliotek eller ett kommunägt omfång
- `title` och `summary`: sökbar metadata
- `bodyMarkdown`: presenterande text i Markdown
- `status`: exempelvis `draft`, `published` eller `retired`

## Varför hybridformat

Markdown används för rubriker, brödtext, listor, länkar och citat. Systembärande uppgifter lagras strukturerat:

- en kurs har en ordnad lista av moduler med referenser till innehållspaket,
- ett test har frågor, svarsalternativ, rätt svar och godkändgräns,
- genomförande, reflektionssvar och testförsök lagras separat från innehållet.

Detta gör innehållet portabelt utan att verksamhetslogik behöver döljas i egna Markdown-styrkoder. Formatet kan senare kompletteras med validerade direktiv för enklare interaktiva block, men direktiv får inte bära testfacit eller referensintegritet.

Rå HTML tillåts inte i Markdown-fältet. HTML behandlas som text för att innehåll från biblioteket inte ska kunna föra in körbar kod i kommunportalen.

## Versionshantering

Publicerat innehåll ändras genom att en ny version skapas. Ett pågående eller avslutat genomförande behåller referensen till den version som användes. Kommunen kan därefter välja när en ny publicerad version ska tas in i det egna urvalet.
