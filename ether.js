require('dotenv').config()
const express = require("express")
const cors = require("cors")
const https = require("https")
const mongoose = require("mongoose")
const app = express()
app.use(cors())
app.use(express.json())
const PORT = 3000

const mongo = `mongodb+srv://paritosh99:${process.env.PASSWORD}@cluster0.fycdyog.mongodb.net/?retryWrites=true&w=majority`
var priceethereum = 0;

//Connecting to mongodb
mongoose.connect(mongo).catch((error) => console.log(error))

//Defining Schema for transactions
const Schema = mongoose.Schema({
    blockNumber: String,
    timeStamp: String,
    hash: String,
    nonce: String,
    blockHash: String,
    transactionIndex: String,
    from: String,
    to: String,
    value: String,
    isError: String,
})

//Defining ethereum price schema
const price = mongoose.Schema({
    name: String,
    price: Number
})

//Creating model of transactions and prices
const transactions = mongoose.model("transactions", Schema)
const prices = mongoose.model("prices", price)



// Get Normal Transactions for a defined Address
const getTransactions = app.get("/:address", async (req, result) => {
    const address = req.params.address
    etherURL = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${process.env.APIKEY}`
    const response = https.get(etherURL, (res) => {
        let data = ""
        console.log("statusCode:", res.statusCode)
        console.log("headers:", res.headers)

        res.on("data", (d) => {
            data += d.toString()
        })

        res.on("end", async () => {
            const body = JSON.parse(data);
            body.result.map((item) => {
                const transaction = new transactions(item);
                transaction.save()
            })
            result.send(201,body.result)

        })
        
        res.on("error",(res) => {
            result.send(500,error)
        })

    })
})

//Fetch Price of Ethereum every 10 min
const getprice = async () => {
    var data = await https.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr", (res) => {
        let data = ""
        res.on("data", (d) => {
            data += d.toString()
        })

        res.on("end", async () => {
            const body = JSON.parse(data);
            prices.findOneAndUpdate({name:"price"},{name:"price",price:body.ethereum.inr},{upsert:true},(error) => {
                console.log(error)
            })
            priceethereum = body.ethereum.inr
        })
    }
)}

//Calculating the balance of address
app.get("/balance/:address",async (req,result) => {
    const address = req.params.address
    etherURL = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${process.env.APIKEY}`
    const response = https.get(etherURL, (res) => {
        let data = ""
        let balance = 0
        console.log("statusCode:", res.statusCode)
        console.log("headers:", res.headers)

        res.on("data", (d) => {
            data += d.toString()
        })

        res.on("end", async () => {
            const body = JSON.parse(data);
            body.result.map((item) => {
                if (item.from == address){
                    balance += parseInt(item.value)
                }
                else if (item.to == address){
                    balance -= parseInt(item.value)
                }
                console.log(balance)
            })
            getprice()
            result.send(200,`The balance for ${address} is ${balance} \n The Current price of ethereum is INR ${priceethereum}`)

        })
        
        res.on("error",(res) => {
            result.send(error)
        })

    })
})

//Scheduling to refetch prices of ethereum every 10 minutes
getprice()
setInterval(() => {
    getprice()
}, 600000)

//Starting the server to listen to the API Endpoints requests
app.listen(PORT)