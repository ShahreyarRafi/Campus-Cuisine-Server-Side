const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n8c8sym.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)


    const mealsCollection = client.db('CampusCuisine').collection('MealsDB');
    const userCollection = client.db('CampusCuisine').collection('UserDB')
    const mealRequestCollection = client.db('CampusCuisine').collection('MealRequestDB')

    // for Meal Request

    app.post('/api/request-meal', async (req, res) => {
      const newMealRequest = req.body;
      console.log(newMealRequest);
      const result = await mealRequestCollection.insertOne(newMealRequest);
      console.log(result);
      res.send(result);
    })

    // for cart

    app.get('/users', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/user', async (req, res) => {
      const newCartItem = req.body;
      console.log(newCartItem);
      const result = await userCollection.insertOne(newCartItem);
      console.log(result);
      res.send(result);
    })


    
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email; 
      const query = { email: email };
      const results = await userCollection.find(query).toArray();
      res.send(results);
    });
    



    // for meals

    app.get('/meals', async (req, res) => {
      const cursor = mealsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    app.get('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await mealsCollection.findOne(query);
      res.send(result);
    })

    app.get('/:meal_status', async (req, res) => {
      const mealStatus = req.params.meal_status;
      const query = { meal_status: mealStatus };
      const results = await mealsCollection.find(query).toArray();
      res.send(results);
    });


  


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
})