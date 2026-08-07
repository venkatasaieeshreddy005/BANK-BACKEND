const userModel = require("../models/user");
const jwt = require("jsonwebtoken");
const {sendEmail,sendRegistrationEmail}=require("../services/email");



module.exports.registerUser = async (req, res) => {
    try {
        const { email, name, password } = req.body;

        const isExists = await userModel.findOne({ email });

        if (isExists) {
            return res.status(400).json({
                message: "User already exists with this email",
                status: "failed"
            });
        }

        const user = new userModel({
            name,
            email,
            password
        });

        await user.save(); // password gets hashed automatically

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "2d" }
        );

        res.cookie("token", token);

        res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        });

        sendRegistrationEmail(user.email,user.name);

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

module.exports.loginController=async(req,res)=>{
    try {

        const {email,password}=req.body;

        const user = await userModel
            .findOne({ email })
            .select("+password");
        
        if(!user){
            return res.status(400).json({
                message: "No User Exists",
                status: "failed"
            });

        }

        const isvalidPassword=await user.comparePassword(password);

        if(!isvalidPassword){
            return res.status(400).json({
                message: "Incorrect password",
                status: "failed"
            });

        }


        const token = jwt.sign({ userId: user._id },process.env.JWT_SECRET,{ expiresIn: "2d" });

        res.cookie("token", token);

        res.status(200).json({
            message:"Login Successful",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        });




        





    } catch (error) {

        res.status(500).json({
            message: error.message
        });
        
    }
}
