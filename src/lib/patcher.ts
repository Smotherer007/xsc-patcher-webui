export type LogType = "info" | "warn" | "error" | "success";
export type LogFn = (message: string, type?: LogType) => void;
export type ReplacementRule = unknown;

type PatcherApi = {
  parseXscString?: (content: string, logFn: LogFn) => ReplacementRule[];
  parseXsc?: (content: string, logFn: LogFn) => ReplacementRule[];
  parse?: (content: string, logFn: LogFn) => ReplacementRule[];
  applyPatch?: (
    target: Uint8Array,
    replacements: ReplacementRule[],
    logFn: LogFn
  ) => Uint8Array | null;
  patchBytes?: (
    target: Uint8Array,
    replacements: ReplacementRule[],
    logFn: LogFn
  ) => Uint8Array | null;
  patch?: (
    target: Uint8Array,
    replacements: ReplacementRule[],
    logFn: LogFn
  ) => Uint8Array | null;
};

let cachedApi: PatcherApi | null = null;

const loadApi = async (): Promise<PatcherApi> => {
  if (cachedApi) return cachedApi;
  const module = (await import("@patimweb/xsc-patcher")) as unknown as {
    default?: PatcherApi;
  };
  cachedApi = module.default ?? (module as PatcherApi);
  return cachedApi;
};

const resolveParseFn = (api: PatcherApi) =>
  api.parseXscString ?? api.parseXsc ?? api.parse;

const resolveApplyFn = (api: PatcherApi) =>
  api.applyPatch ?? api.patchBytes ?? api.patch;

export const parseXscString = async (
  content: string,
  logFn: LogFn
): Promise<ReplacementRule[]> => {
  const api = await loadApi();
  const parseFn = resolveParseFn(api);
  if (!parseFn) {
    throw new Error("Unsupported @patimweb/xsc-patcher API: parse function.");
  }
  return await Promise.resolve(parseFn(content, logFn));
};

export const applyPatch = async (
  targetUint8Array: Uint8Array,
  replacements: ReplacementRule[],
  logFn: LogFn
): Promise<Uint8Array | null> => {
  const api = await loadApi();
  const applyFn = resolveApplyFn(api);
  if (!applyFn) {
    throw new Error("Unsupported @patimweb/xsc-patcher API: patch function.");
  }
  return await Promise.resolve(applyFn(targetUint8Array, replacements, logFn));
};

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}.`));
    reader.readAsArrayBuffer(file);
  });
