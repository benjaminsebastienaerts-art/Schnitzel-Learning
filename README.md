# Schnitzel Learning

Woordjes leren met typen of kaartjes, met XP, levels en een dagelijkse streak. Werkt als app: installeerbaar op telefoon, tablet en computer, en ook zonder internet.

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
- Oefenen door te typen of met omdraaikaartjes, in beide richtingen of door elkaar.
- Slim nakijken: een accent of lidwoord erbij of eraf, of een tikfoutje telt mee. Wil je het streng, zet dan *Streng nakijken* aan.
- Meerdere goede antwoorden: zet er een komma tussen (bijv. "mooi, knap").
- Woordjes die je nog niet beheerst apart oefenen.
- XP, levels, combo's en een streak voor dagen op rij.
- Woordjes plakken uit Studygo of een spreadsheet (tab, `-`, `=`, `;` of `|` ertussen werkt).
- Back-up opslaan en terugzetten, onderaan het beginscherm.

## Woordjes toevoegen

Open een lijst, klap een hoofdstuk open en plak de woordjes bij *Plakken uit Studygo*:

```text
de hond	le chien
de kat	le chat
```

Complete woordenlijsten uit schoolboeken staan er niet vooraf in. Die komen uit jouw eigen boeken of eigen exports.

## Bestanden

- `index.html`, `app.js`, `styles.css`: de app zelf
- `manifest.webmanifest`: naam, kleuren en iconen voor installatie
- `sw.js`: service worker, bewaart de app voor offline gebruik
- `icons/`, `icon.svg`: app-iconen

## Nieuwe versie uitrollen

Pas je iets aan, verhoog dan `CACHE_VERSION` bovenin `sw.js` (bijv. `schnitzel-v3`). Anders blijven bestaande gebruikers de oude versie uit hun cache zien. Een open app laat de nieuwe versie pas zien na één keer verversen.
