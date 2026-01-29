import {
  Patcher,
  XscParser,
  type ReplacementRule,
} from "@patimweb/xsc-patcher/browser";

export type LogType = "info" | "warn" | "error" | "success";

export const parseXscString = (content: string): ReplacementRule[] => {
  const parser = new XscParser();
  return parser.parseString(content);
};

export const applyPatch = (
  targetUint8Array: Uint8Array,
  replacements: ReplacementRule[]
): Uint8Array | null => {
  const patcher = new Patcher();
  return patcher.applyToBuffer(targetUint8Array, replacements);
};

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}.`));
    reader.readAsArrayBuffer(file);
  });
