# Open Vault in VS Code

An Obsidian plugin that adds a command to open the current vault root folder in Visual Studio Code.

## Features

- **One command**: Open the vault root folder in VS Code from the command palette or with your own hotkey
- **Automatic fallbacks** (`Auto` mode):
  - macOS: the `code` CLI, then `open -a "Visual Studio Code"`
  - Windows: the configured executable, then a `vscode://file/...` link
  - Linux: the `code` CLI
- **Special characters in paths**: Spaces, quotes, `$`, backticks, `&` or commas in the vault path are safe. The path is passed as a single argument (fully percent-encoded in `vscode://` links) and never pasted unescaped into a shell command
- **Custom executable**: Use a full path or another build such as VS Code Insiders or VSCodium
- **Clear feedback**: A notice tells you when VS Code could not be started, and the developer console lists the reason for each failed attempt

## Requirements

- Obsidian **1.4.0** or later, desktop only (macOS, Windows, Linux)
- Visual Studio Code installed. For the `code` CLI on macOS, run **Shell Command: Install 'code' command in PATH** from the VS Code command palette

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/BytesAndParty/OpenVaultInVSCode/releases)
2. Create a folder `your-vault/.obsidian/plugins/open-vault-in-vscode/`
3. Copy `main.js`, `manifest.json` and `styles.css` into this folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins

### From Source

```bash
# Clone the repository
git clone https://github.com/BytesAndParty/OpenVaultInVSCode.git
cd OpenVaultInVSCode

# Install dependencies
bun install

# Build
bun run build
```

Then copy `main.js`, `manifest.json` and `styles.css` into the plugin folder as described above.

## Usage

1. Open the command palette (`Cmd/Ctrl + P`) and run **Open vault root in VS Code**
2. Optional: assign a hotkey in Settings → Hotkeys

### Command

| Command | ID | Description |
|---------|----|-------------|
| **Open vault root in VS Code** | `open-vault-root-in-vscode` | Opens the vault root folder in VS Code |

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Preferred launcher | `Auto` tries the code executable first and then the fallbacks of your platform (macOS and Windows). `code CLI only` uses only the code executable | `Auto` |
| Code executable | Command name or full path used to start VS Code | `code` |

### Platform Notes

- **macOS**: When Obsidian is started from the Dock or Finder, it usually does not see `/usr/local/bin` or `/opt/homebrew/bin`. `Auto` mode then falls back to `open -a "Visual Studio Code"`. For `code CLI only`, enter the full path, e.g. `/usr/local/bin/code` (run `which code` in Terminal).
- **Windows**: The `code` command is a batch file (`code.cmd`). Batch files are not started, because `cmd.exe` would parse the vault path as a command line. `Auto` mode opens a `vscode://file/...` link instead. For `code CLI only`, enter the full path to `Code.exe`, e.g. `C:\Users\<you>\AppData\Local\Programs\Microsoft VS Code\Code.exe` or `C:\Program Files\Microsoft VS Code\Code.exe`. VS Code may ask you to confirm before it opens a folder from a `vscode://file` link. If VS Code is not installed, Windows shows its own dialog for the link.
- **Linux**: Only the `code` CLI is used, there is no fallback. If it is not found, enter the full path, e.g. `/usr/bin/code` or `/snap/bin/code`. Sandboxed installs of Obsidian (e.g. Flatpak) may not be able to start programs outside the sandbox.
- **VS Code Insiders or VSCodium**: Set **Code executable** to `code-insiders` or `codium` (or their full path). The `Auto` fallbacks on macOS and Windows still open the stable VS Code, so choose `code CLI only` if you never want that.

### Troubleshooting

**"Failed to launch VS Code"?**
- Open the developer console (`Cmd+Opt+I` on macOS, `Ctrl+Shift+I` on Windows and Linux). It lists why each attempt failed
- Check **Code executable** (see Platform Notes)

## Development

```bash
# Install dependencies
bun install

# Development mode (watch)
bun run dev

# Production build
bun run build

# Type checking
bun run check
```

## Works Well with Other BytesAndParty Plugins

- [Command Overview](https://github.com/BytesAndParty/CommandOverview) - Add **Open vault root in VS Code** to your command overlay for a quick jump from your notes to the editor.
- [Copy File Path](https://github.com/BytesAndParty/CopyFilePath) - Copy the absolute path of the active note, open the vault in VS Code and paste the path into Quick Open (`Cmd/Ctrl + P`) to land on the same note.
- [Auto Categories](https://github.com/BytesAndParty/Obsidian_AutoCategories) - Review the generated category pages and `.base` files in VS Code and change them in bulk with search and replace across the vault.
- [Obsidian Recall](https://github.com/BytesAndParty/ObsidianRecall) - Bulk-edit `Q:`/`A:` flashcards with multi-cursor and regex replace in VS Code, then review them in Obsidian.

## License

MIT License - see [LICENSE](LICENSE) for details.
