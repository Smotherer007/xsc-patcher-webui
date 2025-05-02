# XSC Patcher Web UI

## About the Project

The XSC Patcher Web UI is a user-friendly web application built on top of the [xsc-patcher](https://github.com/Smotherer007/xsc-patcher) command-line tool. It provides a graphical interface for applying `.xsc` patch scripts to binary files directly in your browser. This simplifies the patching process by eliminating the need for command-line operations.

## Features

* **Web-Based Interface:** Offers a simple and intuitive graphical interface for the patching process.
* **File Uploads:** Easily upload your original binary file and the `.xsc` patch file directly in the browser.
* **Client-Side Patching:** The entire patching process is performed within your browser using JavaScript and `Uint8Array` manipulation. This ensures that your files are not uploaded to a server.
* **Real-time Logging:** A built-in log console displays the parsing and patching progress, including any warnings or errors.
* **Custom Output Filename:** Option to specify a desired name for the patched output file.
* **Direct Download:** Download the patched file directly from the browser once the process is complete.
* **Input Validation:** Basic validation for file selection and `.xsc` format during the process.
* **Built with Vue 3 and Vuetify 3:** A modern and responsive user interface framework.
* **Backup Functionality**: Before applying any patches, the application automatically creates a backup of the original file with a `.bak` extension. This ensures that you can revert to the original file if needed.
* **Error Handling**: The application includes basic error handling for file operations, patch format, and application logic.

## Screenshots

* **Main View:** \[Add a screenshot of the main view of the web application here]
* **Log Console:** \[Add a screenshot of the log console during a patching process here]
* **File Upload:** \[Add a screenshot of the file upload section here]

## Video Demo

* **Video Demo:** \[Add a link to a video demonstration of the application here]

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
For ProductionTo build the web application for production:npm run build
The built files will be located in the dist/ directory. You can then deploy these files using any HTTP server.LicenseThis project is licensed under the MIT License.Copyright (c) 2025 patimwep

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
AcknowledgmentsTo Smotherer007 for developing the original [xsc-patcher](