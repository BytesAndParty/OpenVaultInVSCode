'use strict';

const { Plugin, FileSystemAdapter, Notice, PluginSettingTab, Setting } = require('obsidian');
const { spawn } = require('node:child_process');

const DEFAULT_SETTINGS = {
  preferredLauncher: 'auto',
  codeExecutable: 'code'
};

const OPEN_COMMAND_ID = 'open-vault-root-in-vscode';

class OpenVaultInVSCodeSettingsTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Preferred launcher')
      .setDesc('Choose whether to prefer the code CLI only or use automatic fallback on macOS.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('auto', 'Auto (recommended)')
          .addOption('code-cli', 'code CLI only')
          .setValue(this.plugin.settings.preferredLauncher)
          .onChange(async (value) => {
            this.plugin.settings.preferredLauncher = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Code executable')
      .setDesc('Executable used to launch VS Code. Default: code')
      .addText((text) =>
        text
          .setPlaceholder('code')
          .setValue(this.plugin.settings.codeExecutable)
          .onChange(async (value) => {
            this.plugin.settings.codeExecutable = (value || '').trim() || 'code';
            await this.plugin.saveSettings();
          })
      );

    containerEl.createDiv({
      cls: 'open-vault-in-vscode-settings-note',
      text: 'Command ID: open-vault-root-in-vscode'
    });
  }
}

module.exports = class OpenVaultInVSCodePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    this.addCommand({
      id: OPEN_COMMAND_ID,
      name: 'Open vault root in VS Code',
      callback: () => this.openVaultRootInVSCode()
    });

    this.addSettingTab(new OpenVaultInVSCodeSettingsTab(this.app, this));
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getVaultBasePath() {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    return null;
  }

  getLaunchers(vaultPath) {
    const codeExecutable = (this.settings.codeExecutable || '').trim() || 'code';

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

  runLauncher(launcher) {
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

  async openVaultRootInVSCode() {
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
};
