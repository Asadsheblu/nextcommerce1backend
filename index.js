const express = require("express")
const app = express()
const SSLCommerzPayment = require('sslcommerz-lts')
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express')
app.use(cors())
const corsConfig = {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}
app.use(cors(corsConfig))
app.options("*", cors(corsConfig))
app.use(express.json())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,authorization")
    next()
})
const port = 5000;
app.use(express.json());
app.get('/', (req, res) => {
    res.send("Hello Ecommeerce Project1")
})
var uri = "mongodb://eproject1:oGFM8IDlr0tG9Ijo@cluster0-shard-00-00.7auxx.mongodb.net:27017,cluster0-shard-00-01.7auxx.mongodb.net:27017,cluster0-shard-00-02.7auxx.mongodb.net:27017/?ssl=true&replicaSet=atlas-quc4tl-shard-0&authSource=admin&retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const store_id = process.env.store_id;
const store_passwd =process.env.store_passwd;
const is_live = false //true for live, false for sandbox

async function run() {
    try {
        await client.connect();
        const trans_id=new ObjectId().toString();
        const Products = client.db("Eproject1").collection("products")
        const Ordercollection = client.db("Eproject1").collection("order")
        app.post("/order",async(req,res)=>{
            const product=await Products.findOne({_id: new ObjectId(req.body.productId)})
            // console.log(product);
            const order=req.body
            const data = {
                total_amount: product?.price,
                currency: 'BDT',
                tran_id: trans_id, // use unique tran_id for each api call
                success_url: `http://localhost:5000/Success/${trans_id}`,
                fail_url: `http://localhost:5000/Failed/${trans_id}`,
                cancel_url: 'http://localhost:3030/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: product?.name,
                product_category: product?.category,
                product_profile: 'general',
                cus_name: 'Customer Name',
                cus_email: order?.email,
                cus_add1: order?.address,
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: order.post,
                cus_country: 'Bangladesh',
                cus_phone: order?.phone,
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };
         
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
             
                let GatewayPageURL = apiResponse.GatewayPageURL
                res.send({url:GatewayPageURL})
                const finalOrder={
                    product,
                    paymentStatus:false,
                    TransicationId:trans_id
                }
                const result=Ordercollection.insertOne(finalOrder)
                       
                
            });
            app.post("/Success/:trainId",async(req,res)=>{
                console.log(req.params.trainId);
                const result=await Ordercollection.updateOne({TransicationId:req.params.trainId},{
                   
                    $set:{
                        paymentStatus:true,
                    },
                   
                })
                if(result.modifiedCount>0){
                    res.redirect(`https://next-commerce1frontend.vercel.app/Success/${req.params.trainId}`)
                }
                
            })
            app.post('/Failed/:trainId',async(req,res)=>{
                const result=await Ordercollection.deleteOne({TransicationId:req.params.trainId})
                if(result.deletedCount){
                    res.redirect(`https://next-commerce1frontend.vercel.app/Failed/${req.params.trainId}`)
                }
            })
        })
        app.get("/order",async(req,res)=>{
            const query={}
            const result=Ordercollection.find(query)
            const orders=await result.toArray()
            res.send(orders)
        })
        
        app.get('/order/:id', async (req, res) => {
            const id =(req.params.id);
            const query = { _id: new ObjectId(id) }
            const result = await Ordercollection.findOne(query)
            res.send(result)
        })


        app.post("/product", async (req,res) => {
            const doc = req.body
            const result = await Products.insertOne(doc);
          
            res.send(result);
        });

        app.get('/product',async(req,res)=>{
            const query={}
            const result=Products.find(query)
            const products=await result.toArray()
            res.send(products)
        })
       
        app.get('/product/:id', async (req,res) => {
            const id =(req.params.id);
            const query = { _id:new ObjectId(id) }
            const result = await Products.findOne(query)
            res.send(result)
        })

       
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);
app.listen(port, () => {
    console.log(`Running server ${port}`);

})
