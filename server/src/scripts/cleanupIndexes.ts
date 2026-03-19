import 'dotenv/config';
import mongoose from 'mongoose';

type IndexInfo = {
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
  sparse?: boolean;
  partialFilterExpression?: Record<string, unknown>;
};

function stableStringify(v: unknown) {
  if (!v) return '';
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return JSON.stringify(v);
  const obj = v as Record<string, unknown>;
  return JSON.stringify(
    Object.keys(obj)
      .sort()
      .reduce((acc, k) => {
        acc[k] = obj[k];
        return acc;
      }, {} as Record<string, unknown>)
  );
}

function indexSignature(idx: IndexInfo) {
  return [
    stableStringify(idx.key),
    idx.unique ? 'unique' : 'nonunique',
    idx.sparse ? 'sparse' : 'nonsparse',
    stableStringify(idx.partialFilterExpression ?? null),
  ].join('|');
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Missing MONGO_URI in environment. Add it to server/.env.');
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongo connection database handle is undefined.');

  const dryRun = process.env.DRY_RUN === '1';
  const collections = await db.listCollections().toArray();

  let totalDropped = 0;
  for (const c of collections) {
    const collName = c.name;
    const coll = mongoose.connection.collection(collName);
    const indexes = (await coll.indexes()) as IndexInfo[];

    if (!indexes || indexes.length === 0) continue;

    // Never touch the built-in _id_ index
    const filtered = indexes.filter((idx) => idx.name !== '_id_');

    // Group by “same key + same options” => true duplicates
    const groups = new Map<string, IndexInfo[]>();
    for (const idx of filtered) {
      const sig = indexSignature(idx);
      const arr = groups.get(sig) || [];
      arr.push(idx);
      groups.set(sig, arr);
    }

    for (const [, group] of groups) {
      if (group.length <= 1) continue;

      // Keep the first index (deterministic by name sort)
      const sorted = [...group].sort((a, b) => a.name.localeCompare(b.name));
      const keep = sorted[0];
      const drop = sorted.slice(1);

      for (const idx of drop) {
        if (dryRun) {
          console.log(`[DRY_RUN] Would drop index ${collName}.${idx.name} (duplicate of ${keep.name})`);
          continue;
        }
        await coll.dropIndex(idx.name);
        totalDropped += 1;
        console.log(`Dropped index ${collName}.${idx.name} (duplicate of ${keep.name})`);
      }
    }
  }

  await mongoose.disconnect();
  console.log(`cleanupIndexes complete. Dropped ${totalDropped} duplicate index(es).`);
}

main().catch((err) => {
  console.error('cleanupIndexes failed:', err);
  process.exit(1);
});

