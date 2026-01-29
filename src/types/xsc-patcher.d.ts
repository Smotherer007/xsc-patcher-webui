declare module "@patimweb/xsc-patcher" {
  const api: {
    parseXscString?: (...args: unknown[]) => unknown;
    parseXsc?: (...args: unknown[]) => unknown;
    parse?: (...args: unknown[]) => unknown;
    applyPatch?: (...args: unknown[]) => unknown;
    patchBytes?: (...args: unknown[]) => unknown;
    patch?: (...args: unknown[]) => unknown;
  };

  export default api;
}
