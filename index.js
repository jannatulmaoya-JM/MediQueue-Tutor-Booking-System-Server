const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;


app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  jwt.verify(token, process.env.JWT_SECRET || "mediqueue_secret", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = decoded;
    next();
  });
};

async function server() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

  
    const db = client.db("medi-queue-tutor");
    const tutorsCollection = db.collection("tutors");
    const bookingsCollection = db.collection("bookings");

    app.post("/jwt", (req, res) => {
      const { email } = req.body;
      const token = jwt.sign({ email }, process.env.JWT_SECRET || "mediqueue_secret", { expiresIn: "7d" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .json({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .json({ success: true });
    });


    app.get("/tutors", async (req, res) => {
      try {
        const { search, startDate, endDate, limit } = req.query;
        const query = {};

        if (search) {
       
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { title: { $regex: search, $options: "i" } },
          ];
        }

        if (startDate || endDate) {
          query.sessionStartDate = {};
          if (startDate) query.sessionStartDate.$gte = startDate;
          if (endDate) query.sessionStartDate.$lte = endDate;
        }

        const cursor = tutorsCollection.find(query);
        if (limit) cursor.limit(parseInt(limit));

        const result = await cursor.toArray();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });


    app.get("/tutors/my-tutors", verifyToken, async (req, res) => {
      try {
        const { email } = req.query;
        if (req.user.email !== email) return res.status(403).json({ message: "Forbidden" });
        const result = await tutorsCollection.find({ createdBy: email }).toArray();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    app.get("/tutors/:tutorId", async (req, res) => {
      try {
        const result = await tutorsCollection.findOne({ _id: new ObjectId(req.params.tutorId) });
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    app.post("/tutors", verifyToken, async (req, res) => {
      try {
        const result = await tutorsCollection.insertOne(req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    app.put("/tutors/:id", verifyToken, async (req, res) => {
      try {
        const result = await tutorsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    app.patch("/tutors/:id/decrease-slot", verifyToken, async (req, res) => {
      try {
        const tutor = await tutorsCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!tutor) return res.status(404).json({ message: "Tutor not found" });
        if (tutor.totalSlot !== undefined && tutor.totalSlot <= 0) {
          return res.status(400).json({ message: "This session is fully booked." });
        }
        const result = await tutorsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $inc: { totalSlot: -1 } }
        );
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });
    app.delete("/tutors/:id", verifyToken, async (req, res) => {
      try {
        const result = await tutorsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

   
    app.get("/bookings", verifyToken, async (req, res) => {
      try {
        const { email } = req.query;
        if (req.user.email !== email) return res.status(403).json({ message: "Forbidden" });
        const result = await bookingsCollection.find({ studentEmail: email }).toArray();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

  
    app.post("/bookings", verifyToken, async (req, res) => {
      try {
        const result = await bookingsCollection.insertOne(req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });


    app.patch("/bookings/:id", verifyToken, async (req, res) => {
      try {
        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    // Root
    app.get("/", (req, res) => res.send("MediQueue server running!"));

    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error(err);
  }
}

server();