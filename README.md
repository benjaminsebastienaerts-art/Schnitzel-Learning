# Schnitzel Learning

Woordjes leren met typen, kaartjes, meerkeuze, spelling of Learn, met XP, levels en een dagelijkse streak. Werkt als app: installeerbaar op telefoon, tablet en computer, en ook zonder internet.

## Als app installeren

 Open deze link: https://tbalder.github.io/Schnitzel-Learning/ 
 dus niet de zip web-app openen

- **iPhone/iPad (Safari):** Deel-knop → *Zet op beginscherm*
- **Android (Chrome):** menu (⋮) → *App installeren* of *Toevoegen aan startscherm*
- **Windows (Chrome/Edge):** installeer-icoon rechts in de adresbalk
- **macOS:** Safari (Sonoma 14 of nieuwer): *Archief* → *Voeg toe aan Dock*. Chrome/Edge: installeer-icoon in de adresbalk.
- **Linux (Chrome/Chromium/Edge/Brave):** installeer-icoon in de adresbalk

Lokaal proberen kan ook: dubbelklik op `index.html`. Installeren en offline werken gaan dan niet, want dat vereist een link (https).

## Wat zit erin

- Lijsten per vak (bijv. Frans) met hoofdstukken erin.
- Vijf manieren van oefenen, in beide richtingen of door elkaar:
  - **Typen**: typ het antwoord.
  - **Kaartjes**: draai het kaartje om en zeg of je het wist.
  - **Meerkeuze**: kies uit vier opties. De foute opties komen uit je eigen lijst. Toets 1 t/m 4 werkt ook.
  - **Spelling**: bekijk het woord, verberg het en typ het uit je hoofd. Wordt streng nagekeken, ook accenten.
  - **Learn**: nieuwe woorden eerst met meerkeuze, daarna typen met de eerste letter, daarna zonder hulp. Een fout woord komt snel terug. Je stopt pas als alles geleerd is.
- **Hints** bij typen: eerst de eerste letter, daarna steeds een letter extra. Elke hint kost 3 XP en het woord gaat er dan niet op vooruit.
- Slim nakijken: een accent of lidwoord erbij of eraf, of een tikfoutje telt mee. Wil je het streng, zet dan *Streng nakijken* aan.
- Meerdere goede antwoorden: zet er een komma tussen (bijv. "mooi, knap").
- Woordjes die je nog niet beheerst apart oefenen.
- XP, levels, combo's en een streak voor dagen op rij.
- Woordjes plakken uit Studygo of een spreadsheet (tab, `-`, `=`, `;` of `|` ertussen werkt).
- **Voortgang** (knop bovenaan): hoeveel je per dag geoefend hebt (laatste 14 dagen), cijfers van vandaag en deze week, hoe goed je elke lijst beheerst en je lastige woorden. Met *Oefen deze* train je alleen de lastige woorden.
- **Lijsten delen**: zie hieronder.
- Back-up opslaan en terugzetten, onderaan het beginscherm.

## Een lijst delen met een klasgenoot

Open een lijst en kijk onder *Lijst beheren* bij *Delen*:

- **Kopieer link** (op telefoons: *Deel link*): stuur de link in een bericht. Je klasgenoot opent de link, ziet een voorbeeld en drukt op *Toevoegen*.
- **Bestand opslaan**: je krijgt een `.json`-bestand. Je klasgenoot kiest het bij *Lijst ontvangen* op het beginscherm. Gebruik dit bij hele grote lijsten, want een link kan dan te lang worden.

Alleen de woordjes gaan mee, niet je scores. De link bevat de woordjes zelf (er is geen server), dus iedereen met de link kan ze lezen. Een link werkt alleen vanaf de echte website, niet vanuit een los bestand.

## Woordjes toevoegen

Open een lijst, klap een hoofdstuk open en plak de woordjes bij *Plakken uit Studygo*:

```text
de hond	le chien
de kat	le chat
```

Complete woordenlijsten uit schoolboeken staan er niet vooraf in. Die komen uit jouw eigen boeken of eigen exports.

## Bestanden

- `index.html`, `app.js`, `styles.css`: de app zelf (alles wordt opgeslagen in de browser op je eigen apparaat)
- `manifest.webmanifest`: naam, kleuren en iconen voor installatie
- `sw.js`: service worker, bewaart de app voor offline gebruik
- `icons/`, `icon.svg`: app-iconen

## Nieuwe versie uitrollen

Pas je zelf iets aan, verhoog dan `CACHE_VERSION` bovenin `sw.js` (bijv. `schnitzel-v4`). Anders blijf je de oude versie zien. Een open app laat de nieuwe versie pas zien na één keer verversen.
