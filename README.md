# XSC Patcher Web UI

## About the Project

The XSC Patcher Web UI is a user-friendly web application built on top of the [xsc-patcher](https://github.com/Smotherer007/xsc-patcher) command-line tool. It provides a graphical interface for applying `.xsc` patch scripts to binary files directly in your browser. This simplifies the patching process by eliminating the need for command-line operations.

## Features

* **`.xsc` Patch Application:** Easily apply `.xsc` patch scripts to binary files through a web interface.
* **File Uploads:** Upload both the original binary file and the `.xsc` patch file in the browser.
* **Client-Side Patching:** Performs the `.xsc` patching process entirely within your browser.
* **Real-time Logging:** Displays the parsing and patching progress of the `.xsc` script.
* **Backup Functionality**: Automatically creates a backup of the original file before applying the `.xsc` patch.

## Video Demo

* **Video Demo:** [https://xsc-patcher.weppelmann.ddnss.de/](https://xsc-patcher.weppelmann.ddnss.de/)

## Installation

### Prerequisites

To set up and run this project locally for development or to build it for production, you will need:

* [Node.js](https://nodejs.org/) (LTS version recommended)
* [npm](https://www.npmjs.com/) (comes with Node.js)

### Steps

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/Smotherer007/xsc-patcher-webui.git](https://github.com/Smotherer007/xsc-patcher-webui.git)
    cd xsc-patcher-webui
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

## Usage

### For Development

To run the web application locally with hot-reloading for development:

```bash
npm run serve
For ProductionTo build