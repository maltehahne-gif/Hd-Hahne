# Three.js – lokale Kopie

Diese Dateien liegen bewusst **im Repository** und werden nicht von einem CDN
geladen. Grund: Die Website lädt grundsätzlich keine Inhalte von fremden
Servern (siehe Kopf von `assets/style.css` und die Datenschutzerklärung) –
ein CDN-Aufruf würde die IP-Adresse der Besucher an Dritte übertragen.

    three.module.min.js   Three.js, ES-Modul (importiert three.core.min.js)
    three.core.min.js     Kern von Three.js
    LICENSE               MIT-Lizenz von Three.js

## Version

    Three.js 0.185.1
    Bezogen über: npm pack three@0.185.1  (Dateien aus package/build/)
    Lizenz: MIT (siehe LICENSE)

## Aktualisieren

    npm pack three@<version>
    tar -xzf three-<version>.tgz package/build/three.module.min.js \
        package/build/three.core.min.js package/LICENSE
    cp package/build/three.*.min.js package/LICENSE assets/vendor/three/

Danach die Versionsangabe oben anpassen. Die beiden Build-Dateien gehören
zusammen: `three.module.min.js` importiert `./three.core.min.js` relativ,
beide müssen also im selben Ordner bleiben.

## Wo wird das genutzt?

Ausschließlich in `assets/hero3d.js` für die 3D-Szene auf der Startseite.
Der Import erfolgt dynamisch (`import()`) und nur dann, wenn WebGL vorhanden
ist, der Bildschirm groß genug ist und der Besucher keine reduzierte
Bewegung angefordert hat. Ohne diese Voraussetzungen wird Three.js gar nicht
geladen – die Startseite zeigt dann die CSS-Variante der Systemmontage.
