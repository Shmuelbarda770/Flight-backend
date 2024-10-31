// dataMongo.js
import { MongoClient, ServerApiVersion } from 'mongodb';

const uri =process.env.MongoDB||'';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export async function connect() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}

export function getCollection(collectionName) {
  const db = client.db('flyproject');
  return db.collection(collectionName);
}

export async function close() {
  await client.close();
}
