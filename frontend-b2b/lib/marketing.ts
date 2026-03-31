import { readFile, readdir } from 'fs/promises';
import path from 'path';

export type ExperimentPage = {
  slug: string;
  title: string;
  summary: string;
  persona: string;
  keywords: string[];
  pain_points: string[];
  deliverables: string[];
};

export type CreativeItem = {
  id: string;
  channel: string;
  angle: string;
  hook: string;
  body: string;
  cta: string;
  status: string;
};

export type ComplianceReplacement = {
  risky: string;
  safe: string;
  reason: string;
};

export type KeywordUniverse = {
  generated_at: string;
  source: string;
  note: string;
  total_requests: number;
  total_keywords: number;
  directions: Record<
    string,
    {
      name: string;
      top_keyword_count: number;
      seed_count: number;
    }
  >;
  keywords: Array<{
    rank: number;
    keyword: string;
    score: number;
    directions: string[];
    source_queries: string[];
  }>;
};

type CreativeLibrary = {
  updated_at: string;
  creatives: CreativeItem[];
};

type ComplianceLibrary = {
  updated_at: string;
  replacements: ComplianceReplacement[];
};

const dataRoot = path.join(process.cwd(), '..', 'data');

async function readJsonFile<T>(relativeSegments: string[], fallback: T): Promise<T> {
  try {
    const filePath = path.join(dataRoot, ...relativeSegments);
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function readExperimentPages() {
  return readJsonFile<ExperimentPage[]>(['marketing', 'experiment_pages.json'], []);
}

export async function readCreativeLibrary() {
  return readJsonFile<CreativeLibrary>(
    ['marketing', 'creative_library.json'],
    { updated_at: '', creatives: [] },
  );
}

export async function readComplianceLibrary() {
  return readJsonFile<ComplianceLibrary>(
    ['marketing', 'compliance_replacements.json'],
    { updated_at: '', replacements: [] },
  );
}

export async function readLatestKeywordUniverse(): Promise<KeywordUniverse> {
  try {
    const marketingDir = path.join(dataRoot, 'marketing');
    const files = await readdir(marketingDir);
    const latestFile = files
      .filter((file) => /^keyword_universe_.*\.json$/.test(file))
      .sort()
      .at(-1);

    if (!latestFile) {
      throw new Error('No keyword universe file found');
    }

    const raw = await readFile(path.join(marketingDir, latestFile), 'utf-8');
    return JSON.parse(raw) as KeywordUniverse;
  } catch {
    return {
      generated_at: '',
      source: '',
      note: '',
      total_requests: 0,
      total_keywords: 0,
      directions: {},
      keywords: [],
    };
  }
}
