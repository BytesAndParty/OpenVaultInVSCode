export interface OpenVaultInVSCodeSettings {
  preferredLauncher: 'auto' | 'code-cli';
  codeExecutable: string;
}

export const DEFAULT_SETTINGS: OpenVaultInVSCodeSettings = {
  preferredLauncher: 'auto',
  codeExecutable: 'code'
};
