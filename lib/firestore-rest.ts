import { Platform } from "react-native";

const RAW_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "digiindia-7a462";
const AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "digiindia-7a462.firebaseapp.com";
function resolveProjectId(): string {
  if (RAW_PROJECT_ID && !/^\d+$/.test(RAW_PROJECT_ID)) return RAW_PROJECT_ID;
  const cleaned = AUTH_DOMAIN.replace(".firebaseapp.com", "").replace(".web.app", "");
  if (cleaned) return cleaned;
  return RAW_PROJECT_ID;
}
const PROJECT_ID = resolveProjectId();
const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA3UAPUckG8490GTR8JOxsqvZwI8oS1L7Q";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields: any = {};
    for (const k of Object.keys(val)) {
      fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in val) return fromFirestoreFields(val.mapValue.fields || {});
  if ("timestampValue" in val) return val.timestampValue;
  return null;
}

function fromFirestoreFields(fields: any): any {
  const obj: any = {};
  for (const k of Object.keys(fields)) {
    obj[k] = fromFirestoreValue(fields[k]);
  }
  return obj;
}

function toFirestoreFields(data: any): any {
  const fields: any = {};
  for (const k of Object.keys(data)) {
    if (data[k] !== undefined) {
      fields[k] = toFirestoreValue(data[k]);
    }
  }
  return fields;
}

function extractId(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1];
}

async function request(url: string, options: RequestInit = {}): Promise<any> {
  const sep = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${sep}key=${API_KEY}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore REST error ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function restSetDoc(collectionPath: string, docId: string, data: any): Promise<void> {
  const path = collectionPath.replace(/\//g, "/");
  await request(`${BASE}/${path}/${docId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
}

export async function restGetDoc(collectionPath: string, docId: string): Promise<any | null> {
  try {
    const result = await request(`${BASE}/${collectionPath}/${docId}`, { method: "GET" });
    if (result && result.fields) {
      return fromFirestoreFields(result.fields);
    }
    return null;
  } catch (e: any) {
    if (e.message && e.message.includes("404")) return null;
    throw e;
  }
}

export async function restUpdateDoc(collectionPath: string, docId: string, updates: any): Promise<void> {
  const fields = toFirestoreFields(updates);
  const fieldPaths = Object.keys(updates);
  const mask = fieldPaths.map((f) => `updateMask.fieldPaths=${f}`).join("&");
  await request(`${BASE}/${collectionPath}/${docId}?${mask}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

export async function restDeleteDoc(collectionPath: string, docId: string): Promise<void> {
  await request(`${BASE}/${collectionPath}/${docId}`, { method: "DELETE" });
}

export async function restGetCollection(collectionPath: string): Promise<any[]> {
  const results: any[] = [];
  let pageToken: string | undefined;

  do {
    let url = `${BASE}/${collectionPath}`;
    const params: string[] = [];
    if (pageToken) params.push(`pageToken=${pageToken}`);
    if (params.length > 0) url += `?${params.join("&")}`;
    const result = await request(url, { method: "GET" });
    if (result && result.documents) {
      for (const d of result.documents) {
        const data = fromFirestoreFields(d.fields || {});
        const docId = extractId(d.name);
        if (!data.id && !data.chatId && !data.messageId) {
          data._docId = docId;
        }
        results.push(data);
      }
    }
    pageToken = result?.nextPageToken;
  } while (pageToken);

  return results;
}

interface QueryFilter {
  field: string;
  op: "EQUAL" | "LESS_THAN" | "GREATER_THAN" | "LESS_THAN_OR_EQUAL" | "GREATER_THAN_OR_EQUAL";
  value: any;
}

interface QueryOrder {
  field: string;
  direction: "ASCENDING" | "DESCENDING";
}

export async function restQuery(
  collectionPath: string,
  filters?: QueryFilter[],
  orderByFields?: QueryOrder[],
  limitCount?: number
): Promise<any[]> {
  const parts = collectionPath.split("/");
  const collectionId = parts[parts.length - 1];
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : "";

  const structuredQuery: any = {
    from: [{ collectionId }],
  };

  if (filters && filters.length > 0) {
    if (filters.length === 1) {
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: filters[0].field },
          op: filters[0].op,
          value: toFirestoreValue(filters[0].value),
        },
      };
    } else {
      structuredQuery.where = {
        compositeFilter: {
          op: "AND",
          filters: filters.map((f) => ({
            fieldFilter: {
              field: { fieldPath: f.field },
              op: f.op,
              value: toFirestoreValue(f.value),
            },
          })),
        },
      };
    }
  }

  if (orderByFields && orderByFields.length > 0) {
    structuredQuery.orderBy = orderByFields.map((o) => ({
      field: { fieldPath: o.field },
      direction: o.direction,
    }));
  }

  if (limitCount) {
    structuredQuery.limit = limitCount;
  }

  const url = parentPath
    ? `${BASE}/${parentPath}:runQuery`
    : `${BASE}:runQuery`;

  const result = await request(url, {
    method: "POST",
    body: JSON.stringify({ structuredQuery }),
  });

  const results: any[] = [];
  if (Array.isArray(result)) {
    for (const item of result) {
      if (item.document && item.document.fields) {
        const data = fromFirestoreFields(item.document.fields);
        const docId = extractId(item.document.name);
        if (!data.id && !data.chatId && !data.messageId) {
          data._docId = docId;
        }
        results.push(data);
      }
    }
  }
  return results;
}

export async function restBatchWrite(writes: Array<{ type: "set" | "update" | "delete"; path: string; data?: any; updateFields?: string[] }>): Promise<void> {
  const batchWrites: any[] = [];

  for (const w of writes) {
    const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/${w.path}`;
    if (w.type === "delete") {
      batchWrites.push({ delete: docPath });
    } else if (w.type === "set" && w.data) {
      batchWrites.push({
        update: {
          name: docPath,
          fields: toFirestoreFields(w.data),
        },
      });
    } else if (w.type === "update" && w.data && w.updateFields) {
      batchWrites.push({
        update: {
          name: docPath,
          fields: toFirestoreFields(w.data),
        },
        updateMask: { fieldPaths: w.updateFields },
      });
    }
  }

  if (batchWrites.length === 0) return;

  const batchSize = 500;
  for (let i = 0; i < batchWrites.length; i += batchSize) {
    const chunk = batchWrites.slice(i, i + batchSize);
    await request(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
      {
        method: "POST",
        body: JSON.stringify({ writes: chunk }),
      }
    );
  }
}

export function useRest(): boolean {
  return Platform.OS !== "web";
}
