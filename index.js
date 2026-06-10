
const express = require('express');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.DB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function server() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
     const db = client.db ("medi-queue-tutor");
    const tutorsCollection = db.collection("tutors");

    app.get("/tutors", async (req,res) => {
      const cursor = tutorsCollection.find();
      const rersult = await cursor.toArray();
      //console.log(rersult);

      res.send(rersult);
    });
    app.get("/tutors/:tutorId",async (req,res) =>{
      console.log(req.params.tutorId);
      const tutorId = req.params.tutorId;
      const query = {_id:new ObjectId(tutorId)};

      console.log(query);
      const result = await tutorsCollection.findOne(query);
      //console.log(result);

      res.send(result);
    }) ;
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
server().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Mediqueue is running!');
});

app.listen(port, () => {
  console.log(`Server is running on ${port} PORT`);
});