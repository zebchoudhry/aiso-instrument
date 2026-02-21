
import { BaselineRecord } from "../types";

const STORAGE_KEY = 'ai_discovery_baselines';

interface StoreSchema {
  [domain: string]: {
    active: BaselineRecord;
    history: BaselineRecord[];
  };
}

export const BaselineStore = {
  getDomainData(domain: string) {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: StoreSchema = raw ? JSON.parse(raw) : {};
    return data[domain] || null;
  },

  saveBaseline(record: BaselineRecord) {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: StoreSchema = raw ? JSON.parse(raw) : {};
    
    if (!data[record.domain]) {
      data[record.domain] = { active: record, history: [] };
    } else {
      // Move old active to history
      data[record.domain].history.unshift(data[record.domain].active);
      data[record.domain].active = record;
      // Limit history to 10 records
      data[record.domain].history = data[record.domain].history.slice(0, 10);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  getActiveBaseline(domain: string): BaselineRecord | null {
    return this.getDomainData(domain)?.active || null;
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
