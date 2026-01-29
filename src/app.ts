import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import {
  applyPatch,
  type LogType,
  parseXscString,
  readFileAsArrayBuffer,
} from "./lib/patcher";

type LogEntry = {
  timestamp: string;
  text: string;
  type: LogType;
};

@customElement("xsc-patcher-app")
export class XscPatcherApp extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  @state() private originalFile: File | null = null;
  @state() private patchFile: File | null = null;
  @state() private outputFilename = "";
  @state() private downloadUrl: string | null = null;
  @state() private finalOutputFilename = "";
  @state() private loading = false;
  @state() private errorMessage: string | null = null;
  @state() private successMessage: string | null = null;
  @state() private logMessages: LogEntry[] = [];

  @query(".log-console") private logConsole?: HTMLDivElement;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
  }

  private addLog(text: string, type: LogType = "info") {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    this.logMessages = [...this.logMessages, { timestamp, text, type }];
    this.updateComplete.then(() => this.scrollLogToBottom());
  }

  private scrollLogToBottom() {
    if (this.logConsole) {
      this.logConsole.scrollTop = this.logConsole.scrollHeight;
    }
  }

  private clearLog() {
    this.logMessages = [];
  }

  private handleFileChange(event: Event, field: "original" | "patch") {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (field === "original") {
      this.originalFile = file;
    } else {
      this.patchFile = file;
    }
  }

  private calculateOutputFilename(): string {
    if (this.outputFilename) {
      if (!this.outputFilename.includes(".") && this.originalFile?.name) {
        const originalExt = this.originalFile.name.split(".").pop();
        return `${this.outputFilename}.${originalExt ?? "bin"}`;
      }
      if (!this.outputFilename.includes(".") && !this.originalFile?.name) {
        return `${this.outputFilename}.bin`;
      }
      return this.outputFilename;
    }

    if (this.originalFile) {
      const originalName = this.originalFile.name;
      const parts = originalName.split(".");
      if (parts.length > 1) {
        parts[parts.length - 2] = `${parts[parts.length - 2]}_patched`;
        return parts.join(".");
      }
      return `${originalName}_patched`;
    }

    return "patched_file.bin";
  }

  private async startPatchProcess() {
    this.errorMessage = null;
    this.successMessage = null;
    this.finalOutputFilename = "";
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = null;
    }

    this.clearLog();
    this.addLog("Starting client-side patch process...");

    if (!this.originalFile || !this.patchFile) {
      const message =
        "Please select both the original and patch files before continuing.";
      this.addLog(message, "error");
      this.errorMessage = message;
      return;
    }

    this.loading = true;
    this.addLog("Validation successful. Proceeding with file processing.");

    try {
      this.addLog(`Reading patch file: "${this.patchFile.name}"...`);
      const patchArrayBuffer = await readFileAsArrayBuffer(this.patchFile);
      this.addLog("Patch file read successfully. Decoding as UTF-8...");
      const patchString = new TextDecoder("utf-8").decode(patchArrayBuffer);
      this.addLog("Patch file decoded.");

      this.addLog("Parsing patch instructions from file content...");
      const replacements = parseXscString(patchString);

      if (!replacements || replacements.length === 0) {
        const noRulesError =
          "No valid 'REPLACEALL' instructions with matching lengths found in the patch file.";
        this.addLog(noRulesError, "error");
        this.errorMessage = noRulesError;
        return;
      }
      this.addLog(
        `Parsing complete. Found ${replacements.length} valid replacement rule(s).`
      );

      this.addLog(`Reading original file: "${this.originalFile.name}"...`);
      const originalArrayBuffer = await readFileAsArrayBuffer(this.originalFile);
      const originalUint8Array = new Uint8Array(originalArrayBuffer);
      this.addLog("Original file read successfully.");

      this.addLog("Applying patch to original file data...");
      const patchedUint8Array = applyPatch(originalUint8Array, replacements);

      if (patchedUint8Array === null) {
        const patchError =
          "Error applying patch: Critical error during byte replacement (data length changed unexpectedly).";
        this.addLog(patchError, "error");
        this.errorMessage = patchError;
        return;
      }
      this.addLog("Patch applied successfully (or no changes were needed).");

      this.addLog("Preparing patched file for download...");
      const patchedBuffer = patchedUint8Array.slice().buffer as ArrayBuffer;
      const patchedBlob = new Blob([patchedBuffer], {
        type: "application/octet-stream",
      });
      this.downloadUrl = URL.createObjectURL(patchedBlob);
      this.finalOutputFilename = this.calculateOutputFilename();

      this.addLog(
        `Patched file ready for download: "${this.finalOutputFilename}"`,
        "success"
      );
      this.successMessage =
        "File successfully patched! You can download it now.";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addLog(`An error occurred: ${message}`, "error");
      this.errorMessage = `An error occurred: ${message}`;
    } finally {
      this.loading = false;
      this.addLog("Patch process finished.");
    }
  }

  private triggerDownload() {
    if (!this.downloadUrl) return;
    const link = document.createElement("a");
    link.href = this.downloadUrl;
    link.download = this.finalOutputFilename || "patched_file.bin";
    link.click();
  }

  private get isFormValid() {
    return Boolean(this.originalFile && this.patchFile);
  }

  render() {
    return html`
      <div class="app-container">
          <div class="hero">
            <crt-heading level="1">XSC Patcher Web UI</crt-heading>
            <crt-text class="subtitle">
              Upload your original file and the patch file. The patching runs
              entirely in your browser.
            </crt-text>
          </div>

          <div class="panels">
            <div class="panel">
            ${this.errorMessage
              ? html`<crt-alert variant="error">${this.errorMessage}</crt-alert>`
              : null}
            ${this.successMessage
              ? html`<crt-alert variant="success"
                  >${this.successMessage}</crt-alert
                >`
              : null}

            <div class="field">
              <label>
                <crt-text>Original File (e.g., binary file)</crt-text>
              </label>
              <input
                type="file"
                @change=${(event: Event) =>
                  this.handleFileChange(event, "original")}
              />
            </div>

            <div class="field">
              <label>
                <crt-text>Patch File (.xsc)</crt-text>
              </label>
              <input
                type="file"
                accept=".xsc"
                @change=${(event: Event) =>
                  this.handleFileChange(event, "patch")}
              />
            </div>

            <div class="field">
              <label>
                <crt-text>Desired Output Filename (optional)</crt-text>
              </label>
              <input
                type="text"
                placeholder="e.g., my_patched_script.xsc"
                .value=${this.outputFilename}
                @input=${(event: Event) =>
                  (this.outputFilename = (event.target as HTMLInputElement)
                    .value)}
              />
            </div>

            <div class="actions">
              <crt-button
                ?disabled=${!this.isFormValid || this.loading}
                @click=${this.startPatchProcess}
              >
                ${this.loading ? "Processing..." : "Patch File"}
              </crt-button>
              ${this.downloadUrl
                ? html`<crt-button
                    variant="success"
                    @click=${this.triggerDownload}
                  >
                    Download Patched File (${this.finalOutputFilename})
                  </crt-button>`
                : null}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <crt-heading level="3">Process Log</crt-heading>
              ${this.logMessages.length
                ? html`<crt-button variant="ghost" @click=${this.clearLog}
                    >Clear Log</crt-button
                  >`
                : null}
            </div>
            <div class="log-console">
              ${this.logMessages.map(
                (entry) => html`
                  <p class="log-entry ${entry.type}">
                    <span class="log-time">${entry.timestamp}</span>
                    <span class="log-message">${entry.text}</span>
                  </p>
                `
              )}
            </div>
          </div>
          </div>
        </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "xsc-patcher-app": XscPatcherApp;
  }
}
