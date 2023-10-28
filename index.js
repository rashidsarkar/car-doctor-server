const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParsaer = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleWare
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParsaer());
//custom midle Ware
const logger = async (req, res, next) => {
  console.log("Called : ", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.tokenName;
  if (!token) {
    return res.status(401).send({ mess: "Not Valid" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ msg: "NOT ACCES" });
    }
    req.validUser = decoded;
    next();
  });
};

const uri = "mongodb://127.0.0.1:27017";
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ydmxw3q.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings");

    //AUTH API

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        // .cookie("token", token, {
        //   httpOnly: true,
        //   secure: false,
        //   sameSite: "none",
        // })
        .cookie("tokenName", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //service APIk
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    //bookings
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", verifyToken, async (req, res) => {
      // console.log("token,", req.cookies.tokenName);
      console.log(req.query.email);
      console.log("user in valid token", req.user);
      if (req.query.email !== req.validUser.email) {
        return res.status(403).send({ msg: "NOT YOUR Token" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const upDatedBooking = req.body;
      const upDateDoc = {
        $set: {
          status: upDatedBooking.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, upDateDoc);
      res.send(result);
      // console.log(upDatedBooking);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Doctor is Running...");
});
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
