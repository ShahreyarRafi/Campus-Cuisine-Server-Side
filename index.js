const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


//middleware
app.use(cors('*'));
// app.use(cors({
//   //local
//   // origin: ['http://localhost:5173'],
//   //live site
//   origin: [
//     'https://campus-cuisine.web.app/',
//     'https://campus-cuisine.firebaseapp.com/'
//   ],
//   credentials: true,
// }));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n8c8sym.mongodb.net/?retryWrites=true&w=majority`;


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


    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }



    // for Meal Request

    app.get('/mealsCount', async (req, res) => {
      const count = await mealsCollection.estimatedDocumentCount();
      res.send({ count });
    })


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

    // Assuming you are using Express.js
    app.put('/api/user/:userId/like-meal', async (req, res) => {
      const { userId } = req.params;
      const { mealId } = req.body;

      try {
        // Find the user by ID and update the likedMeals array
        const user = await userCollection.findOneAndUpdate(
          { _id: new ObjectId(userId) },
          { $push: { likedMeals: new ObjectId(mealId) } },
          { returnDocument: 'after' } // Return the updated document
        );

        res.json({ message: 'success', user });
      } catch (error) {
        console.error('Error updating user liked meals:', error);
        res.status(500).json({ error: 'Error updating user liked meals' });
      }
    });


    app.delete('/api/request-meal/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await mealRequestCollection.deleteOne(query);
      res.send(result);
    })

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'Admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }


    // for users
    app.get('/users', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/check-admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'Admin';
      }
      res.send({ admin });
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

    app.get('/find-user', async (req, res) => {
      try {
        const { searchQuery } = req.query;
        console.log('Received search query:', searchQuery);

        const regex = new RegExp(searchQuery, 'i'); // case-insensitive search

        const userCollection = client.db('CampusCuisine').collection('UserDB');
        const users = await userCollection.find({ $or: [{ name: regex }, { email: regex }] }).toArray();

        console.log('Found users:', users);

        res.json(users);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });


    app.get('/find-user-to-serve', async (req, res) => {
      try {
        const { searchQuery } = req.query;
        console.log('Received search query:', searchQuery);

        const regex = new RegExp(searchQuery, 'i'); // case-insensitive search

        const mealRequestCollection = client.db('CampusCuisine').collection('MealRequestDB')
        const users = await mealRequestCollection.find({ $or: [{ user_name: regex }, { user_email: regex }] }).toArray();

        console.log('Found users:', users);

        res.json(users);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });


    // app.put('/update-user-badge/:email', async (req, res) => {
    //   let email = req.params.email.toLowerCase(); // Convert email to lowercase
    //   const { badge } = req.body;

    //   try {
    //     // Find the user by email and update the badge
    //     const result = await userCollection.updateOne(
    //       { email: email },
    //       { $set: { badge } }
    //     );

    //     if (result.modifiedCount === 0) {
    //       return res.status(404).json({ error: 'User not found' });
    //     }

    //     res.json({ success: true });
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: 'Internal Server Error' });
    //   }
    // });


    app.put('/update-user-badge/:id', async (req, res) => {
      const userId = req.params.id;
      const { badge } = req.body;
      console.log('Received user ID:', userId);
      try {
        // Find the user by _id and update the badge
        const result = await userCollection.updateOne(
          { _id: new ObjectId(userId) }, // Use _id directly
          { $set: { badge } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });


    // for meals

    app.get('/meals', async (req, res) => {
      const cursor = mealsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/meals', async (req, res) => {
      const newMeal = req.body;
      console.log(newMeal);
      const result = await mealsCollection.insertOne(newMeal);
      console.log(result);
      res.send(result);
    })


    app.get('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await mealsCollection.findOne(query);
      res.send(result);
    })

    app.delete('/meals/:mealId', async (req, res) => {
      const mealId = req.params.mealId;

      try {
        // Convert mealId to ObjectId
        const mealObjectId = new ObjectId(mealId);

        // Find the meal with the specified ID and delete it
        const result = await mealsCollection.deleteOne({ _id: mealObjectId });

        if (result.deletedCount === 1) {
          res.status(200).json({ message: 'Meal deleted successfully' });
        } else {
          res.status(404).json({ message: 'Meal not found' });
        }
      } catch (error) {
        console.error('Error deleting meal:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    app.put('/meals/:id', async (req, res) => {
      const { id } = req.params;
      const updatedMeal = req.body;

      try {
        await client.connect();

        const mealsCollection = client.db('CampusCuisine').collection('MealsDB');

        const result = await mealsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedMeal }
        );

        if (result.modifiedCount > 0) {
          res.json({ updated: true });
        } else {
          res.json({ updated: false });
        }
      } catch (error) {
        console.error('Error updating meal:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

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


    app.put('/api/like-meal/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const update = { $inc: { liked_count: 1 } }
      const result = await mealsCollection.updateOne(filter, update);
      console.log(result);
      res.send(result);
    })

    app.put('/api/review-count/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const update = { $inc: { review_count: 1 } }
      const result = await mealsCollection.updateOne(filter, update);
      console.log(result);
      res.send(result);
    })

    app.patch('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $set: { meal_status: "Ready" } };

      try {
        const result = await mealsCollection.updateOne(filter, update);

        if (result.matchedCount === 1) {
          res.status(200).json({ message: 'Meal status updated successfully.' });
        } else {
          res.status(404).json({ message: 'Meal not found.' });
        }
      } catch (error) {
        console.error('Error updating meal status:', error);
        res.status(500).json({ message: 'Internal server error.' });
      }
    });


    app.patch('/users/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $set: { role: "Admin" } };

      try {
        const result = await userCollection.updateOne(filter, update);

        if (result.matchedCount === 1) {
          res.status(200).json({ message: 'User role updated successfully.' });
        } else {
          res.status(404).json({ message: 'User not found.' });
        }
      } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Internal server error.' });
      }
    });


    app.patch('/meal/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $set: { delivery_status: "Delivered" } };

      try {
        const result = await mealRequestCollection.updateOne(filter, update);

        if (result.matchedCount === 1) {
          res.status(200).json({ message: 'Delivered successfully.' });
        } else {
          res.status(404).json({ message: 'Meal not found.' });
        }
      } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ message: 'Internal server error.' });
      }
    });

    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    // ends here

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