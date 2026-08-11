const crypto = require("crypto");

const generateOtp = () => {
    return crypto.randomInt(1000, 10000).toString();
};

module.exports = generateOtp;
