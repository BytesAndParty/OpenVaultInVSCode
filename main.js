"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => OpenVaultInVSCodePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");
var import_node_child_process = require("node:child_process");
var import_node_url = require("node:url");

// src/types.ts
var DEFAULT_SETTINGS = {
  preferredLauncher: "auto",
  codeExecutable: "code"
};

// src/data.ts
async function loadSettings(plugin) {
  const raw = await plugin.loadData();
  return Object.assign({}, DEFAULT_SETTINGS, raw);
}
async function saveSettings(plugin, settings) {
  await plugin.saveData(settings);
}

// src/SettingsTab.ts
var import_obsidian = require("obsidian");
var OpenVaultInVSCodeSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Preferred launcher").setDesc("Choose whether to prefer the code CLI only or use automatic fallback on macOS and Windows.").addDropdown(
      (dropdown) => dropdown.addOption("auto", "Auto (recommended)").addOption("code-cli", "code CLI only").setValue(this.plugin.settings.preferredLauncher).onChange(async (value) => {
        this.plugin.settings.preferredLauncher = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Code executable").setDesc("Executable used to launch VS Code. Default: code").addText(
      (text) => text.setPlaceholder("code").setValue(this.plugin.settings.codeExecutable).onChange(async (value) => {
        this.plugin.settings.codeExecutable = value.trim() || "code";
        await this.plugin.saveSettings();
      })
    );
    containerEl.createDiv({
      cls: "open-vault-in-vscode-settings-note",
      text: "Command ID: open-vault-root-in-vscode"
    });
  }
};

// src/main.ts
var OPEN_COMMAND_ID = "open-vault-root-in-vscode";
var OpenVaultInVSCodePlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    this.settings = await loadSettings(this);
    this.addCommand({
      id: OPEN_COMMAND_ID,
      name: "Open vault root in VS Code",
      callback: () => this.openVaultRootInVSCode()
    });
    this.addSettingTab(new OpenVaultInVSCodeSettingsTab(this.app, this));
  }
  async saveSettings() {
    await saveSettings(this, this.settings);
  }
  getVaultBasePath() {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof import_obsidian2.FileSystemAdapter) {
      return adapter.getBasePath();
    }
    return null;
  }
  getLaunchers(vaultPath) {
    const codeExecutable = this.settings.codeExecutable?.trim() || DEFAULT_SETTINGS.codeExecutable;
    if (this.settings.preferredLauncher === "code-cli") {
      return [{ command: codeExecutable, args: [vaultPath] }];
    }
    if (process.platform === "darwin") {
      return [
        { command: codeExecutable, args: [vaultPath] },
        { command: "open", args: ["-a", "Visual Studio Code", vaultPath] }
      ];
    }
    if (process.platform === "win32") {
      const vscodeUri = this.toVSCodeUri(vaultPath);
      return [
        { command: codeExecutable, args: [vaultPath] },
        { command: "explorer.exe", args: [vscodeUri] },
        { command: "cmd.exe", args: ["/d", "/s", "/c", `start "" "${vscodeUri}"`] }
      ];
    }
    return [{ command: codeExecutable, args: [vaultPath] }];
  }
  toVSCodeUri(vaultPath) {
    const fileUrl = (0, import_node_url.pathToFileURL)(vaultPath);
    const hostPrefix = fileUrl.host ? `//${fileUrl.host}` : "";
    return `vscode://file${hostPrefix}${fileUrl.pathname}`;
  }
  runLauncher(launcher) {
    return new Promise((resolve) => {
      try {
        const child = (0, import_node_child_process.spawn)(launcher.command, launcher.args, {
          detached: true,
          stdio: "ignore",
          windowsHide: true
        });
        let settled = false;
        const settle = (success) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(success);
        };
        child.once("error", () => settle(false));
        child.once("spawn", () => {
          const settleTimer = setTimeout(() => {
            child.unref();
            settle(true);
          }, 250);
          child.once("exit", (code) => {
            clearTimeout(settleTimer);
            if (typeof code === "number" && code !== 0) {
              settle(false);
              return;
            }
            child.unref();
            settle(true);
          });
        });
      } catch {
        resolve(false);
      }
    });
  }
  async openVaultRootInVSCode() {
    const vaultPath = this.getVaultBasePath();
    if (!vaultPath) {
      new import_obsidian2.Notice("Vault path is not available on this platform.");
      return;
    }
    for (const launcher of this.getLaunchers(vaultPath)) {
      const success = await this.runLauncher(launcher);
      if (success) {
        return;
      }
    }
    new import_obsidian2.Notice("Failed to launch VS Code. Check plugin settings and CLI installation.");
  }
};
