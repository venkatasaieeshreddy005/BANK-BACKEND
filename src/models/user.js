const mongoose = require("mongoose");
const bcryptjs=require("bcryptjs");


const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:[true,"email is required for creating a user"],
        trim:true,
        lowercase:true,
        match:[/^[^\s@]+@[^\s@]+\.[^\s@]+$/,"Please enter a valid email address"],
        unique:[unique,"email already exist"],

    },
    name:{
        type:String,
        required:[true,"Name is required for creating a user"],


    },
    password:{
        type:String,
        required:[true,"Password is required for creating a user"],
        minlength:6,
        select:false,

    }


},{
    timestamps:true
});

userScheme.pre("save",async (next)=>{
    if(!this.isModified("password")){
        return next();
    }

    const hash=await bcrypt.hash(this.password,10);
    this.password=hash;

    return next();

});

userSchema.methods.comparePassword=async (password)=>{

    return await bcrypt.compare(password,this.password);

};

const userModel=mongoose.model("User",userSchema);

module.exports=userModel;