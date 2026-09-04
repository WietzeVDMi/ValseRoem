/* Valse Roem – lessen (Rotterdams klaverjassen) */
(function () {
  const KJ = globalThis.KJ;
  KJ.LESSONS = [
    {
      id: 'basis', title: '1. De basis: kaarten, punten en telling',
      summary: 'Wat elke kaart waard is, wie een slag wint en hoe de 162 punten verdeeld worden.',
      html: `
<h4>Het spel</h4>
<p>32 kaarten (7 t/m aas), vier spelers in twee koppels, maten zitten tegenover elkaar. Acht slagen per spel, zestien spellen per boom. Wie na zestien spellen de meeste punten heeft wint de boom.</p>
<h4>Volgorde en waarde</h4>
<table class="tbl"><tr><th></th><th>Volgorde (hoog → laag)</th><th>Punten</th></tr>
<tr><td>Bijkleur</td><td>A, 10, H, V, B, 9, 8, 7</td><td>A 11 · 10 10 · H 4 · V 3 · B 2 · rest 0</td></tr>
<tr><td>Troef</td><td><b>B, 9</b>, A, 10, H, V, 8, 7</td><td><b>B 20 · 9 14</b> · A 11 · 10 10 · H 4 · V 3 · rest 0</td></tr></table>
<p>Alle kaarten samen zijn 152 punten, de laatste slag is 10 extra: <b>162 per spel</b>, plus roem. De troefboer heet <b>de boer</b>, de troef 9 heet <b>de nel</b>. Samen zijn ze 34 punten en twee zekere slagen: de kern van bijna elke aanneembare hand.</p>
<h4>Wie wint de slag?</h4>
<p>De hoogste troef, anders de hoogste kaart van de gevraagde kleur. Een kaart van een andere kleur wint nooit, hoe hoog ook. Een schoppenaas op een hartenslag is dus gewoon 11 punten voor wie de slag wint.</p>
<h4>De telling</h4>
<p>De partij die speelt (troef heeft gekozen) moet <b>méér</b> halen dan de tegenpartij, roem meegeteld. 81-81 is dus <b>nat</b>. Bij nat gaan alle 162 punten en <i>alle</i> roem (ook je eigen) naar de tegenpartij. Wie alle acht slagen pakt heeft <b>pit</b>: 100 extra.</p>
<p><b>Praktisch:</b> je hebt als speler minimaal 82 punten nodig. Met boer, nel en een aas heb je al 45 punten in handen; elke slag die je pakt levert ook de punten van de anderen op.</p>`,
    },
    {
      id: 'regels', title: '2. Rotterdams: wat moet en wat mag',
      summary: 'Bekennen, troeven, overtroeven en ondertroeven, ook als je maat de slag heeft.',
      html: `
<h4>De verplichtingen op een rij</h4>
<ol>
<li><b>Bekennen</b>: je moet de gevraagde kleur bijspelen als je die hebt.</li>
<li><b>Troef gevraagd</b>: je moet een hogere troef spelen dan de hoogste op tafel als je die hebt (verhogen). Kan dat niet, dan een lagere troef.</li>
<li><b>Niet kunnen bekennen</b>: je <i>moet</i> troeven, <b>ook als je maat de slag heeft</b>. Ligt er al troef, dan moet je overtroeven als het kan; anders moet je ondertroeven.</li>
<li>Geen troef en niet kunnen bekennen: gooi op wat je wilt (afgooien).</li>
</ol>
<h4>Waarom dit alles uitmaakt</h4>
<p>In het Rotterdams kun je je maat niet ontzien: heb je de gevraagde kleur niet en wel troef, dan moet je troeven op de aas van je maat. Dat kost jullie geen punten (de slag blijft van jullie), maar wél een troef. Goede spelers houden daar rekening mee: <b>kom niet uit in een kleur waar je maat renonce is</b> als je zijn troeven nog nodig hebt.</p>
<p>Omgekeerd is het een wapen: heb je een kleur waar de tegenstander links van je geen kaarten meer van heeft, dan dwing je hem zijn troeven weg te spelen.</p>
<h4>Verzaken</h4>
<p>Wie tegen de regels in niet bekent of niet troeft, verzaakt. In de meeste huisregels betekent dat: alle punten en roem van dat spel naar de tegenpartij. De trainer staat alleen toegestane kaarten toe, zodat je de verplichtingen vanzelf leert voelen.</p>`,
    },
    {
      id: 'bieden', title: '3. Aannemen: spelen of passen?',
      summary: 'De troefkaart wordt gedraaid, de kiezer mag als eerste. Wanneer speel je, wanneer pas je, en wat betekent je positie?',
      html: `
<h4>Het systeem aan jullie tafel</h4>
<p>De laatste kaart wordt gedraaid: die kleur is de voorgestelde troef. De <b>kiezer</b> (links van de deler) mag als eerste zeggen "spelen" of "passen", daarna de rest. Passen alle vier? Dan <b>moet</b> de kiezer een troef kiezen uit de drie andere kleuren.</p>
<h4>Vuistregel voor een aanneembare hand</h4>
<ul>
<li><b>Boer + nel + nog een troef</b>: bijna altijd spelen.</li>
<li><b>Boer + twee troeven + een bijaas</b>: spelen.</li>
<li><b>Nel + drie troeven + een bijaas</b>: spelen, zeker als kiezer.</li>
<li><b>Vier troeven zonder boer of nel</b>: twijfel; alleen met twee bijazen.</li>
<li><b>Twee troeven zonder boer of nel</b>: passen, ook met azen. Je verliest de troefstrijd.</li>
</ul>
<p>De coach rekent een <b>handwaarde</b> uit: boer 30, nel 18 (24 met boer erbij), troefaas 11, troef 10 7, elke extra troef vanaf de vierde 5, bijaas 10, bij-10 met aas 7, stuk 8. Rond de 45 is het break-even; de drempel hangt van je rol af.</p>
<h4>Je rol bij het bieden is minstens zo belangrijk als je hand</h4>
<table class="tbl"><tr><th>Rol</th><th>Drempel</th><th>Waarom</th></tr>
<tr><td>Kiezer</td><td>laag (±38)</td><td>Pas je en past de rest ook, dan móet je kiezen uit drie kleuren die meestal slechter zijn. Een redelijke gedraaide kleur is beter dan straks een gedwongen slechte.</td></tr>
<tr><td>Maat van de kiezer</td><td>middel (±41)</td><td>Jij bent de laatste die je maat kan redden van een verplichte keuze. Neem een redelijke hand aan.</td></tr>
<tr><td>Tegenstander van de kiezer</td><td>hoog (±46)</td><td>Passen kost je niets: als iedereen past wordt de kiezer verplicht en gaat die vaak nat. Speel alleen met een echt goede hand.</td></tr></table>
<h4>De gedraaide kaart is informatie</h4>
<p>Wordt de laatste kaart van de deler gedraaid, dan weet iedereen dat de deler die kaart heeft. Wordt de <b>boer</b> gedraaid bij een tegenstander: pas, tenzij je nel, aas en nog twee troeven hebt. Wordt de boer gedraaid bij je maat: reken die mee, je maat neemt vermoedelijk zelf aan of steunt je.</p>
<h4>Verplicht kiezen</h4>
<p>Kies de kleur met de meeste troefkracht (boer/nel), niet de kleur met de meeste kaarten. Met een slechte hand: kies de kleur waarin je de boer hebt, ook al is het je enige troef. Doel is dan schadebeperking: pak je azen vroeg en hoop op een maat met troeven.</p>`,
    },
    {
      id: 'troef', title: '4. Troef trekken',
      summary: 'De speler trekt troef, de tegenpartij niet. Wanneer hoog, wanneer laag, wanneer stoppen.',
      html: `
<h4>Waarom troef trekken</h4>
<p>Jouw azen en tienen zijn pas veilig als de tegenpartij niet meer kan troeven. Daarom begint de speler bijna altijd met troef: je haalt hun troeven eruit terwijl je zelf de hoogste hebt. Elke troefslag die je wint levert bovendien de troefpunten van de anderen op.</p>
<h4>Hoe</h4>
<ul>
<li><b>Heb je de boer</b>: kom met de boer uit. De nel en de aas van de tegenpartij moeten erop (troef gevraagd = verhogen verplicht is niet mogelijk boven de boer, dus ze spelen wat ze hebben).</li>
<li><b>Heb je de nel maar niet de boer</b>: kom met een kleine troef uit. De boer moet vroeg of laat vallen, jouw nel wordt daarna de hoogste ("de boer lokken"). Alternatief: wacht tot de boer gespeeld is en trek dan met de nel.</li>
<li><b>Je maat speelt</b>: kom met troef uit naar je maat toe, ook een kleine. Je maat heeft de sterke troeven en trekt dan verder.</li>
<li><b>Tel</b>: er zijn acht troeven. Trek jij met de boer en spelen drie anderen troef bij, dan zijn er vier weg. Weet je hoeveel jij en je maat nog hebben, dan weet je hoeveel de tegenpartij heeft.</li>
</ul>
<h4>Wanneer stoppen</h4>
<p>Stop met trekken zodra de tegenpartij geen troef meer heeft, of zodra jij je laatste troeven nodig hebt om zelf nog te kunnen troeven. Blijf je trekken terwijl alleen je maat nog troef heeft, dan trek je zijn troeven eruit (en je bent verplicht te verhogen, dus je maat kan er niets aan doen).</p>
<h4>Als tegenpartij</h4>
<p>Kom <b>niet</b> uit in troef tegen de speler, tenzij je zelf boer en nel hebt. Elke troef die jij uitkomt speelt de speler in de kaart. Laat de speler zelf werken; jij pakt zijn troeven af door hem te dwingen te troeven op jouw lage kaarten in een kleur waar hij renonce is.</p>`,
    },
    {
      id: 'uitkomen', title: '5. Uitkomen en vrije kaarten',
      summary: 'Wat je speelt als je aan slag bent: vrije kaarten, lage kaarten, en wat je nooit doet.',
      html: `
<h4>Vrije kaarten</h4>
<p>Een kaart is <b>vrij</b> als er in het spel geen hogere van die kleur meer is. Een bijaas is altijd vrij (behalve tegen troef). Een 10 wordt vrij zodra de aas is gespeeld. Vrije kaarten zijn zekere slagen, zolang niemand troeft.</p>
<ul>
<li><b>Je speelt en de troeven zijn eruit</b>: speel je vrije kaarten van boven naar beneden. Elke slag met een aas erin is 11 plus wat er bijgesmeerd wordt.</li>
<li><b>Je speelt en er is nog troef bij de tegenpartij</b>: eerst troef trekken, dan pas azen. Een getroefde aas is een ramp van 11 punten plus de slag.</li>
<li><b>Je bent tegenpartij</b>: speel je azen <i>vroeg</i>, voordat de speler een kleur renonce wordt en gaat troeven. "Azen eruit" is een oude regel die vaak klopt.</li>
</ul>
<h4>Laag uitkomen</h4>
<p>Heb je geen vrije kaart, kom dan laag uit in een kleur waar je niets te verliezen hebt: een 7 of 8 uit een kleur zonder aas of 10. Je geeft dan geen punten weg en laat de anderen de slag opbouwen.</p>
<h4>Wat je nooit doet</h4>
<ul>
<li>Uitkomen met een 10 waarvan de aas nog rondloopt: cadeautje van 10 punten.</li>
<li>Uitkomen met een heer of vrouw "om te kijken": dat kost 4 of 3 punten en je leert niets.</li>
<li>Als tegenpartij uitkomen in een kleur waar de speler renonce is en nog troef heeft (tenzij je hem juist wilt uittroeven en je maat de aas heeft).</li>
</ul>
<h4>Uitkomen na een sein</h4>
<p>Heeft je maat een hoge kaart afgegooid in een kleur (zie les 6), speel dan die kleur, ook laag. Je maat heeft daar de aas.</p>`,
    },
    {
      id: 'seinen', title: '6. Seinen: praten zonder woorden',
      summary: 'Hoe je met de kaart die je afgooit je maat vertelt wat je hebt. Spreek het af aan tafel.',
      html: `
<h4>Het principe</h4>
<p>Zodra je een kaart vrij mag afgooien (je kunt niet bekennen en hebt geen troef, of hoeft niet te troeven), zegt de kaart iets tegen je maat. Het meest gebruikte systeem, en het systeem dat de trainer gebruikt:</p>
<table class="tbl"><tr><th>Afgooien</th><th>Betekenis</th></tr>
<tr><td><b>9 of hoger</b> in een kleur</td><td>"Kom hier uit, ik heb daar de aas" (of de vrije 10).</td></tr>
<tr><td><b>7 of 8</b> in een kleur</td><td>"Hier heb ik niets."</td></tr></table>
<p>Een 9 is de ideale seinkaart: 0 punten en toch hoog. Een heer (4 punten) afgooien om te seinen mag, als de slag toch al van de tegenpartij is en je liever niet je 10 riskeert.</p>
<h4>Seinen lezen</h4>
<p>Gooit je maat een 9 of hoger af in een kleur, speel die kleur zodra je aan slag bent, desnoods met een 7. Gooit je maat een 7 af, dan is dat "niet hier"; door eliminatie weet je vaak welke kleur wél goed is.</p>
<h4>Andere veelgebruikte afspraken</h4>
<ul>
<li><b>Troef terugspelen</b>: kom je als maat van de speler met troef uit, dan heb je zelf weinig troef en wil je dat je maat trekt.</li>
<li><b>Aas vragen</b>: een lage kaart uitkomen in een kleur waarin je maat eerder hoog afgooide.</li>
<li><b>Roem-sein</b>: sommige tafels gooien de middelste kaart van een reeks af als er roem in zit. Alleen doen als jullie het afgesproken hebben.</li>
</ul>
<h4>Praktisch aan jullie tafel</h4>
<p>Seinen werken alleen als beide maten hetzelfde systeem gebruiken. Spreek met je maat vóór de avond af: <b>hoog = kom, laag = niet</b>. Een gemiddelde maat vergeet het af en toe; maak je seinen dan extra duidelijk (een 9, geen vrouw). Een zwakke maat leest niets: sein dan niet, want het kost soms punten.</p>`,
    },
    {
      id: 'smeren', title: '7. Smeren en punten bewaken',
      summary: 'Je 10 en aas horen in de slag van je maat, niet in die van de tegenpartij.',
      html: `
<h4>Smeren</h4>
<p>Heeft je maat de slag <b>zeker</b> (hoogste kaart, en niemand na jou kan troeven), gooi dan je punten erbij: een 10, een aas, een heer. Dat is smeren. Een spel bestaat uit acht slagen; wie de punten van de verliezende slagen naar de goede kant sluist, wint.</p>
<h4>Wanneer is de slag zeker?</h4>
<ul>
<li>Je maat speelt de hoogste kaart die nog in het spel is van de gevraagde kleur, <i>en</i> de tegenstander(s) na jou kunnen die kleur nog bekennen (of hebben geen troef).</li>
<li>Je maat troeft met een troef waar niets meer overheen kan.</li>
<li>Jij speelt als laatste: dan zie je het gewoon.</li>
</ul>
<p>Twijfel je? Smeer dan niet. Een gesmeerde 10 die bij de tegenpartij belandt is 10 punten verlies plús 10 punten winst voor hen: een verschil van 20.</p>
<h4>Welke kaart smeer je?</h4>
<ol>
<li>Een <b>10 waarvan de aas al weg is</b> of die je zelf hebt: die 10 wint nooit zelf een slag, dus punten pakken.</li>
<li>Een <b>heer of vrouw</b>: klein maar fijn.</li>
<li>Een <b>aas</b> alleen als je hem niet meer zelf kunt uitspelen (de kleur wordt straks getroefd, of het spel is bijna om).</li>
</ol>
<h4>De keerzijde: niets weggeven</h4>
<p>Is de slag van de tegenpartij, gooi dan de kaart met de <b>minste punten</b> die je mag spelen. Een 7 in plaats van een boer, een 8 in plaats van een heer. Over acht slagen scheelt dat zomaar 20 punten. Dit is de grootste bron van verlies bij gemiddelde spelers: kaarten "opruimen" in slagen van de tegenpartij.</p>`,
    },
    {
      id: 'tegenspel', title: '8. Tegenspel: de speler nat maken',
      summary: 'De speler moet 82 halen. Jij hoeft maar 81. Hoe je hem het leven zuur maakt.',
      html: `
<h4>Het doel</h4>
<p>Als tegenpartij win je met 81 punten. Elke slag die jullie pakken telt dubbel: hij krijgt hem niet, jij wel. Nat betekent dat alle 162 punten plús alle roem naar jullie gaan. Dat is de grootste schommeling in het spel: veel groter dan roem.</p>
<h4>De regels van het tegenspel</h4>
<ol>
<li><b>Azen eruit.</b> Speel je bijazen vroeg, voordat de speler ze kan troeven.</li>
<li><b>Geen troef spelen.</b> Je speelt de speler zijn troeven in de kaart.</li>
<li><b>De speler laten troeven.</b> Heeft de speler een kleur niet meer, kom daar dan uit met een lage kaart: hij moet een troef gebruiken voor 0 punten. Hoe minder troef hij overhoudt, hoe eerder jouw kaarten vrij zijn.</li>
<li><b>Je maat laten troeven.</b> Heeft je maat een kleur niet meer en nog troef, speel die kleur dan met een kaart met punten erin: je maat troeft en pakt de punten.</li>
<li><b>Tel de troeven van de speler.</b> Weet je dat hij er nog twee heeft, dan weet je ook wanneer je azen veilig zijn.</li>
</ol>
<h4>De verplichte speler</h4>
<p>Is de kiezer verplicht (iedereen paste), dan heeft hij zelden boer en nel. Speel dan agressief: azen eruit, troef laten gebruiken, en tel mee naar de 81. Een verplichte speler gaat ruim een derde van de tijd nat.</p>
<h4>Roem als wapen</h4>
<p>Als tegenpartij weegt roem dubbel: het brengt de speler niet alleen dichter bij 82, het kan hem ook nat maken als jullie roem maken. Een driekaart van 20 punten in jullie slag is bij een krap spel het verschil.</p>`,
    },
    {
      id: 'roem', title: '9. Roem maken en roem tegen voorkomen',
      summary: 'Jullie krijgen veel roem tegen. Dat is niet alleen pech: hier zijn de patronen.',
      html: `
<h4>Wat roem is</h4>
<table class="tbl"><tr><th>Combinatie in één slag</th><th>Roem</th></tr>
<tr><td>Drie opeenvolgende kaarten van één kleur (volgorde 7-8-9-10-B-V-H-A)</td><td>20</td></tr>
<tr><td>Vier opeenvolgende</td><td>50</td></tr>
<tr><td>Vier dezelfde (10, V, H of A)</td><td>100</td></tr>
<tr><td>Vier boeren</td><td>200</td></tr>
<tr><td>Stuk: troef heer + troef vrouw</td><td>20 extra (H-V-B van troef = 40, 10-B-V-H van troef = 70)</td></tr></table>
<p>Roem gaat naar wie de slag wint. Roem in de slag van de tegenpartij is dus roem tegen, ook als jij de kaarten leverde.</p>
<h4>Waarom je zoveel roem tegen krijgt</h4>
<ul>
<li><b>Plaatjes bijgooien in verloren slagen.</b> Ligt er een heer en een vrouw op tafel van de tegenpartij en gooi jij de boer erbij "omdat hij toch niets waard is", dan is dat 20 roem tegen. Kijk vóór het bijgooien altijd: welke kaart maakt een reeks met wat er ligt?</li>
<li><b>Verkeerd afgooien.</b> Moet je afgooien in een slag van de tegenpartij, kies dan een kaart die niet aansluit bij de gespeelde kaarten. Een 7 naast een 8-9 is roem; een 7 naast een heer niet.</li>
<li><b>Uitkomen met een middenkaart.</b> Kom je uit met een 9 en heeft de tegenpartij 8 en 10, dan maken zij roem in hun eigen slag. Lage kaarten (7) en hoge kaarten (aas) sluiten minder vaak aan.</li>
<li><b>Het stuk weggeven.</b> Speel je als tegenpartij de troefvrouw bij terwijl de speler de heer nog heeft, dan kan hij het stuk maken in zijn eigen slag. Houd vrouw en heer van troef zo lang mogelijk uit elkaar, tenzij jullie de slag pakken.</li>
</ul>
<h4>Zelf roem maken</h4>
<ul>
<li><b>Stuk melden</b>: heb je heer en vrouw van troef, speel ze in slagen die je maat of jij wint (bijvoorbeeld bij troef trekken door je maat). Stuk is 20 gratis punten.</li>
<li><b>Reeks bijleggen</b>: ligt er 8-9 van een kleur van jullie, en heb jij de 10 of de 7, dan maak je 20 roem als de slag van jullie is.</li>
<li><b>Roem in eigen slag</b>: heb je 10-boer-vrouw van een kleur en is je maat aan slag in die kleur, dan gooi je de middelste niet zomaar weg. Bouw eraan.</li>
</ul>
<p>Onthoud: roem is leuk, maar een nat spel is 162+. Ga nooit voor roem als het je de slag of het spel kost.</p>`,
    },
    {
      id: 'tellen', title: '10. Tellen: de gratis voorsprong',
      summary: 'Wie de troeven en de azen telt, weet wanneer een kaart vrij is. Zo doe je dat zonder hoofdpijn.',
      html: `
<h4>Wat je telt</h4>
<ol>
<li><b>Troeven</b>: acht in totaal. Trek je eigen troeven af en tel wat er gespeeld is. Het getal dat overblijft zit bij de andere drie. Dit is het belangrijkste getal in het hele spel.</li>
<li><b>De boer en de nel</b>: zijn ze gespeeld? Zo nee, wie kan ze hebben? (Wie paste op die kleur heeft ze meestal niet.)</li>
<li><b>Azen en tienen per kleur</b>: is de aas weg, dan is de 10 vrij. Zijn aas en 10 weg, dan is de heer vrij.</li>
<li><b>Renonces</b>: wie kon niet bekennen? Die speler heeft die kleur nooit meer. In het Rotterdams weet je bovendien: wie niet troefde heeft geen troef meer.</li>
</ol>
<h4>Een simpele methode</h4>
<p>Tel alleen troeven hardop in je hoofd na elke slag: "vier weg, ik heb er twee, dus twee bij de rest." En let per kleur op één ding: is de aas al gespeeld? Meer hoeft niet om bovengemiddeld te spelen.</p>
<h4>Wat je ermee doet</h4>
<ul>
<li>Troeven bij de tegenpartij = 0 en jij hebt een aas: uitspelen, zekere slag.</li>
<li>Je maat komt uit in een kleur waarvan jij weet dat de aas weg is: je 10 is vrij en wint.</li>
<li>De speler heeft nog één troef en jij hebt er twee: kom met een lage troef uit en trek zijn laatste weg.</li>
</ul>
<p>De <b>tel-oefening</b> in het tabblad Oefenen traint dit. De coach toont bovendien tijdens het spel hoeveel troeven er nog bij de anderen zitten, zodat je leert wanneer een kaart vrij is.</p>`,
    },
    {
      id: 'maat', title: '11. Spelen met een goede, gemiddelde of zwakke maat',
      summary: 'Je maat bepaalt je strategie. Wat je aanpast en wat je vooral niet doet.',
      html: `
<h4>Met een goede maat</h4>
<ul>
<li>Vertrouw de seinen en speel ernaar; verwacht dat je maat jouw seinen ook leest.</li>
<li>Smeer ruimhartig als je maat de slag heeft: een goede maat neemt alleen slagen die hij houdt.</li>
<li>Laat je maat de slag nemen als hij voorligt; overneem alleen als jij het zeker kunt en hij niet.</li>
<li>Neem als maat van de kiezer iets sneller aan: je maat helpt met troef trekken en smeren.</li>
</ul>
<h4>Met een gemiddelde maat</h4>
<ul>
<li>Seinen werken meestal, maar maak ze onmiskenbaar (een 9, niet een vrouw). Herhaal het sein een tweede keer als het kan.</li>
<li>Smeer alleen als jij zelf ziet dat de slag zeker is; reken niet op zijn telling.</li>
<li>Pak zekere slagen zelf: een gemiddelde maat verspilt soms zijn hoge kaart op jouw slag.</li>
<li>Kom uit in zijn sterke kleur (die je uit zijn seinen of eerdere slagen kent), niet in de jouwe.</li>
</ul>
<h4>Met een zwakke maat</h4>
<ul>
<li><b>Jij bent de motor.</b> Neem zelf aan als het kan; verwacht niet dat je maat een goede troefkeuze maakt als hij verplicht is.</li>
<li><b>Sein niet.</b> Het kost soms punten en levert niets op.</li>
<li><b>Smeer zuinig.</b> Een zwakke maat pakt slagen die hij niet houdt. Geef alleen punten mee als hij met een vrije kaart of hoge troef voorligt en jij als laatste speelt.</li>
<li><b>Bewaar controle.</b> Houd een hoge troef achter de hand om een fout van je maat te repareren; trek niet alle troeven eruit als je maat de laatste slagen moet maken.</li>
<li><b>Verwacht roem tegen.</b> Een zwakke maat gooit plaatjes bij; speel zelf zó dat de reeks niet ontstaat.</li>
<li>Als tegenpartij: pak zelf de azen vroeg, speel niet op zijn troeven.</li>
</ul>
<h4>Herkennen wat voor maat je hebt</h4>
<p>Let de eerste twee spellen op: gooit hij laag bij op slagen van de tegenpartij? Smeert hij op jouw vrije azen? Komt hij met troef naar je toe als jij speelt? Drie keer ja is een goede maat. Pas je spel per boom aan, niet per slag: consistentie is voor je maat belangrijker dan de perfecte zet.</p>
<p>In de trainer stel je het niveau van je maat in. Het advies van de coach houdt er rekening mee: met een zwakke maat adviseert hij vaker om zelf de slag te pakken.</p>`,
    },
    {
      id: 'eindspel', title: '12. Eindspel en de laatste slag',
      summary: 'De laatste drie slagen zijn vaak beslissend: 10 extra punten, roem en de pit.',
      html: `
<h4>De laatste slag is 10 extra</h4>
<p>Bewaar als het kan een hoge troef of vrije kaart voor de laatste slag. Bij een krap spel (rond de 81) beslist die tien punten wie nat gaat.</p>
<h4>Vooruit rekenen</h4>
<p>Vanaf de zesde slag kun je vaak precies uitrekenen wie wat nog heeft: iedereen heeft nog drie kaarten. Tel de punten die je nog nodig hebt en kijk welke slagen je zeker kunt maken. Als speler met 70 punten heb je nog 12 nodig: één slag met een aas erin is genoeg.</p>
<h4>Pit</h4>
<p>Alle acht slagen is 100 extra. Ga er alleen voor als het niets kost: nooit een zekere slag opgeven voor een kans op pit. Als tegenpartij: één slag pakken voorkomt de pit; dat is soms 100 punten waard, ook al is de slag zelf leeg.</p>
<h4>Tempo aan tafel</h4>
<p>Klaverjassen met vrienden gaat snel. De meeste winst zit niet in briljante zetten maar in het vermijden van de vijf klassieke fouten: punten weggeven in verloren slagen, te vroeg smeren, troef uitkomen tegen de speler, azen te laat spelen, en roem cadeau geven. Wie die vijf onder controle heeft wint van bijna elke vriendengroep.</p>`,
    },
  ];
})();
