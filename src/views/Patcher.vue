<template>
  <v-container>
    <v-card class="mx-auto" max-width="600">
      <v-card-title class="text-h5"> XSC Patcher Web UI </v-card-title>
      <v-card-subtitle>
        Upload your original file and the patch file.
      </v-card-subtitle>

      <v-card-text>
        <v-alert v-if="error" type="error" dismissible @input="error = null">
          {{ error }}
        </v-alert>

        <v-alert
          v-if="successMessage"
          type="success"
          dismissible
          @input="successMessage = null"
        >
          {{ successMessage }}
        </v-alert>

        <v-form ref="form" v-model="valid" lazy-validation>
          <v-file-input
            v-model="originalFile"
            label="Original File (e.g., binary file)"
            prepend-icon="mdi-file"
            :rules="[(v) => !!v || 'Original file is required']"
            required
            show-size
            counter
          ></v-file-input>

          <v-file-input
            v-model="patchFile"
            label="Patch File (.xsc)"
            prepend-icon="mdi-file-code"
            accept=".xsc"
            :rules="[(v) => !!v || 'Patch file (.xsc) is required']"
            required
            show-size
            counter
          ></v-file-input>

          <v-text-field
            v-model="outputFilename"
            label="Desired Output Filename (optional)"
            prepend-icon="mdi-file-download"
            placeholder="e.g., my_patched_script.xsc"
            hint="If left empty, a default name based on the original file will be used."
            clearable
          ></v-text-field>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :disabled="!valid || loading"
          :loading="loading"
          @click="startPatchProcess"
        >
          <v-icon left>mdi-auto-fix</v-icon>
          Patch File
        </v-btn>
      </v-card-actions>

      <v-card-text v-if="downloadUrl">
        <v-btn
          color="success"
          :href="downloadUrl"
          :download="finalOutputFilename"
          block
        >
          <v-icon left>mdi-download</v-icon>
          Download Patched File ({{ finalOutputFilename }})
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card class="mx-auto mt-4" max-width="600">
      <v-card-title class="text-h6">Process Log</v-card-title>
      <v-card-text>
        <div class="log-console" ref="logConsoleElement">
          <p
            v-for="(message, index) in logMessages"
            :key="index"
            :class="`log-message ${message.type}`"
          >
            <span class="log-timestamp">{{ message.timestamp }}</span>
            <span class="log-text">{{ message.text }}</span>
          </p>
        </div>
      </v-card-text>
      <v-card-actions v-if="logMessages.length > 0">
        <v-spacer></v-spacer>
        <v-btn small text @click="clearLog">Clear Log</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onUnmounted, nextTick } from "vue";

// --- Helper Functions for Browser Binary Data (Uint8Array) ---

/**
 * Converts a hexadecimal string (like "AB 01 CD") into a Uint8Array.
 * Handles optional spaces.
 * @param {string} hexString - The hex string.
 * @returns {Uint8Array} The resulting bytes.
 * @throws {Error} If the string contains invalid hex characters.
 */
const hexStringToUint8Array = (hexString) => {
  const cleanedHexString = hexString.replace(/ /g, "");
  if (cleanedHexString.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters.");
  }
  const bytes = new Uint8Array(cleanedHexString.length / 2);
  for (let i = 0; i < cleanedHexString.length; i += 2) {
    const byte = parseInt(cleanedHexString.substring(i, i + 2), 16);
    if (isNaN(byte)) {
      // Find the invalid characters
      const invalidSegment = cleanedHexString.substring(i, i + 2);
      throw new Error(`Invalid hex character found: "${invalidSegment}"`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
};

/**
 * Finds the first occurrence of a sequence of bytes within a Uint8Array.
 * Equivalent to Buffer.indexOf in Node.js.
 * @param {Uint8Array} source - The array to search within.
 * @param {Uint8Array} sequence - The sequence to search for.
 * @param {number} [fromIndex=0] - The index to start the search from.
 * @returns {number} The index of the first occurrence, or -1 if not found.
 */
const uint8ArrayIndexOfSequence = (source, sequence, fromIndex = 0) => {
  if (sequence.length === 0) return fromIndex;
  if (sequence.length > source.length) return -1;

  for (let i = fromIndex; i <= source.length - sequence.length; i++) {
    let found = true;
    for (let j = 0; j < sequence.length; j++) {
      if (source[i + j] !== sequence[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      return i;
    }
  }
  return -1;
};

// --- Adapted Core Logic (Browser Compatible) ---

/**
 * Parses .xsc string content to extract patch instructions.
 * Adapted from XscParser for browser environment (uses Uint8Array).
 * @param {string} content - String content of the XSC script.
 * @param {function} logFn - Function to use for logging parser messages (info/warn).
 * @returns {Array<{find: Uint8Array, replace: Uint8Array, lineNumber: number}>} An array of objects. Returns an empty array if no valid rules are found or on parsing issues.
 */
const parseXscString = (content, logFn) => {
  const replacements = [];
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const trimmedLine = line.trim();
    const lineNumber = index + 1;

    if (!trimmedLine.startsWith("REPLACEALL ")) {
      continue;
    }

    const instruction = trimmedLine.substring("REPLACEALL ".length);
    const parts = instruction.split(" BY ");

    if (parts.length !== 2) {
      logFn(
        `[Parser - Line ${lineNumber}] Skipping invalid format: Expected 'REPLACEALL ... BY ...'. Found: "${trimmedLine}"`,
        "warn"
      );
      continue;
    }

    const findHex = parts[0].replace(/ /g, "");
    const replaceHex = parts[1].replace(/ /g, "");

    if (!findHex || !replaceHex) {
      logFn(
        `[Parser - Line ${lineNumber}] Skipping invalid format: Empty hex string found in "${trimmedLine}"`,
        "warn"
      );
      continue;
    }

    try {
      const findBytes = hexStringToUint8Array(findHex);
      const replaceBytes = hexStringToUint8Array(replaceHex);

      if (findBytes.length === 0 || replaceBytes.length === 0) {
        logFn(
          `[Parser - Line ${lineNumber}] Skipping rule: find or replace resulted in empty bytes after hex conversion.`,
          "warn"
        );
        continue;
      }

      if (findBytes.length !== replaceBytes.length) {
        logFn(
          `[Parser - Line ${lineNumber}] Skipping rule due to length mismatch: FIND (${findBytes.length} bytes) vs REPLACE (${replaceBytes.length} bytes) in "${trimmedLine}"`,
          "warn"
        );
        continue;
      }

      replacements.push({
        find: findBytes,
        replace: replaceBytes,
        lineNumber: lineNumber,
      });
    } catch (error) {
      logFn(
        `[Parser - Line ${lineNumber}] Skipping invalid hex sequence in "${trimmedLine}". Error: ${error.message}`,
        "warn"
      );
    }
  }

  if (replacements.length === 0) {
    logFn(
      "Warning: No valid 'REPLACEALL' instructions with matching lengths were parsed.",
      "warn"
    );
  } else {
    logFn(
      `Successfully parsed ${replacements.length} valid replacement rule(s).`,
      "info"
    );
  }

  return replacements;
};

/**
 * Applies parsed replacement instructions to a target Uint8Array.
 * Performs find-and-replace on byte sequences.
 * Works on a copy of the input array.
 * Adapted from Patcher for browser environment (uses Uint8Array).
 * @param {Uint8Array} targetUint8Array - The byte array to patch.
 * @param {Array<{find: Uint8Array, replace: Uint8Array, lineNumber: number}>} replacements - Array of replacement rules.
 * @param {function} logFn - Function to use for logging patcher messages (info/error).
 * @returns {Uint8Array|null} The modified array if patching was attempted (even if no matches found), or null on a critical error (like unexpected size change). Returns a *new* Uint8Array.
 */
const applyPatch = (targetUint8Array, replacements, logFn) => {
  if (!replacements || replacements.length === 0) {
    logFn("No valid patch instructions to apply to data.", "info");
    return new Uint8Array(targetUint8Array); // Return a copy even if nothing is done
  }

  // Create a working copy to modify
  const patchedUint8Array = new Uint8Array(targetUint8Array);
  const originalLength = patchedUint8Array.length;

  let totalReplacedCount = 0;
  let modificationMade = false;

  // Apply each replacement rule
  replacements.forEach(({ find, replace, lineNumber }, index) => {
    logFn(
      `\n[Rule ${index + 1}/${
        replacements.length
      } - From XSC Line ${lineNumber}] Processing instruction:`,
      "info"
    );
    // Simple hex representation for logging (can be slow for large buffers)
    // logFn(`  FIND:    ${Array.from(find).map(b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase()}`, 'info');
    // logFn(`  REPLACE: ${Array.from(replace).map(b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase()}`, 'info');

    let currentReplacedInPair = 0;
    let startIndex = 0;
    let foundIndex;

    // Iteratively find and replace all occurrences for the current rule
    // Use the browser-compatible indexOfSequence helper
    while (
      (foundIndex = uint8ArrayIndexOfSequence(
        patchedUint8Array,
        find,
        startIndex
      )) !== -1
    ) {
      // Use Uint8Array.prototype.set() for replacement
      patchedUint8Array.set(replace, foundIndex);
      currentReplacedInPair++;
      startIndex = foundIndex + replace.length; // Continue search after the replaced section
    }

    if (currentReplacedInPair > 0) {
      logFn(
        `  => Replaced ${currentReplacedInPair} occurrence(s) for this rule.`,
        "info"
      );
      totalReplacedCount += currentReplacedInPair;
      modificationMade = true;
    } else {
      logFn(`  => No occurrences found for this rule.`, "info");
    }
  }); // End of replacements.forEach

  // Critical check: Ensure size didn't change (shouldn't happen with equal length find/replace, but good safety)
  if (patchedUint8Array.length !== originalLength) {
    logFn(
      "\nFATAL ERROR: Data length changed unexpectedly during patching! Potential corruption detected.",
      "error"
    );
    return null; // Indicate critical failure
  }

  if (modificationMade) {
    logFn(
      `Successfully applied a total of ${totalReplacedCount} replacement(s) across all rules to the data.`,
      "info"
    );
  } else {
    logFn(
      "No matching byte sequences found for any rule in the data. Data remains unchanged.",
      "info"
    );
  }

  return patchedUint8Array; // Return the new modified array
};

// --- Vue Component Setup (Composition API) ---

const form = ref(null);
const valid = ref(false);
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);
const originalFile = ref(null);
const patchFile = ref(null);
const outputFilename = ref("");
const downloadUrl = ref(null);
const finalOutputFilename = ref("");

// Frontend Console State and Methods
const logMessages = ref([]);
const logConsoleElement = ref(null);

const addLog = (text, type = "info") => {
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  logMessages.value.push({ timestamp, text, type });
  // Auto-scroll to the bottom of the log
  nextTick(() => {
    const consoleElement = logConsoleElement.value;
    if (consoleElement) {
      consoleElement.scrollTop = consoleElement.scrollHeight;
    }
  });
};

const clearLog = () => {
  logMessages.value = [];
};

// Clean up the object URL when the component is unmounted
onUnmounted(() => {
  if (downloadUrl.value) {
    URL.revokeObjectURL(downloadUrl.value); // Revoke previous URL if exists
    downloadUrl.value = null;
    console.log("Revoked download URL on unmount."); // Still log to browser console
  }
});

const calculateOutputFilename = () => {
  if (outputFilename.value) {
    // Ensure extension is kept or added if missing
    if (!outputFilename.value.includes(".") && originalFile.value?.name) {
      const originalExt = originalFile.value.name.split(".").pop();
      return `${outputFilename.value}.${originalExt || "bin"}`; // Use original ext or .bin fallback
    } else if (
      !outputFilename.value.includes(".") &&
      !originalFile.value?.name
    ) {
      return `${outputFilename.value}.bin`; // Fallback if no original file and no extension provided
    }
    return outputFilename.value; // Use the name provided including its extension
  }
  if (originalFile.value) {
    const originalName = originalFile.value.name;
    const parts = originalName.split(".");
    if (parts.length > 1) {
      parts[parts.length - 2] = parts[parts.length - 2] + "_patched";
      return parts.join(".");
    }
    return `${originalName}_patched`;
  }
  return "patched_file.bin"; // Fallback
};

/**
 * Reads a File object into an ArrayBuffer using FileReader.
 * Returns a Promise.
 * @param {File} file - The File object to read.
 * @returns {Promise<ArrayBuffer>} A promise that resolves with the file content as ArrayBuffer.
 */
const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) =>
      reject(new Error(`Failed to read file: ${file.name}. ${err.message}`));
    reader.readAsArrayBuffer(file);
  });
};

const startPatchProcess = async () => {
  // Clear previous states and log
  error.value = null;
  successMessage.value = null;
  if (downloadUrl.value) {
    URL.revokeObjectURL(downloadUrl.value); // Revoke previous URL if exists
    downloadUrl.value = null;
  }
  finalOutputFilename.value = "";
  clearLog(); // Clear the frontend console

  addLog("Starting client-side patch process...");

  // Validate form
  const formIsValid = await form.value.validate();
  if (!formIsValid) {
    const validationError = "Please fill in all required fields.";
    addLog(`Validation failed: ${validationError}`, "error");
    error.value = validationError;
    return;
  }
  // Double check files are selected, although validation should cover this
  if (!originalFile.value || !patchFile.value) {
    const fileSelectionError =
      "Please select both the original and patch files.";
    addLog(fileSelectionError, "error");
    error.value = fileSelectionError;
    return;
  }

  loading.value = true;
  addLog("Validation successful. Proceeding with file processing.");

  try {
    // 1. Read the patch file (.xsc)
    addLog(`Reading patch file: "${patchFile.value.name}"...`);
    const patchArrayBuffer = await readFileAsArrayBuffer(patchFile.value);
    addLog("Patch file read successfully. Decoding as UTF-8...");
    // Use TextDecoder to convert ArrayBuffer to string, assuming UTF-8
    const patchString = new TextDecoder("utf-8").decode(patchArrayBuffer);
    addLog("Patch file decoded.");

    // 2. Parse patch instructions
    addLog("Parsing patch instructions from file content...");
    // Pass the addLog function to the parser for its internal messages
    const replacements = parseXscString(patchString, (msg, type) =>
      addLog(`[Parser] ${msg}`, type)
    );

    if (!replacements || replacements.length === 0) {
      // The parser logs warnings via addLog, but if no valid rules found, we stop
      const noRulesError =
        "No valid 'REPLACEALL' instructions with matching lengths found in the patch file.";
      addLog(noRulesError, "error");
      error.value = noRulesError;
      loading.value = false;
      return;
    }
    addLog(
      `Parsing complete. Found ${replacements.length} valid replacement rule(s).`
    );

    // 3. Read the original file
    addLog(`Reading original file: "${originalFile.value.name}"...`);
    const originalArrayBuffer = await readFileAsArrayBuffer(originalFile.value);
    const originalUint8Array = new Uint8Array(originalArrayBuffer);
    addLog("Original file read successfully.");

    // 4. Apply the patch to the original file's data
    addLog("Applying patch to original file data...");
    // Pass the addLog function to the patcher for its internal messages
    const patchedUint8Array = applyPatch(
      originalUint8Array,
      replacements,
      (msg, type) => addLog(`[Patcher] ${msg}`, type)
    ); // Use the adapted patcher

    if (patchedUint8Array === null) {
      // applyPatch returns null on critical error (like size mismatch, though parser should prevent)
      const patchError =
        "Error applying patch: Critical error during byte replacement (data length changed unexpectedly).";
      addLog(patchError, "error");
      error.value = patchError;
      loading.value = false;
      return;
    }
    addLog("Patch applied successfully (or no changes were needed).");

    // 5. Prepare for download
    addLog("Preparing patched file for download...");
    const patchedBlob = new Blob([patchedUint8Array], {
      type: "application/octet-stream",
    }); // Use generic binary type
    downloadUrl.value = URL.createObjectURL(patchedBlob);
    finalOutputFilename.value = calculateOutputFilename();

    addLog(
      `Patched file ready for download: "${finalOutputFilename.value}"`,
      "success"
    );
    successMessage.value =
      "File successfully patched! You can download it now.";
  } catch (err) {
    console.error("Error during client-side patch process:", err); // Still log to browser console for debugging
    const errorMessage = `An error occurred: ${err.message || err}`;
    addLog(errorMessage, "error"); // Log to frontend console
    error.value = errorMessage; // Display in alert
  } finally {
    loading.value = false;
    addLog("Patch process finished.");
  }
};

// No explicit return needed for exposed variables/functions when using <script setup>
</script>

<script>
export default {
  name: "PatcherView",
  // Any other standard options (props, emits, etc.) would go here if not using defineProps/defineEmits in script setup
};
</script>

<style scoped>
/* Add specific styles if needed */
.v-card-actions .v-btn {
  margin-left: 8px;
}

.log-console {
  max-height: 250px; /* Limit height */
  overflow-y: auto; /* Add scrollbar if needed */
  background-color: #1e1e1e; /* Dark background like a console */
  color: #cccccc; /* Light text color */
  padding: 10px;
  border-radius: 4px;
  font-family: Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace;
  font-size: 0.85em;
  white-space: pre-wrap; /* Preserve whitespace and wrap lines */
  word-break: break-all; /* Break long words */
}

.log-message {
  margin: 0;
  padding: 2px 0;
  border-bottom: 1px solid #333; /* Separator */
  line-height: 1.4;
}

.log-message:last-child {
  border-bottom: none; /* No separator for the last message */
}

.log-timestamp {
  color: #888; /* Grey timestamp */
  margin-right: 8px;
}

.log-message.warn .log-text {
  color: #ffcc00; /* Yellowish for warnings */
}

.log-message.error .log-text {
  color: #ff6666; /* Reddish for errors */
  font-weight: bold;
}

.log-message.success .log-text {
  color: #66ff66; /* Greenish for success */
}

.log-text {
  /* Inherits color from parent .log-message by default (light grey) */
}
</style>
