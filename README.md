# Valse Roem

Klaverjas-trainer (Rotterdams) om technieken en tactieken te leren en te oefenen met een goede, gemiddelde of slechte maat.

## Starten

```bash
docker compose up -d --build
```

Open daarna http://localhost:8790. Zonder Docker: open `index.html` direct in de browser (geen build nodig).

Kant-en-klaar image (wordt bij elke push naar `main` gebouwd door GitHub Actions, voor amd64 en arm64):

```bash
docker run -d --name valse-roem -p 8790:80 ghcr.io/wietzevdmi/valseroem:latest
```

Image als bestand delen: `docker save valse-roem:latest | gzip > valse-roem-image.tar.gz`, de ontvanger doet `docker load < valse-roem-image.tar.gz` en `docker run -d -p 8790:80 valse-roem:latest`.

## Wat zit erin

- **Spelen**: volledige boom van 16 spellen tegen AI-spelers. Niveau van je maat en van de tegenstanders apart instelbaar (goed / gemiddeld / slecht). De coach beoordeelt elke zet met een Monte-Carlo-simulatie, legt uit waarom een kaart beter was en houdt rekening met het niveau van je maat. Knop **Hint** geeft advies vooraf.
- **Lessen**: twaalf lessen over telling, regels, aannemen, troef trekken, uitkomen, seinen, smeren, tegenspel, roem (maken én tegen voorkomen), tellen, spelen met verschillende maten en eindspel.
- **Oefenen**: vaste scenario's, bied-drill, zet-drill (willekeurige situaties, beoordeeld door de simulatie) en tel-drill.
- **Competitie**: stand van de koppels (wie het eerst 10 bomen wint), gespeelde bomen en het record.
- **Statistieken**: fouten per categorie, nat/roem tegen, drill-scores. Alles staat in localStorage van de browser.

## Regels zoals ingebouwd

- Rotterdams: bekennen verplicht; niet kunnen bekennen betekent troeven, ook op de slag van je maat; overtroeven verplicht, anders ondertroeven; troef gevraagd betekent verhogen als het kan.
- Bieden: de laatste kaart van de deler wordt gedraaid (instelbaar: los kaartje). De kiezer (links van de deler) mag eerst; in ronde 1 mag iedereen passen. Passen alle vier, dan kiest de kiezer verplicht uit de drie andere kleuren.
- Roem: driekaart 20, vierkaart 50, vier dezelfde (10/V/H/A) 100, vier boeren 200, stuk 20. Nat = alle punten en alle roem naar de tegenpartij. Pit = 100.
- Amsterdams is als variant beschikbaar in de instellingen.

## Ontwikkeling

Pure HTML/CSS/JS, geen build-stap. Tests en simulaties in Node:

```bash
node test/test.js          # regeltests
node test/scenarios.js 300 # oefenscenario's vergelijken met de simulatie
node test/sim.js strength  # sterkte van de AI-niveaus
node test/sim.js bid       # kalibratie van de biedrempel
```
