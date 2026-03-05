import { App, PluginSettingTab, Setting } from 'obsidian';
import type OpenVaultInVSCodePlugin from './main';

export class OpenVaultInVSCodeSettingsTab extends PluginSettingTab {
  plugin: OpenVaultInVSCodePlugin;

  constructor(app: App, plugin: OpenVaultInVSCodePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
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
            this.plugin.settings.preferredLauncher = value as 'auto' | 'code-cli';
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
            this.plugin.settings.codeExecutable = value.trim() || 'code';
            await this.plugin.saveSettings();
          })
      );

    containerEl.createDiv({
      cls: 'open-vault-in-vscode-settings-note',
      text: 'Command ID: open-vault-root-in-vscode'
    });
  }
}
