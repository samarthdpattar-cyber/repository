import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AccessInquiry, LeaseAnalysisReport, RulebookPack } from '../src/types/lease';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', '.data');
const STORE_FILE = path.join(DATA_DIR, 'leaseguard-store.json');

interface StoreData {
  reports: LeaseAnalysisReport[];
  customRulebooks: RulebookPack[];
  inquiries: AccessInquiry[];
}

const DEFAULT_STORE: StoreData = {
  reports: [],
  customRulebooks: [],
  inquiries: [],
};

function ensureStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
      return { ...DEFAULT_STORE, reports: [], customRulebooks: [], inquiries: [] };
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      customRulebooks: Array.isArray(parsed.customRulebooks) ? parsed.customRulebooks : [],
      inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
    };
  } catch (err) {
    console.error('Failed to read backend store, using empty store:', err);
    return { reports: [], customRulebooks: [], inquiries: [] };
  }
}

function writeStore(data: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, STORE_FILE);
  } catch (err) {
    console.error('Failed to persist backend store:', err);
  }
}

export function getStoreStats() {
  const store = ensureStore();
  return {
    reportsCount: store.reports.length,
    customRulebooksCount: store.customRulebooks.length,
    inquiriesCount: store.inquiries.length,
  };
}

export function listReports(): LeaseAnalysisReport[] {
  return ensureStore().reports;
}

export function saveReport(report: LeaseAnalysisReport): LeaseAnalysisReport {
  const store = ensureStore();
  const filtered = store.reports.filter((r) => r.id !== report.id);
  store.reports = [report, ...filtered].slice(0, 25);
  writeStore(store);
  return report;
}

export function deleteReport(reportId: string): boolean {
  const store = ensureStore();
  const next = store.reports.filter((r) => r.id !== reportId);
  if (next.length === store.reports.length) {
    return false;
  }
  store.reports = next;
  writeStore(store);
  return true;
}

export function listCustomRulebooks(): RulebookPack[] {
  return ensureStore().customRulebooks;
}

export function saveCustomRulebook(pack: RulebookPack): RulebookPack {
  const store = ensureStore();
  const filtered = store.customRulebooks.filter((p) => p.id !== pack.id);
  store.customRulebooks = [...filtered, pack];
  writeStore(store);
  return pack;
}

export function deleteCustomRulebook(packId: string): boolean {
  const store = ensureStore();
  const next = store.customRulebooks.filter((p) => p.id !== packId);
  if (next.length === store.customRulebooks.length) {
    return false;
  }
  store.customRulebooks = next;
  writeStore(store);
  return true;
}

export function listInquiries(): AccessInquiry[] {
  return ensureStore().inquiries;
}

export function saveInquiry(inquiry: AccessInquiry): AccessInquiry {
  const store = ensureStore();
  store.inquiries = [inquiry, ...store.inquiries].slice(0, 100);
  writeStore(store);
  return inquiry;
}
