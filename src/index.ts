import * as vscode from 'vscode';
import { flowTsDeploy } from './commands/flowTsDeploy';
import { flowTsRetrieve } from './commands/flowTsRetrieve';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  vscode.commands.registerCommand('sfdx.flow.ts.deploy', flowTsDeploy);
  vscode.commands.registerCommand('sfdx.flow.ts.retrieve', flowTsRetrieve);
}

export function deactivate(): Thenable<void> | undefined {
  return;
}