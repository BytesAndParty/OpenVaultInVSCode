import { FileSystemAdapter, Notice, Plugin } from 'obsidian';
import { spawn } from 'node:child_process';
import { loadSettings, saveSettings } from './data';
import { OpenVaultInVSCodeSettingsTab } from './SettingsTab';
import { DEFAULT_SETTINGS, type OpenVaultInVSCodeSettings } from './types';

const OPEN_COMMAND_ID = 'open-vault-root-in-vscode';
const LOG_PREFIX = '[Open Vault in VS Code]';

type Launcher = {
  command: string;
  /** Built only when the launcher runs, so the vscode:// URI is not computed before a successful code start. */
  args: () => string[];
  /** Windows only: pass args without Node's quoting. cmd.exe does not understand the \" escapes Node adds. */
  verbatimArgs?: boolean;
  /** The exit code is meaningless: explorer.exe exits with 1 even after it opened the URI. */
  ignoreExitCode?: boolean;
};

type LaunchResult = { ok: true } | { ok: false; reason: string };

/**
 * Builds a vscode://file link for a Windows path (drive or UNC). Not pathToFileURL: it leaves `,` `=` `;`
 * unencoded, which explorer.exe treats as separators, and aborts the process on WebDAV UNC paths
 * (\\host@SSL\...). Each segment is fully percent-encoded, including `!'()*`, so the link contains only
 * [A-Za-z0-9-._~%/] plus the drive colon. Throws URIError for unpaired surrogates.
 */
function toVSCodeUri(windowsPath: string): string {
  const isUnc = /^[\\/]{2}[^\\/]/.test(windowsPath);
  const segments = windowsPath.replace(/^[\\/]+/, '').split(/[\\/]/);
  const encoded = segments.map((segment, index) =>
    index === 0 && !isUnc && /^[A-Za-z]:$/.test(segment)
      ? segment
      : encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  );
  return `vscode://file${isUnc ? '//' : '/'}${encoded.join('/')}`;
}

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
    const configured: unknown = this.settings.codeExecutable;
    const codeExecutable = (typeof configured === 'string' && configured.trim()) || DEFAULT_SETTINGS.codeExecutable;

    const codeLauncher: Launcher = { command: codeExecutable, args: () => [vaultPath] };

    if (this.settings.preferredLauncher === 'code-cli') {
      return [codeLauncher];
    }

    if (process.platform === 'darwin') {
      return [
        codeLauncher,
        { command: 'open', args: () => ['-a', 'Visual Studio Code', vaultPath] }
      ];
    }

    if (process.platform === 'win32') {
      return [
        codeLauncher,
        { command: 'explorer.exe', args: () => [toVSCodeUri(vaultPath)], ignoreExitCode: true },
        // Same quoting as Node's shell mode: /s strips the outer quotes. The URI has no raw `"`, so it
        // cannot leave its quotes; /v:off keeps `!` from being expanded. Known limit: cmd still expands
        // `%name%`, e.g. `%CD%` from U+0340-U+037F (UTF-8 0xCD), which garbles the link (no injection).
        {
          command: 'cmd.exe',
          args: () => ['/d', '/v:off', '/s', '/c', `"start "" "${toVSCodeUri(vaultPath)}""`],
          verbatimArgs: true
        }
      ];
    }

    return [codeLauncher];
  }

  private runLauncher(launcher: Launcher): Promise<LaunchResult> {
    // Batch files (code.cmd) only run through cmd.exe, which would re-parse the vault path
    // (CVE-2024-27980). Current Node versions refuse them, older Electron builds do not.
    if (process.platform === 'win32' && /\.(bat|cmd)[\s.]*$/i.test(launcher.command)) {
      return Promise.resolve({ ok: false, reason: `${launcher.command}: batch files are not supported, use the path to Code.exe` });
    }

    return new Promise((resolve) => {
      let settled = false;
      const settle = (result: LaunchResult) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(result);
      };

      try {
        const child = spawn(launcher.command, launcher.args(), {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          windowsVerbatimArguments: launcher.verbatimArgs === true
        });

        child.once('error', (error) => settle({ ok: false, reason: `${launcher.command}: ${error.message}` }));
        child.once('spawn', () => {
          if (launcher.ignoreExitCode) {
            child.unref();
            settle({ ok: true });
            return;
          }

          const settleTimer = setTimeout(() => {
            child.unref();
            settle({ ok: true });
          }, 250);

          child.once('exit', (code) => {
            clearTimeout(settleTimer);
            if (typeof code === 'number' && code !== 0) {
              settle({ ok: false, reason: `${launcher.command} exited with code ${code}` });
              return;
            }

            child.unref();
            settle({ ok: true });
          });
        });
      } catch (error) {
        settle({ ok: false, reason: `${launcher.command}: ${error instanceof Error ? error.message : String(error)}` });
      }
    });
  }

  private async openVaultRootInVSCode(): Promise<void> {
    const vaultPath = this.getVaultBasePath();

    if (!vaultPath) {
      new Notice('Vault path is not available on this platform.');
      return;
    }

    const failures: string[] = [];
    for (const launcher of this.getLaunchers(vaultPath)) {
      const result = await this.runLauncher(launcher);
      if (result.ok) {
        return;
      }
      failures.push(result.reason);
    }

    console.error(`${LOG_PREFIX} Failed to launch VS Code:`, failures);
    new Notice('Failed to launch VS Code. Check plugin settings and CLI installation.');
  }
}
