# Hahne Digital – Design-System

Diese Datei beschreibt die Gestaltungsrichtung und das Regelwerk hinter
`assets/style.css`. Sie ist die Quelle für jede spätere Änderung: neue
Abschnitte bauen aus diesen Bausteinen, statt eigene Werte zu erfinden.

---

## 1. Design Concept

**„Technische Zeichnung / Betriebssystem“**

Hahne Digital baut Systeme, nicht Oberflächen. Die Seite behauptet das nicht
nur, sie sieht danach aus: Maßlinien, Koordinatenmarken, Monoschrift für alles
Technische, geschichtete Tiefe, ein Rahmen, der über den Bildrand hinausläuft,
weil die Anlage größer ist als der gezeigte Ausschnitt.

Der Gegenentwurf ist bewusst kein „AI-Landingpage-Look“: kein Neon, kein Glas,
keine Verlaufsflächen. Autorität entsteht aus Präzision — 1-px-Linien, ein
einziger Akzent, große Größenkontraste, viel Ruhe.

## 2. Visual Language

| Baustein | Regel |
| --- | --- |
| Fläche | Vier Stufen: `--paper` → `--surface-1/2/3`. Karten sind Fläche + 1 px Linie + `--rim`. Kein Glas außer in der Navigationsleiste. |
| Linie | `--line` (Trennung), `--line-soft` (Innenraster), `--line-strong` (Kante). Immer 1 px. |
| Tiefe | Genau drei Schatten (`--sh-1/2/3`). Alles andere hebt sich über Fläche und Linie ab, nicht über Schatten. |
| Raster | Sechs Spalten, sichtbar als haarfeine Struktur hinter dem Inhalt (`body:after`) und als Teilstriche auf den Maßlinien der Sektionsköpfe. |
| Marken | Sektionen tragen eine Kennung `NN / Gesamt`, Zeichnungen eine Revisionszeile, Statusleisten einen pulsenden Punkt. |
| Korn | Eine statische Rauschebene über der Seite (3 % Deckung) nimmt den Flächen das Digitale. |

## 3. Typography

Kein Webfont — die Seite lädt nichts von fremden Servern. Die Wirkung kommt
aus **Größenkontrast und Laufweite**, nicht aus einer Schriftlizenz.

```
--fs-display  clamp(2.9rem, 6.6vw, 5.8rem)   Wortmarken, Ausnahmen
--fs-h1       clamp(2.3rem, 4.25vw, 4.2rem)  Hero, Seitentitel
--fs-h2       clamp(2rem, 4.3vw, 3.7rem)     Sektionsüberschriften
--fs-h3       clamp(1.32rem, 2.2vw, 2rem)    Leistungen, Karten, Panels
--fs-h4       clamp(1.06rem, 1.35vw, 1.26rem) Prozess, Pakete, Personen
--fs-lead     clamp(1.02rem, 1.2vw, 1.2rem)  Vorspann
--fs-body     clamp(.95rem, .95vw, 1.02rem)  Fließtext
--fs-small    .875rem                        Listen, Karten
--fs-mini     .8rem                          Hinweise
--fs-label    .7rem                          Kicker, Buttons (Mono)
--fs-meta     .64rem                          HUD, Metadaten (Mono)
```

Laufweiten: `--tr-display -.045em`, `--tr-head -.035em`, `--tr-title -.02em`,
`--tr-label .18em`, `--tr-meta .22em`.
Zeilenhöhen: `--lh-display .94`, `--lh-head 1.06`, `--lh-title 1.22`,
`--lh-body 1.7`. Textbreiten: `--mw-head 16ch`, `--mw-lead 58ch`,
`--mw-body 64ch`.

**Regel:** Komponenten setzen keine eigenen `clamp()`-Größen. Wer eine neue
Größe braucht, nimmt die nächstgelegene aus der Skala.

## 4. Color System

```
--void      #050607   Footer, Overlays
--paper     #08090b   Seitengrund
--surface-1 #0d0f12   Karten, Panels
--surface-2 #12161a   abgesetzte Flächen in Karten
--surface-3 #191e23   hervorgehobene Karte

--ink        #f3f5f6           Überschriften, harte Aussagen
--ink-soft   72 % Deckung      Fließtext
--ink-faint  55 % Deckung      Metadaten
--ink-ghost  28 % Deckung      Beiwerk

--accent     #0f7480   Flächen, Buttons
--accent-dark#0a5560   Hover
--accent-ink #5ad3de   Schrift, Linien, Signale auf Dunkel
--sand       #e2bd82   ausschließlich Beträge (--preis)
```

Zwei Farbfamilien tragen alles: **Petrol** für alles Interaktive und
Technische, **Sand** ausschließlich für Geld. Diese Trennung macht Preise auf
jeder Seite in einer Zehntelsekunde auffindbar, ohne dass die Seite bunt wird.

Die helle Szene (`.tone-light`, Statement und Preise) definiert dieselben
Token invertiert — jede Komponente funktioniert dort unverändert. Auf hellem
Grund steht der Betrag in Textfarbe statt in Sand: Braun auf Creme wäre laut,
`--preis` löst das an genau einer Stelle.

## 5. Motion Language

**Bewegung heißt: gezeichnet, gemessen, freigelegt — nie eingeblendet.**

| Rolle | Umsetzung |
| --- | --- |
| Reveal | Maske statt Opazität: der Inhalt läuft hinter einer Kante hervor (`mask-size 100% 0% → 100% 140%`). Bewusst keine `clip-path` — ein beschnittenes Element meldet dem `IntersectionObserver` eine leere Schnittfläche und würde nie ausgelöst. |
| Maßlinie | Sektionsköpfe ziehen ihre Linie einmal durch (`transform: scaleX`). |
| Signalkante | Zeilen und Zellen (Leistungen, Kennzahlen, Standards) lassen beim Überfahren die obere Kante als Signallinie durchlaufen. Eine Geste, vier Orte. |
| Tiefe | `--sp` je Szene (0…1) speist Parallaxe im Hero und im Statement — nur `transform`, nie Layout. |
| Zeichnung | Canvas-Systemarchitektur mit eigener Projektion, Datenpaketen auf den Leiterbahnen und scrollabhängiger Explosionsdarstellung. |
| Zeiger | Zeigerlicht (`.spotlight`), Neigung der Bühne, Magnetknöpfe (max. 8 px) — nur an echten Zeigegeräten. |

Token: `--duration-fast 170ms`, `--duration-medium 400ms`,
`--duration-slow 820ms`, `--duration-cine 1400ms`;
`--ease-out`, `--ease-smooth`, `--ease-in-out`, `--ease-entry`;
Kurzformen `--t-hover`, `--t-state`, `--t-reveal`.

`prefers-reduced-motion: reduce` liefert eine **vollständige, stille Fassung**:
die Zeichnung steht als fertiges Standbild, kein Element bleibt maskiert,
keine Ebene verschoben, keine Seitenblende.

## 6. UX Strategy

Die Seite führt in einer Dramaturgie, nicht in einer Liste:

1. **Positionierung** — Hero: Satz links, dieselbe Aussage als Zeichnung rechts
2. **Substanz** — Kennzahlenband (echte Zahlen, keine Behauptungen)
3. **Leistungen** — nummeriertes Datenblatt statt Karten nebeneinander
4. **Standards** — DSGVO, Server, Barrierefreiheit, Modularität
5. **Beweis** — Modulkonsole: echte Bildschirme in einem Fenster
6. **Haltung** — heller Bruch, ein Satz, eine Quelle
7. **Prozess** — vier Schritte mit Dauerangaben
8. **Angebote** — Teaser, Pakete, Server
9. **Einordnung** — Projekt-Check
10. **Vertrauen** — Über uns
11. **Umwandlung** — Kontakt

Jeder Abschnitt endet auf einer möglichen nächsten Handlung.

## 7. Hero Concept

**„Die Anlage“.** Links steht der Satz, rechts steht derselbe Satz als
Zeichnung. Der Zeichnungsrahmen hat auf der Außenseite keine Kante und läuft
über den Bildrand hinaus: das System ist größer als der Ausschnitt, den die
Seite zeigt.

Unter der Zeichnung erklärt eine Legende die drei Ebenen. **Wer in der Legende
auf „Logic“ zeigt, sieht in der Zeichnung genau diese Ebene** — die übrigen
treten auf 28 % zurück. Das ist keine Dekoration, sondern die Erklärung des
Bildes: die Legende sagt, was die Ebene bedeutet, die Zeichnung zeigt, wo sie
liegt.

Der gesamte Hero passt auf allen Desktop-Höhen in eine Bildschirmhöhe,
inklusive Kennwerten und HUD-Zeile.

## 8. Conversion Strategy

- Zwei Handlungsaufforderungen im Hero, klar gewichtet: Projekt-Check (gefüllt)
  vor Modulübersicht (Umriss).
- Direkt darunter die Zeile, die die letzte Hürde nimmt: *20 Minuten,
  kostenlos, unverbindlich — und Sie wissen danach, was Ihr Vorhaben
  ungefähr kostet.*
- Preise im Sandton: auf jeder Seite in einer Zehntelsekunde auffindbar.
- Prozessschritte tragen Dauerangaben — Unsicherheit über den Aufwand ist der
  häufigste Grund, nicht anzufragen.
- Der Projekt-Check steht **vor** „Über uns“ und schreibt sein Ergebnis in das
  Kontaktformular.
- Die Handlungsaufforderung der Leiste steht im geöffneten mobilen Menü unten
  fest.

## 9. Regeln für Erweiterungen

1. Keine neue Farbe ohne Token. Keine neue Größe außerhalb der Skala.
2. Abstände kommen aus `--s-1 … --s-12`, Radien aus `--r-xs … --r-pill`.
3. Jeder Effekt braucht einen Grund. Bewegung, die nichts erklärt, entfällt.
4. Jede Komponente muss in der hellen Szene ohne Sonderregel funktionieren.
5. Fokuszustände sind nicht verhandelbar (siehe Abschnitt 22 im Stylesheet).
6. Kein externer Font, kein CDN, kein Tracker.

## 10. Assets, die die Seite weiter heben würden

Die Seite kommt ohne Fotos aus — alle Bildmarken sind SVG, CSS oder Canvas.
Folgende echte Assets würden sie trotzdem weiterbringen:

| Asset | Format | Seitenverhältnis | Auflösung | Motiv | Stil | Verwendungsort |
| --- | --- | --- | --- | --- | --- | --- |
| `team-portrait.webp` | WebP + AVIF | 4:5 | 1200 × 1500 | Björn und Malte Hahne, Halbporträt, Arbeitsumgebung | vorhandenes Licht, kühler Anthrazit-Hintergrund, kein Studio-Weiß | `#ueber-uns`, ersetzt die Monogrammplatten |
| `werkstatt-detail.webp` | WebP + AVIF | 16:9 | 2400 × 1350 | Bildschirm mit laufendem Kundensystem, im Anschnitt | flache Schärfentiefe, kein Stock-Look | Statement-Sektion, rechte Hälfte |
| `eckernfoerde.webp` | WebP + AVIF | 3:2 | 1800 × 1200 | Hafen Eckernförde, gedämpft, kein Postkartenmotiv | entsättigt, in die Farbwelt eingepasst | `#ueber-uns`, Randnotiz Standort |
| `referenz-01…03.webp` | WebP + AVIF | 16:10 | 2000 × 1250 | Bildschirmfotos echter Kundensysteme (nach Freigabe) | Gerätrahmen aus CSS, Inhalt echt | neue Referenzsektion |
| `og-bild-2026.png` | PNG | 1.91:1 | 1200 × 630 | Systemzeichnung auf Anthrazit mit Wortmarke | wie der Hero-Render | Open Graph, ersetzt das aktuelle Bild |
| Variable Grotesk | WOFF2 | – | – | eine lizenzierte, selbst gehostete Display-Grotesk (z. B. mit echten optischen Größen) | eng laufend, hoher Kontrast in großen Graden | ersetzt `--display`; einziger sinnvoller Grund für einen zusätzlichen Ladevorgang |

Bis dahin gilt: keine Platzhalter. Wo kein Bild ist, steht eine hochwertige
Zeichnung.
