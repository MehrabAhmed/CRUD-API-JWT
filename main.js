const express = require("express");
const res = require("express/lib/response");
const app = express()
const router = express.Router()
const createError = require('http-errors')
const mongoose = require("mongoose")
app.use(express.json())

const { authSchema } = require('./Validate')
const { checkRole,signAccessToken, signRrefeshToken, verifyRefreshToken, verifyAccessToken } = require('./JWTToken')
const bcrypt = require('bcrypt');

//mongoose.set('strictQuery', false);
mongoose.set('strictQuery', true);


//DB connection
mongoose.connect("mongodb://127.0.0.1:27017/mynewdb",{
    useNewUrlParser: true,
    useUnifiedTopology: true
},(err)=>{
    if(!err)
    {
        console.log("Connected to Db")
    }
    else
    {
        console.log("Error!")
    }
})

//schema
const  sch ={

    name:String,
    email:String,
    id:Number,
    password:String
}

const monmodel = mongoose.model("NewCol", sch);


//POST (Create)

app.post("/post", async(req,res)=>{
try
{   
    const doesExist = await monmodel.findOne({ email: req.body.email })
    if (doesExist) throw createError.Conflict(`${req.body.email} already exits.`)

    const data = new monmodel({
        name:req.body.name,
        email:req.body.email,
        id:req.body.id,
        password:req.body.password
    });


    const savedUser = await data.save()
    const accessToken = await signAccessToken(savedUser.id)
    const refreshToken = await signRrefeshToken(savedUser.id)
    res.send({ accessToken, refreshToken })
}
    
catch(error)
{
    if (error.isJoi === true) error.status = 422
    next(error)
}

})

// Login

app.post('/login', async (req, res, next) => {
    try {
        const result = await authSchema.validateAsync(req.body)
        const user = await monmodel.findOne({ email: result.email })

        const isMatch = await monmodel.isValidPassword(result.password)
        if (!isMatch) throw createError.Unauthorized('Invalid user id or password')

        if (!monmodel) throw createError.NotFound('No such User')

        const accessToken = await signAccessToken(user.id)
        const refreshToken = await signRrefeshToken(user.id)
        res.send({ accessToken, refreshToken })

    } catch (error) {
        if (error.isJoi === true)
            return next(createError.BadRequest("Invalid Username or Password"))
        next(error)
    }
})

//PUT (Update)

app.put("/update/:id", verifyAccessToken, async(req, res)=>{

    let upid = req.params.id;
    let upname = req.body.name;
    let upemail = req.body.email;
    let uppass = req.body.password;

    monmodel.findOneAndUpdate({id:upid},{$set:{name:upname, email:upemail, password:uppass}}, {new:true}, (err,data)=>{

    if(err)
    {
        res.send("Error!")
        return res.status(500).json({
            error: err
        })
    }
    else{
        if(data==null)
        {
            res.send("Nothing found!")
            res.status(500).json({
                error: err
             })
        }
        else{
            res.send(data)
        }
    }
    })

})

//FETCH (GET)

app.get("/fetch/:id", function(req,res){

    fetchid = req.params.id;
    monmodel.find( ({id:fetchid}) , function(err, val)
    {
      if(err)
      {
        res.send("Error!")
        res.status(500).json({
            error: err
        })
      }
      else
      {
        if(val.length==0)
        {
           res.send("No such id exist");
           res.status(500).json({
           error: err
        })
        }
        else
        {
            res.send(val);
            res.status(200).json({
                user: val
            })
        }
      }
        
    } )
})


//DELETE
app.delete("/delete/:id", verifyAccessToken, function(req, res){

    let deleteid = req.params.id;
    monmodel.findOneAndDelete(({id:deleteid}), function(err, docs){
         
    if(err)
    {
        console.log("Error!")
        res.status(500).json({
            error: err
        })
    }
    else{
        if(docs==null)
        {
         console.log("No such id exist");
         res.status(500).json({
            error: err
        })
        }
        else
        {
         res.send("Deleted.");
         
        }
    }
    
    })
})

app.post('/refresh-token', async (req, res, next) => {
    try 
    {
        const { refreshToken } = req.body
        if (!refreshToken) throw createError.BadRequest()
        const userId = await verifyRefreshToken(refreshToken)

        const accessToken = await signAccessToken(userId)
        const refToken = await signRrefeshToken(userId)
        res.send({ accessToken: accessToken, refreshToken: refToken })

    } 
    catch (error)
     {
        next(error)

    }
})



app.listen(3000,()=>{
    console.log("on port 3000")
})