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

    app.get('/api/request-meal', async (req, res) => {
      const cursor = mealRequestCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.delete('/api/request-meal/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await mealRequestCollection.deleteOne(query);
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


    app.post('/api/add-review', async (req, res) => {
      try {
        const { meal_id, reviews } = req.body;

        // Assuming mealsCollection has a document with a matching _id
        const result = await mealsCollection.updateOne(
          { _id: new ObjectId(meal_id) }, // Convert meal_id to ObjectId
          { $set: { reviews } }
        );

        res.status(200).json({ success: true, message: 'Review added successfully' });
      } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ success: false, message: 'Error adding review' });
      }
    });

    app.delete('/meals/:mealId/reviews/:reviewId', async (req, res) => {
      try {
        const mealId = req.params.mealId;
        const reviewId = req.params.reviewId;

        // Connect to MongoDB
        await client.connect();

        // Find the meal with the specified ID
        const meal = await client.db('CampusCuisine').collection('MealsDB').findOne({ _id: new ObjectId(mealId) });

        // Find the index of the review with the specified ID
        const reviewIndex = meal.reviews.findIndex((review) => review.review_id === reviewId);

        // If the review is found, remove it
        if (reviewIndex !== -1) {
          meal.reviews.splice(reviewIndex, 1);
          // Update the meal in the database
          await client.db('CampusCuisine').collection('MealsDB').updateOne({ _id: new ObjectId(mealId) }, { $set: { reviews: meal.reviews } });
          res.status(204).end(); // 204 No Content - Success, no data to return
        } else {
          res.status(404).json({ error: 'Review not found' });
        }
      } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });


    app.put('/meals/:mealId/reviews/:reviewId', async (req, res) => {
      try {
        const mealId = req.params.mealId;
        const reviewId = req.params.reviewId;

        // Assuming your MongoDB client is named "client" and connected to the database
        const collection = client.db('CampusCuisine').collection('MealsDB');

        // Find the meal with the specified ID
        const meal = await collection.findOne({ _id: new ObjectId(mealId) });

        // Find the review with the specified ID
        const review = meal.reviews.find((r) => r.review_id === reviewId);

        if (!review) {
          return res.status(404).json({ error: 'Review not found' });
        }

        // Extract updated data from the request body
        const { ratings, review_text } = req.body;

        // Update the review properties
        review.ratings = ratings || review.ratings;
        review.review_text = review_text || review.review_text;

        // Update the meal in the database
        await collection.updateOne(
          { _id: new ObjectId(mealId), 'reviews.review_id': reviewId },
          { $set: { 'reviews.$': review } }
        );

        res.status(200).json({ message: 'Review updated successfully', updatedReview: review });
      } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // ENDS HERE




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