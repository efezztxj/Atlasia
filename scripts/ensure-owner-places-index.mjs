import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const indexFile = fileURLToPath(new URL("../firestore.indexes.json", import.meta.url));
const requiredIndex = {
  collectionGroup: "places",
  queryScope: "COLLECTION",
  fields: [
    { fieldPath: "authorUid", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ],
};

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRequiredIndex(value) {
  if (!isRecord(value) || value.collectionGroup !== requiredIndex.collectionGroup || value.queryScope !== requiredIndex.queryScope) {
    return false;
  }
  if (!Array.isArray(value.fields) || value.fields.length !== requiredIndex.fields.length) return false;
  return requiredIndex.fields.every((field, index) => {
    const candidate = value.fields[index];
    return isRecord(candidate)
      && candidate.fieldPath === field.fieldPath
      && candidate.order === field.order;
  });
}

/** Ensure the repository's local Firestore index manifest; this never contacts Firebase. */
export function ensureOwnerPlacesIndex(config) {
  if (!isRecord(config) || !Array.isArray(config.indexes)) {
    throw new TypeError("Firestore index manifest must contain an indexes array.");
  }
  if (config.indexes.some(isRequiredIndex)) return { config, changed: false };
  return {
    config: { ...config, indexes: [...config.indexes, requiredIndex] },
    changed: true,
  };
}

/** Injectable file operations let node:test exercise the command without credentials or network. */
export function run({
  read = readFileSync,
  write = writeFileSync,
  log = console.log,
  path = indexFile,
} = {}) {
  const config = JSON.parse(read(path, "utf8"));
  const result = ensureOwnerPlacesIndex(config);
  if (result.changed) {
    write(path, `${JSON.stringify(result.config, null, 2)}\n`, "utf8");
    log("Added the owner places composite index to firestore.indexes.json.");
  } else {
    log("Owner places composite index is already present.");
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    console.error("Could not ensure the owner places index:", error);
    process.exitCode = 1;
  }
}
