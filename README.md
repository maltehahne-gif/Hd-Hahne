# Hahne Digital – Website

Statische Website, ohne Datenbank oder Framework. Einfach per FTP/SFTP in das
Web-Verzeichnis hochladen – fertig.

## Dateien

    index.html            Startseite
    impressum.html        Impressum (§ 5 DDG, § 18 MStV)
    datenschutz.html      Datenschutzerklärung (DSGVO)
    agb.html              Allgemeine Geschäftsbedingungen
    robots.txt            Freigabe für Suchmaschinen
    sitemap.xml           Seitenverzeichnis für Suchmaschinen
    assets/site-config.js >>> HIER ALLE FIRMENDATEN EINTRAGEN <<<
    assets/style.css      Gestaltung (Tokens, Komponenten, Motion, Responsive)
    assets/main.js        Navigation, Module, Projekt-Check, Formular
    assets/motion.js      Bewegungssystem: Reveals, Scrollzustände, Microinteractions
    assets/hero-system.js Systemarchitektur im Hero (prozedurales 3D auf Canvas)
    assets/system-field.js Systemstrang: verbindet die Sektionen beim Scrollen
    assets/modules.js     Modulkatalog inkl. Kauf- und Mietpreise
    assets/module-demos.js Beispielansichten der Module
    assets/module-page.js Katalogseite: Filter, Auswahl, Kostenschätzung
    assets/assistant-data.js  Wissensbasis des Website-Assistenten
    assets/assistant.js   Website-Assistent, Sprachfunktion und Live-Chat
    functions/api/contact.js  Serverseitiger Formularversand (Cloudflare Pages Function,
                           siehe Abschnitt "Kontaktformular – Server-Setup")

## Vor dem Livegang – Checkliste

1. `assets/site-config.js` ausfüllen: es fehlen noch USt-IdNr. bzw.
   Steuernummer sowie Hosting-Anbieter und dessen Anschrift (Felder in
   eckigen Klammern, im Impressum/in der Datenschutzerklärung rot markiert).
   Firma, Gesellschafter, Anschrift, Telefon, E-Mail-Adresse und Domain sind
   bereits eingetragen. Rechtsform steht auf GbR (zwei Betreiber) – bei
   abweichender Struktur dort korrigieren.
   Kleinunternehmer nach § 19 UStG? Dann `kleinunternehmer: true` setzen –
   Impressum und Preishinweis passen sich automatisch an.
2. Domain prüfen: Verbindliche Domain ist `www.hd-hahne.de`, so eingetragen
   in `assets/site-config.js`, `index.html`, `impressum.html`,
   `datenschutz.html`, `robots.txt` und `sitemap.xml`. Falls eine andere
   Domain genutzt wird, dort ersetzen.
3. Die Hinweiskästen in `impressum.html`, `datenschutz.html` und
   `agb.html` löschen (Block mit `class="hinweis"`).
4. SSL-Zertifikat (https) beim Hoster aktivieren.
5. Auftragsverarbeitungsvertrag (AVV) mit dem Hoster abschließen.
6. Kontaktformular: siehe Abschnitt "Kontaktformular – Server-Setup" unten.
   Ohne Einrichtung öffnet das Formular weiterhin das E-Mail-Programm des
   Besuchers – das funktioniert sofort, aber nicht auf jedem Gerät gleich
   zuverlässig, und es gibt keine echte Zustellbestätigung.
7. Rechtstexte vor dem Livegang anwaltlich prüfen lassen.

## Kontaktformular – Server-Setup

Diese Website ist als reine statische Seite ohne eigenen Server aufgebaut
(siehe Kopf dieser Datei). Ein echter, serverseitiger Formularversand
braucht deshalb zwingend eine Hosting-Umgebung, die Server-Code ausführen
kann – klassisches FTP/SFTP-Webspace kann das nicht. Vorbereitet ist die
Variante **Cloudflare Pages** (kostenloser Einstiegsplan, keine Kreditkarte
nötig für den Basisbetrieb), weil sie sich am nächsten am bisherigen
"Dateien hochladen"-Ablauf verhält. Genau diese Schritte fehlen noch, bevor
`functions/api/contact.js` aktiv wird:

1. **Hosting wechseln oder ergänzen.** Ein Cloudflare-Konto anlegen, unter
   "Workers & Pages" ein neues Pages-Projekt erstellen und entweder mit
   diesem Git-Repository verbinden (empfohlen, dann baut Cloudflare bei
   jedem Push automatisch neu) oder den Projektordner manuell hochladen.
   Anschließend die Domain `hd-hahne.de` in Cloudflare als benutzerdefinierte
   Domain einrichten (DNS-Umstellung beim aktuellen Registrar erforderlich).
2. **E-Mail-Versanddienst einrichten.** Ein Konto bei einem
   Transaktions-E-Mail-Dienst anlegen (die Funktion ist für resend.com
   vorbereitet, ein Wechsel auf einen anderen Dienst mit HTTP-API ist mit
   wenigen Zeilen in `functions/api/contact.js` möglich). Dort die
   Absenderdomain `hd-hahne.de` verifizieren (SPF/DKIM-Einträge im DNS, das
   erledigt Cloudflare größtenteils automatisch) und einen API-Schlüssel
   erzeugen.
3. **Umgebungsvariablen im Cloudflare-Projekt setzen** (Dashboard →
   Projekt → Settings → Environment variables, **niemals im Repository**):
   - `RESEND_API_KEY` – der erzeugte API-Schlüssel
   - `CONTACT_TO` – Empfängeradresse, z. B. `service@hd-hahne.de`
   - `CONTACT_FROM` – verifizierte Absenderadresse, z. B.
     `formular@hd-hahne.de`
4. **Rate-Begrenzung aktivieren (empfohlen).** Unter "Workers & Pages" →
   "KV" einen Namespace anlegen (z. B. `hd-hahne-ratelimit`) und ihn im
   Pages-Projekt unter Settings → Functions → KV namespace bindings als
   `RATE_LIMIT_KV` einbinden. Ohne diesen Schritt funktioniert der Versand
   weiterhin, nur ohne serverseitige Begrenzung der Anfragen je Absender.
5. **Endpoint aktivieren.** In `assets/site-config.js` bei `formEndpoint`
   den Wert `/api/contact` eintragen und veröffentlichen.
6. **Datenschutzerklärung ergänzen.** Sobald der E-Mail-Dienst produktiv
   läuft, in `datenschutz.html` unter Ziffer 5 den tatsächlich genutzten
   Anbieter (Name, Sitz, Link zur Datenschutzerklärung des Anbieters)
   ergänzen und prüfen, ob mit ihm ein AVV nach Art. 28 DSGVO nötig ist.
7. **Testen, bevor live geschaltet wird:** eine Testanfrage senden, prüfen,
   ob die E-Mail ankommt, ob eine zweite, schnelle Anfrage abgelehnt wird
   (Rate-Begrenzung) und ob eine absichtlich fehlerhafte Anfrage (z. B. ohne
   Zustimmung) eine verständliche Fehlermeldung statt einer stillen
   "Erfolg"-Meldung zeigt.

Bis diese Schritte durchgeführt sind, bleibt `formEndpoint` leer und das
Formular öffnet weiterhin ehrlich das E-Mail-Programm des Besuchers – es
wird zu keinem Zeitpunkt ein erfolgreicher Versand vorgetäuscht, der nicht
stattgefunden hat.

## Seiten-Assistent

Der Assistent unten rechts beantwortet Fragen ausschließlich aus
`assets/assistant-data.js` und den Moduldaten. Er stellt keine Verbindung
ins Internet her, ruft keinen KI-Dienst auf und speichert nichts.

Neue Antwort ergänzen: in `assistant-data.js` einen Eintrag mit `fragen`
(Stichwörter) und `antwort` anlegen. Je mehr Formulierungen unter `fragen`
stehen, desto zuverlässiger wird die Frage erkannt. Weiß der Assistent
etwas nicht, verweist er von selbst auf das Kontaktformular.

## Modul-Anleitungen

`anleitung.html` erklärt jedes Modul ausführlich – erreichbar über den Knopf
"Anleitung" an jeder Modulkachel (`anleitung.html?modul=crm`).

Jede Anleitung enthält:

* **Sinnvoll für Sie, wenn …** (3 Punkte) und **Eher nicht, wenn …** (2 Punkte)
* **Wann es sich rechnet** – eine konkrete Schwelle statt Werbefloskel
* **So arbeiten Sie damit** – vier Schritte mit Schaubild
* **Aus der Praxis** – ein Tipp, den man sonst erst nach dem Kauf erfährt
* Fakten zu Dauer, Kauf, Miete und laufenden Kosten

Die Texte stehen in `assets/anleitung-daten.js`, die Schaubilder erzeugt
`assets/bilder.js` (16 Motive als SVG, keine Fotos – laden sofort, bleiben
scharf und zeigen nie versehentlich echte Kundendaten).

Die Schritte entstehen automatisch aus den Leistungspunkten in `modules.js`
plus dem passenden Schaubild. Neues Modul: Punkte in `modules.js` pflegen und
in `anleitung-daten.js` einen Eintrag mit `fuerWen`, `nichtFuerWen`,
`rechnetSich`, `tipp` und vier `bilder` anlegen.

## Modul-Demos

`demo.html` zeigt zu **jedem der 47 Module** eine bedienbare Beispielansicht:
links die Modulliste mit Suche, rechts ein nachgebautes Anwendungsfenster mit
Kennzahlen, Tabelle und Werkzeugleiste. In der Demo lässt sich suchen und eine
Zeile auswählen – so bekommt der Kunde ein Gefühl für die Bedienung.

Aufruf einzeln: `demo.html?modul=crm`. Genau so verlinkt der Modulkatalog
über "Beispiel ansehen" (öffnet in neuem Tab). Umgekehrt führt der Knopf
"Modul ins Angebot übernehmen" zurück in den Katalog
(`module.html?vormerken=crm`) und markiert das Modul dort automatisch.

Die Inhalte stehen in `assets/demo-daten.js` (35 Module) und
`assets/module-demos.js` (die ersten 12). Neues Modul ergänzen: in
`modules.js` anlegen und unter derselben ID einen Demo-Eintrag mit `titel`,
`fenster`, `stats`, `spalten`, `zeilen`, `erklaerung` und `aktionen`
hinzufügen – die Demoseite nimmt es dann automatisch auf.

## Privatsphäre-Hinweis

Beim ersten Besuch erscheint unten eine Leiste (`assets/privatsphaere.js`).
Sie ist bewusst **kein** Cookie-Banner: Die Seite setzt keine Cookies, also
gäbe es nichts zu akzeptieren. Zur Wahl steht genau das eine, was wirklich
einwilligungspflichtig ist – das Gedächtnis des Assistenten.

Zwei Knöpfe: "Gedächtnis erlauben" und "Nur das Nötigste". Die Entscheidung
wird gemerkt, damit niemand bei jedem Aufruf erneut gefragt wird. Soll der
Hinweis trotzdem bei jedem Seitenaufruf erscheinen, setzt in
`site-config.js` `hinweisImmerZeigen: true`.

Über den Link "Privatsphäre" im Footer sind die Einstellungen jederzeit
erreichbar – mit Schalter, Übersicht und einem Knopf zum Löschen aller
gespeicherten Angaben. Dieser Link ist rechtlich Pflicht und darf nicht
entfernt werden.

Die Texte der Leiste sind in allen sieben Sprachen hinterlegt.

## Domainprüfung

Auf der Startseite und im Modulkatalog kann der Besucher seine Wunschdomain
prüfen (`assets/domain.js`). Ist sie frei, übernimmt ein Klick sie ins
Angebot – sie erscheint dann als eigene Position im PDF und in der Anfrage.

**Wie zuverlässig ist das?** Ohne eigenen Server fragen wir per DNS ab, ob
für die Adresse Einträge bestehen:

* Einträge gefunden -> Domain ist **sicher vergeben**
* nichts gefunden -> Domain ist **sehr wahrscheinlich frei**

Registrierte, aber ungenutzte Domains erkennt dieses Verfahren nicht. Deshalb
steht überall "voraussichtlich frei", und die verbindliche Bestätigung kommt
mit eurem Angebot. Für die genaue Prüfung tragt unter `domainEndpoint` eine
eigene Schnittstelle ein, die RDAP oder die Registrar-API eures Hosters
abfragt und `{ "verfuegbar": true|false }` liefert. Für .de gibt es keine
offene Abfrage – das geht nur über den Registrar.

Umlautdomains werden automatisch nach Punycode umgewandelt
("müller-bau.de" -> "xn--mller-bau-q9a.de").

## Angebot als PDF

Wählt der Besucher im Modulkatalog Module aus, erscheint rechts der Knopf
"Angebot als PDF erstellen". Daraus entsteht ein DIN-A4-Angebot mit Kopfzeile,
Positionen, Summen, Hinweisen und eurer Fußzeile – wahlweise drucken,
speichern, per E-Mail oder per WhatsApp.

Erzeugt wird das PDF von `assets/angebot.js` direkt im Browser, ohne
Bibliothek und ohne Server. Inhalte und Hinweistexte stehen dort in der
Funktion `ausAuswahl`; Preise kommen automatisch aus `modules.js`.

**Grenze bei Anhängen:** Eine Website darf aus Sicherheitsgründen keine
Dateianhänge in E-Mail oder WhatsApp einfügen. Deshalb wird das PDF zuerst
heruntergeladen, dann öffnet sich Mailprogramm bzw. WhatsApp mit der
Zusammenfassung als Text – der Besucher hängt die Datei selbst an. Ein
automatischer Versand mit Anhang wäre nur mit einem Backend möglich (siehe
`formEndpoint`).

## Sprachen

Über das Globus-Symbol in der Navigation lässt sich die Website umschalten:
Deutsch, Englisch, Türkisch, Chinesisch, Polnisch, Dänisch und Arabisch.
Arabisch schaltet automatisch auf Schreibrichtung von rechts nach links.

Die Texte stehen in `assets/i18n-texte.js`, die Logik in `assets/i18n.js`.
Übersetzt werden Navigation, Startseite, Formular, Footer und der Assistent.
Auf Unterseiten erscheint eine Hinweiszeile in der gewählten Sprache, dass
die Seite vollständig nur auf Deutsch vorliegt.

**Neue Sprache ergänzen:** in `SPRACHEN` einen Eintrag anlegen (Code,
Eigenname, deutscher Name, Schreibrichtung) und in `TEXTE` einen Block mit
denselben Schlüsseln. Fehlt ein Schlüssel, erscheint automatisch der deutsche
Text – die Seite bleibt also immer benutzbar.

**Neuen Text übersetzbar machen:** dem Element `data-t="schluessel"` geben
und den Schlüssel in allen Sprachblöcken ergänzen. Für Eingabefelder gibt es
`data-t-platzhalter`.

Rechtlich gilt: Impressum, Datenschutz und AGB bleiben nur auf Deutsch
verbindlich. Das steht so im Impressum unter "Sprachfassungen" und in den
AGB Ziffer 20.3.

## Soziale Netzwerke

Die Profil-Adressen stehen unter `social` in `assets/site-config.js`. Tragt
dort die vollständige Adresse ein, zum Beispiel:

    facebook: "https://www.facebook.com/euerprofil",

Netzwerke ohne Adresse werden trotzdem angezeigt – blass, gestrichelt
umrandet und nicht anklickbar, mit dem Hinweis, dass der Kanal im Aufbau ist.
Sobald ihr die Adresse einsetzt, wird daraus automatisch ein aktiver Verweis,
und der Hinweistext verschwindet.

Steuerung dazu:

    socialVorschau: true     leere Netzwerke als "in Vorbereitung" zeigen
    socialVorschau: false    leere Netzwerke ausblenden
    socialAusblenden: ["xing"]   einzelne Netzwerke ganz weglassen

Verfügbar sind Facebook, Instagram, TikTok, LinkedIn, YouTube, Xing und
WhatsApp-Kanal.

Wichtig: Die Vorschau ist rechtlich abgesichert (Impressum und
Datenschutzerklärung weisen darauf hin, dass noch kein Profil besteht). Sie
sollte aber nicht dauerhaft laufen – legt die Kanäle in den nächsten Wochen
tatsächlich an oder blendet die ungenutzten über `socialAusblenden` aus.

Die Symbole erscheinen automatisch im Footer jeder Seite und im Kontaktblock
der Startseite. Zusätzlich werden die Profile in den strukturierten Daten
(schema.org `sameAs`) hinterlegt – dadurch erkennt Google, dass Website und
Profile zum selben Unternehmen gehören.

Datenschutzhinweis: Es sind reine Verlinkungen, keine Schaltflächen der
Anbieter. Erst beim Klick entsteht eine Verbindung zum Netzwerk.

## Lernfunktion und Wiedererkennung

`assets/assistant-lernen.js` erweitert den Assistenten um vier Dinge:

1. **Wiedererkennung** – eine zufällige Kennung im localStorage erkennt
   dasselbe Gerät bei einem späteren Besuch. Die Begrüßung ändert sich dann
   ("Ihr 3. Besuch – zuletzt ging es um Preise").
2. **Verhalten** – gelesene Abschnitte werden je Thema gezählt und steuern,
   welche Vorschläge zuerst erscheinen.
3. **Lernen** – bei "Hat das geholfen? Ja" werden die Begriffe der Frage mit
   der Antwort verknüpft und beim nächsten Mal höher gewichtet. Unbeantwortete
   Fragen landen in einer Liste.
4. **Ansprache** – nach 45 Sekunden aktiver Verweildauer (einstellbar über
   `hilfeNachSekunden`) bietet der Assistent einmalig Hilfe an, passend zum
   gerade gelesenen Abschnitt.

**Einwilligung ist Pflicht.** Ohne Zustimmung wird nichts gespeichert; der
Assistent fragt beim ersten Öffnen freundlich nach. Im Fenster gibt es
dauerhaft "Merken beenden und Daten löschen". Beschrieben ist das in Ziffer
10 der Datenschutzerklärung.

### Lernbericht abrufen

Tippt im Assistenten das Wort `lernbericht` ein. Ihr seht dann Besuchszahl,
gelernte Verknüpfungen, meistgelesene Themen und vor allem die **Fragen, die
der Assistent nicht beantworten konnte**. Über "Bericht kopieren" landet alles
in der Zwischenablage – diese Fragen gehören als neue Einträge in
`assistant-data.js`. So wächst die Wissensbasis mit jeder Woche.

### Wichtige Einschränkung

Das Gelernte gilt **je Gerät**, nicht übergreifend. Ein Assistent, der aus
allen Besuchergesprächen gemeinsam lernt, braucht einen Server: Tragt dazu
unter `lernEndpoint` eine URL ein, dann werden unbeantwortete Fragen anonym
dorthin gemeldet. Dieser Dienst muss dann in der Datenschutzerklärung ergänzt
werden. Ohne Endpoint bleibt alles auf dem Gerät des Besuchers.

## Live-Chat und Sprachfunktion

Das Fenster unten rechts öffnet mit einer Übersicht: „Frage stellen"
(Assistent) oder „Mit uns schreiben" (Live-Chat), darunter die häufigsten
Themen als Kacheln und die Direktwege Anruf und Formular.

Der Assistent schlägt nach jeder Antwort passende Folgefragen vor und fragt
kurz nach, ob die Antwort geholfen hat. Bei „Nein" bietet er an, die Frage
direkt an euch weiterzugeben – die Frage wird dabei in den Live-Chat
übernommen. Fragt jemand nach einem Bereich („Welche Module gibt es für
Lager?"), listet er die Module dieser Kategorie mit Preisen auf.

Ohne eigenes Backend läuft der Live-Chat über WhatsApp, E-Mail, Telefon
oder Formular: Der Besucher tippt seine Nachricht und wählt anschließend
aus vier Kanälen, wie sie zu euch kommt.
Die WhatsApp-Nummer und die Erreichbarkeitszeiten stehen in
`assets/site-config.js`. Der grüne Punkt am Reiter zeigt anhand dieser
Zeiten, ob gerade jemand erreichbar ist.

Habt ihr später einen Chat-Dienst oder ein eigenes Backend, tragt die URL
unter `chatEndpoint` ein – dann werden Nachrichten direkt gesendet. Ein
externer Dienst muss dann in der Datenschutzerklärung ergänzt werden.

Die Sprachfunktion (Mikrofon und Vorlesen) ist standardmäßig sichtbar, aber
inaktiv. Vor der ersten Mikrofonnutzung fragt der Assistent um Zustimmung,
weil die Spracherkennung vom Browser stammt und bei Chrome/Edge an dessen
Server geht. Abschalten lässt sich beides über `sprachEingabe` und
`sprachAusgabe` in der Konfiguration.

## Gestaltung und Bewegung

Die Website ist als zusammenhängende, cinematische Szene aufgebaut: dunkles
Anthrazit als Grundfläche, gezielt einzelne helle Abschnitte (Statement,
Preise) und Petrol ausschließlich als technisches Signal.

**Farben, Abstände, Radien und Bewegung stehen als CSS-Variablen ganz oben in
`assets/style.css`.** Wer die Farbwelt ändern möchte, ändert nur diesen Block.
Ein Abschnitt wird zur hellen Szene, indem er die Klasse `tone-light` bekommt –
dort werden dieselben Variablen umgekehrt belegt, alle Bausteine passen sich
automatisch an.

Das Stylesheet ist von oben nach unten gegliedert: Tokens, Reset, Typografie,
Layout, Navigation, Buttons, Hero, Systemarchitektur, Sektionen, Leistungen,
Demos, Prozess, Preise, Projekt-Check, Kontakt, Footer, Modulseite,
Unterseiten, Overlays, Motion, Responsive, Barrierefreiheit.

Jede Sektion trägt über `data-nr` eine technische Kennung („01 / Leistungen“).
Sie steht als `::before` über der Überschrift, darunter läuft beim Erreichen
der Sektion eine Linie durch. Damit hat jeder Abschnitt dieselbe Anmutung wie
ein Blatt einer technischen Zeichnung – ohne zusätzliches Markup.

### Die Systemarchitektur im Hero

`assets/hero-system.js` zeichnet, was die Firma tatsächlich baut: eine
geschichtete Systemarchitektur in der Bildsprache einer technischen
Explosionszeichnung.

* **Interface** – Website, Shop, Portal, App
* **Logic** – Prozesse, Regeln, Automatisierung, Systemkern
* **Data** – Datenhaltung, Dateien, Synchronisation
* darunter das Bezugsraster mit dem Grundriss der Anlage

Die Ebenen sind über Steigleitungen verbunden, auf jeder Ebene laufen
rechtwinklige Leiterbahnen zwischen den Knoten, darauf wandern Datenpakete.
Beim Scrollen fährt die Anlage auseinander. Die Legende unter der Zeichnung
benennt die Ebenen und sagt zugleich, was in einem Projekt darin steckt – die
Grafik erklärt sich damit selbst.

Bewusst **ohne Three.js und ohne CDN**: die Geometrie entsteht im Code,
gezeichnet wird mit Canvas 2D (eigene Perspektivprojektion, Rückseiten-
aussortierung über die Weltnormale, Tiefensortierung). Das spart rund 600 KB,
bleibt DSGVO-freundlich und läuft auch dort, wo WebGL fehlt.

Rücksicht auf Gerät und Nutzer:

* die Auflösung ist auf das Doppelte der Bildschirmpunkte begrenzt, auf
  Smartphones auf das Anderthalbfache und mit weniger Geometrie
* die Animation pausiert, sobald die Szene aus dem Bild scrollt oder der Tab
  in den Hintergrund wechselt
* alle Szenen teilen sich eine einzige Animationsschleife
* bei `prefers-reduced-motion` wird ein einziges ruhiges Standbild gezeichnet
* ohne Canvas bleibt eine vollständige statische SVG-Zeichnung stehen

### Der Systemstrang

`assets/system-field.js` zieht einen durchgehenden Strang durch den linken
Seitenrand. Jede Sektion mit `data-strang` hat darauf einen Knoten: erreichte
Abschnitte sind verbunden und aktiv, kommende liegen unverbunden davor, und
beim Erreichen einer Sektion läuft ein Signal vom vorigen Knoten zum neuen.
Die Seite baut sich beim Scrollen als ein System zusammen, statt aus einzelnen
Effekten zu bestehen.

* das Canvas ist nur so breit wie die gezeichnete Spalte, nicht
  bildschirmfüllend – ein volles Canvas müsste bei jedem Scroll-Bild komplett
  geleert werden
* über hellen Szenen kehren sich die Farben um, damit der Strang nie abreißt
* die Schleife läuft nur, solange ein Signal unterwegs ist; sonst wird beim
  Scrollen lediglich neu gezeichnet
* unterhalb von 1180 px gibt es keinen Seitenrand dafür – dort entfällt er

### Das Bewegungssystem

`assets/motion.js` ist die einzige Stelle, an der Bewegung entsteht: Reveals,
Navigationszustand, Szenenfortschritt, Prozess-Timeline, Zeigerlicht,
Magnetwirkung der Handlungsaufforderungen, Decode-Marken, Fortschrittslinie,
Sektionsanzeiger und Seitenwechsel – gebündelt in einem einzigen Scroll-Zuhörer
und einem `requestAnimationFrame`.

Zwei Entscheidungen sind dabei wichtig und leicht zu übersehen:

* **Reveals laufen als Maske (`mask-size`), nicht als `clip-path`.** Ein per
  `clip-path` beschnittenes Element meldet dem `IntersectionObserver` eine
  leere Schnittfläche – es würde nie ausgelöst und bliebe für immer
  unsichtbar. Eine Maske ist ein reiner Malvorgang und stört die Messung nicht.
* **Der Szenenfortschritt `--sp` wird nur dort gesetzt, wo er gelesen wird.**
  Eine Custom Property auf einer ganzen Sektion stößt bei jeder Änderung die
  Stilberechnung des gesamten Teilbaums an.

Text wird für Animationen nie zerlegt. Der Decode-Effekt auf den technischen
Marken holt seinen Zieltext aus dem Sprachsystem statt aus dem Zwischenstand
im DOM – ein Sprachwechsel mitten im Lauf kann deshalb weder eine falsche
Sprache wiederherstellen noch eine verwürfelte Beschriftung hinterlassen.

### Reduzierte Bewegung

Bei `prefers-reduced-motion: reduce` entfallen Tiefenbewegung, Kameradrift,
Signale auf dem Systemstrang, Datenpakete, Masken-Reveals und die Blende
zwischen den Seiten. Die Systemarchitektur wird als fertig aufgebautes
Standbild gezeichnet, der Strang steht vollständig da. Alle Inhalte sind sofort
sichtbar, ohne dass Bedienung oder Inhalt verloren gehen.

## Datenschutz

Es werden keine Cookies gesetzt, keine Analyse-Tools und keine externen
Schriftarten oder CDNs geladen. Alle Dateien kommen vom eigenen Server –
dadurch ist kein Cookie-Banner erforderlich. Auch die Systemarchitektur im
Hero kommt ohne externe Bibliothek und ohne nachgeladene Modelle aus.

## Lokal starten

Die Website ist reines HTML/CSS/JS ohne Build-Schritt. Zum Ansehen reicht
ein beliebiger statischer Webserver im Projektordner, zum Beispiel:

    python3 -m http.server 4173

Anschließend `http://localhost:4173/index.html` im Browser öffnen. Ein
Öffnen der Dateien direkt per `file://` funktioniert nicht zuverlässig, da
Skripte dann teils durch die Sicherheitsrichtlinien des Browsers blockiert
werden.

## Automatisierte Tests (Playwright)

Im Ordner `tests/` liegt eine Playwright-Testsuite, die die wichtigsten
Abläufe der Website automatisiert prüft: Navigation, mobiles Menü,
Projekt-Check, Kontaktformular (Validierung sowie erfolgreicher und
fehlerhafter Versand – beides über abgefangene Netzwerkantworten, ohne
echten Versand), Domainprüfung, Website-Assistent, Sprachumschaltung,
Datenschutzdialog, Modulkatalog, Moduldemos sowie Angebot/PDF. Dazu prüft
`tests/redesign.spec.js` die Gestaltung dort, wo sie die Bedienung berührt:
Systemobjekt und Ersatzgrafik im Hero, Navigationszustand beim Scrollen,
Prozess-Timeline, Wechsel der Beispielmodule per Maus und Tastatur, Lesbarkeit
der hellen Szenen, Footer, Seitenwechsel, Vollbildmenü und reduzierte Bewegung.
Getestet wird bei den Bildschirmbreiten 390, 768, 1024 und 1440 Pixel. Es
werden zu keinem Zeitpunkt echte Nachrichten, E-Mails oder WhatsApp-Nachrichten
versendet.

Einmalig einrichten:

    npm install

Tests ausführen (startet den lokalen Server automatisch):

    npm test

Ergebnisse einzeln nachvollziehen (Trace-Viewer, Screenshots bei
Fehlschlägen):

    npx playwright show-report

Nur eine Bildschirmbreite testen, z. B. Smartphone:

    npx playwright test --project=mobile-390

## Deployment

Die einfachste Variante bleibt klassisches Hosting: Alle Dateien außer
`tests/`, `node_modules/`, `package.json`, `package-lock.json` und
`playwright.config.js` per FTP/SFTP hochladen (diese vier braucht nur die
Testsuite, nicht die Website selbst). `functions/api/contact.js` und
`_headers` werden bei reinem FTP/SFTP-Hosting ignoriert und bleiben
wirkungslos, bis auf eine Plattform mit Funktionen-Unterstützung
umgestellt wird (siehe „Kontaktformular – Server-Setup" oben) – die Website
funktioniert bis dahin unverändert mit dem mailto-Fallback weiter.

Für echten Formularversand und vorbereitete Sicherheits-Header: Deployment
über Cloudflare Pages wie im Abschnitt „Kontaktformular – Server-Setup"
beschrieben (Git-Repository verbinden oder Ordner hochladen, danach
automatischer Neubau bei jeder Änderung).
