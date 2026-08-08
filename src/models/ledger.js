const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true,"Ledger must be assosiated with the account"],
        index: true,
        immutable:true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
        immutable:true,
    },
    /*
    balanceAfter: {
        type: Number,
        required: true,
        min: 0,
        immutable: true,
    },
    */
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required:true,
        index:true,
        immutable:true,
    },
    type:{
        type: String,
        enum: ["CREDIT", "DEBIT"],
        required: true,
    }



});


function preventLedgerModification(){
    throw new Error("Ledger entries are immutable and cannot be modified or deleted");
}

ledgerSchema.pre('findOneAndUpdate',preventLedgerModification);
ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('remove',preventLedgerModification);
ledgerSchema.pre('deleteMany',preventLedgerModification);
ledgerSchema.pre('findOneAndDelete',preventLedgerModification);
ledgerSchema.pre('updateMany',preventLedgerModification);
ledgerSchema.pre('findOneAndReplace',preventLedgerModification);


const ledgerModel=mongoose.model("ledger",ledgerSchema);

module.exports=ledgerModel;