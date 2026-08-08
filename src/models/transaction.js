const mongoose = require("mongoose");


const transactionSchema=new mongoose.Schema({
    fromAccount:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"account",
        required:[true,"Transaction must have From Account"],
        index:true,


    },
    toAccount:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"account",
        required:[true,"Transaction must have To Account"],
        index:true,

    },
    status:{
        type:String,
        enum:{
            values:['PENDING','COMPLETED','FAILED','REVERSED'],
            message:"Status can be either PENDING,COMPLETED,FAILED or REVERSED",

        },
        default:"PENDING",

    },
    amount:{
        type:Number,
        required:[true,"Ammount is required to create a transaction"],
        min:[1,"Transaction ammount can not be negative"],

    },
    idempotencyKey:{
        type:String,
        required:[true,"IdempotencyKey is required to create a transaction"],
        index:true,
        unique:true,
    },
    description: {
        type: String,
        trim: true,
    },

},{timestamps:true});

const transactionModel=mongoose.model("transaction",transactionSchema);

module.exports=transactionModel;