# XSC Patcher Web UI

## About the Project

The XSC Patcher Web UI ist eine benutzerfreundliche Webanwendung, die auf dem [xsc-patcher](https://github.com/Smotherer007/xsc-patcher) Kommandozeilen-Tool aufbaut. Sie bietet eine grafische Oberfläche zum Anwenden von `.xsc`-Patchskripten auf Binärdateien direkt in Ihrem Browser. Dies vereinfacht den Patchvorgang, da keine Kommandozeilenbedienung erforderlich ist.

## Features

* **`.xsc` Patch Anwendung:** Einfaches Anwenden von `.xsc`-Patchskripten auf Binärdateien über eine Webschnittstelle.
* **Datei-Uploads:** Laden Sie sowohl die originale Binärdatei als auch die `.xsc`-Patchdatei im Browser hoch.
* **Clientseitiges Patchen:** Führt den `.xsc`-Patchvorgang vollständig in Ihrem Browser aus.
* **Echtzeit-Protokollierung:** Zeigt den Fortschritt des Parsens und Patchens des `.xsc`-Skripts an.
* **Backup-Funktionalität**: Erstellt automatisch ein Backup der originalen Datei, bevor der `.xsc`-Patch angewendet wird.

## Screenshots

* **Hauptansicht:** \[Fügen Sie hier einen Screenshot der Hauptansicht der Webanwendung ein]
* **Log-Konsole:** \[Fügen Sie hier einen Screenshot der Log-Konsole während eines Patchvorgangs ein]
* **Datei-Upload:** \[Fügen Sie hier einen Screenshot des Datei-Upload-Bereichs ein]

## Video-Demo

* **Video-Demo:** [https://xsc-patcher.weppelmann.ddnss.de/](https://xsc-patcher.weppelmann.ddnss.de/)

## Installation

### Voraussetzungen

Um dieses Projekt lokal für die Entwicklung einzurichten oder es für die Produktion zu erstellen, benötigen Sie:

* [Node.js](https://nodejs.org/) (LTS-Version empfohlen)
* [npm](https://www.npmjs.com/) (wird mit Node.js geliefert)

### Schritte

1.  **Repository klonen:**

    ```bash
    git clone [https://github.com/Smotherer007/xsc-patcher-webui.git](https://github.com/Smotherer007/xsc-patcher-webui.git)
    cd xsc-patcher-webui
    ```

2.  **Abhängigkeiten installieren:**

    ```bash
    npm install
    ```

## Verwendung

### Für Entwicklung

Um die Webanwendung lokal mit Hot-Reloading für die Entwicklung auszuführen:

```bash
npm run serve
Für ProduktionUm die Webanwendung für die Produktion zu erstellen:npm run build
Die erstellten Dateien befinden sich im Verzeichnis dist/. Sie können diese Dateien dann mit einem beliebigen HTTP-Server bereitstellen.LizenzWeitere Informationen finden Sie in der MIT-Lizenz.DanksagungAn Smotherer007 für die Entwicklung des originalen Kommandozeilen-Tools [xsc