import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import {
  applyPatch,
  type LogType,
  parseXscString,
  readFileAsArrayBuffer,
} from "./lib/patcher";

type LogEntry = {
  timestamp: Date;
  level: LogType;
  message: string;
  source?: string;
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
  @state() private logEntries: LogEntry[] = [];

  @query("crt-log") private logConsole?: HTMLElement;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
  }

  private addLog(text: string, type: LogType = "info") {
    const now = new Date();
    this.logEntries = [
      ...this.logEntries,
      { timestamp: now, level: type, message: text, source: "UI" },
    ];

    const log = this.logConsole as
      | (HTMLElement & {
          info?: (msg: string, src?: string) => void;
          warn?: (msg: string, src?: string) => void;
          error?: (msg: string, src?: string) => void;
          success?: (msg: string, src?: string) => void;
          debug?: (msg: string, src?: string) => void;
        })
      | undefined;
    log?.[type]?.(text, "UI");
  }

  private clearLog() {
    this.logEntries = [];
  }

  private getFilesFromEvent(event: Event): File[] {
    const target = event.target as HTMLInputElement & { files?: FileList };
    const detailFiles = (event as CustomEvent)?.detail?.files as
      | File[]
      | undefined;
    if (target?.files) {
      return Array.from(target.files);
    }
    if (detailFiles) {
      return detailFiles;
    }
    return [];
  }

  private handleFileChange(event: Event, field: "original" | "patch") {
    const file = this.getFilesFromEvent(event)[0] ?? null;
    if (field === "original") {
      this.originalFile = file;
    } else {
      this.patchFile = file;
    }
  }

  private handleOutputChange(event: Event) {
    const target = event.target as HTMLInputElement & { value?: string };
    this.outputFilename = target?.value ?? "";
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
        <crt-overlay contained></crt-overlay>
        <div class="app-shell">
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
              <crt-file-input
                label="ORIGINAL FILE"
                placeholder="Choose a file..."
                @change=${(event: Event) =>
                  this.handleFileChange(event, "original")}
              ></crt-file-input>
            </div>

            <div class="field">
              <crt-file-input
                label="PATCH FILE (.xsc)"
                placeholder="Choose a patch..."
                accept=".xsc"
                @change=${(event: Event) =>
                  this.handleFileChange(event, "patch")}
              ></crt-file-input>
            </div>

            <div class="field">
              <crt-input
                label="DESIRED OUTPUT FILENAME (OPTIONAL)"
                placeholder="e.g., my_patched_script.xsc"
                .value=${this.outputFilename}
                @input=${this.handleOutputChange}
              ></crt-input>
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
              ${this.logEntries.length
                ? html`<crt-button variant="ghost" @click=${this.clearLog}
                    >Clear Log</crt-button
                  >`
                : null}
            </div>
            <crt-log title="APPLICATION LOG" .entries=${this.logEntries}></crt-log>
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
