
import fs from 'fs'
import mongodb from 'mongodb'

const uri =process.env.MongoDB ||null;

const client = new mongodb.MongoClient(uri, {
  serverApi: {
    version: mongodb.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function pushToMongo() {
  try {
    await client.connect();
    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    const db = client.db("flyproject");
    const col = db.collection("PastFlightInformation");

    const data = fs.readFileSync('./dataServer/PastFlightInformation.json', 'utf-8');
    const prompt = JSON.parse(data);

    console.log("Data to insert:", prompt);

    const p = await col.insertMany(prompt);
    console.log("Insertion result:", p);

  } catch (err) {
    console.error("An error occurred:", err);
  } finally {
    await client.close();
  }
}

pushToMongo().catch(console.dir);