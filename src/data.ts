import type { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type OpenVaultInVSCodeSettings } from './types';

export async function loadSettings(plugin: Plugin): Promise<OpenVaultInVSCodeSettings> {
  const raw = await plugin.loadData();
  return Object.assign({}, DEFAULT_SETTINGS, raw);
}

export async function saveSettings(plugin: Plugin, settings: OpenVaultInVSCodeSettings): Promise<void> {
  await plugin.saveData(settings);
}
