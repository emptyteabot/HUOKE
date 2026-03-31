import { readFile } from 'fs/promises';
import path from 'path';

import { readNamespace } from './storage';

export type AgentRuntimeStatus = 'ready' | 'watch' | 'blocked';

export type AgentRuntimeCapability = {
  name: string;
  label: string;
  required: boolean;
  provider: string;
  status: AgentRuntimeStatus;
  detail: string;
};

export type AgentRuntimeLayer = {
  id: string;
  label: string;
  status: AgentRuntimeStatus;
  detail: string;
  source: string;
};

export type AgentRuntimeAgent = {
  id: string;
  label: string;
  status: AgentRuntimeStatus;
  openclawAgentId: string;
  model: string;
  browserProfile?: string;
  knowledgeFiles: number;
  sessions: number;
  heartbeatEnabled: boolean;
  blockers: string[];
  capabilities: AgentRuntimeCapability[];
};

export type AgentRuntimeSnapshot = {
  generatedAt: string;
  summary: {
    readyLayers: number;
    blockedLayers: number;
    totalLayers: number;
    readySkills: number;
    totalSkills: number;
    agentsWithMemory: number;
    knowledgeFiles: number;
    browserReady: boolean;
    mcpReady: boolean;
    loopReady: boolean;
    cronJobs: number;
  };
  openclaw: {
    installed: boolean;
    path?: string | null;
    version?: string | null;
    errors?: Record<string, string | null>;
  };
  layers: AgentRuntimeLayer[];
  agents: AgentRuntimeAgent[];
};

const runtimeSnapshotPath = path.join(process.cwd(), '..', 'data', 'ops', 'agent_runtime.json');

export async function readAgentRuntimeSnapshot(): Promise<AgentRuntimeSnapshot | null> {
  try {
    const records = await readNamespace<AgentRuntimeSnapshot & { id?: string }>('ops:agent_runtime_snapshot', {
      legacyFilePath: runtimeSnapshotPath,
      syncLegacyOnChange: true,
      legacyIdResolver: () => 'agent-runtime',
    });
    return records[0] || null;
  } catch {
    return null;
  }
}
