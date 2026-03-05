import { FileSystemAdapter, Notice, Plugin } from 'obsidian';
import { spawn } from 'node:child_process';
import { loadSettings, saveSettings } from './data';
import { OpenVaultInVSCodeSettingsTab } from './SettingsTab';
import { DEFAULT_SETTINGS, type OpenVaultInVSCodeSettings } from './types';

const OPEN_COMMAND_ID = 'open-vault-root-in-vscode';

type Launcher = {
  command: string;
  args: string[];
};

export default class OpenVaultInVSCodePlugin extends Plugin {
  settings: OpenVaultInVSCodeSettings = DEFAULT_SETTINGS;

  async onload() {
    this.settings = await loadSettings(this);

    this.addCommand({
      id: OPEN_COMMAND_ID,
      name: 'Open vault root in VS Code',
      callback: () => this.openVaultRootInVSCode()
    });

    this.addSettingTab(new OpenVaultInVSCodeSettingsTab(this.app, this));
  }

  async saveSettings() {
    await saveSettings(this, this.settings);
  }

  private getVaultBasePath(): string | null {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    return null;
  }

  private getLaunchers(vaultPath: string): Launcher[] {
    const codeExecutable = this.settings.codeExecutable?.trim() || DEFAULT_SETTINGS.codeExecutable;

    if (this.settings.preferredLauncher === 'code-cli') {
      return [{ command: codeExecutable, args: [vaultPath] }];
    }

    if (process.platform === 'darwin') {
      return [
        { command: codeExecutable, args: [vaultPath] },
        { command: 'open', args: ['-a', 'Visual Studio Code', vaultPath] }
      ];
    }

    return [{ command: codeExecutable, args: [vaultPath] }];
  }

  private runLauncher(launcher: Launcher): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const child = spawn(launcher.command, launcher.args, {
          detached: true,
          stdio: 'ignore'
        });

        child.once('error', () => resolve(false));
        child.once('spawn', () => {
          child.unref();
          resolve(true);
        });
      } catch {
        resolve(false);
      }
    });
  }

  private async openVaultRootInVSCode(): Promise<void> {
    const vaultPath = this.getVaultBasePath();

    if (!vaultPath) {
      new Notice('Vault path is not available on this platform.');
      return;
    }

    for (const launcher of this.getLaunchers(vaultPath)) {
      const success = await this.runLauncher(launcher);
      if (success) {
        return;
      }
    }

    new Notice('Failed to launch VS Code. Check plugin settings and CLI installation.');
  }
}
