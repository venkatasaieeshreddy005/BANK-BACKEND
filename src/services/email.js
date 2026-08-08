require("dotenv").config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    },
});


// Verify email connection
transporter.verify((error) => {
    if (error) {
        console.error("Error connecting to email server:", error);
    } else {
        console.log("Email server is ready to send messages");
    }
});


// Common send email function
const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Bank-Ledger" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log("Message sent:", info.messageId);

    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};


// Registration email
const sendRegistrationEmail = async (userEmail, name) => {

    const subject = "Welcome to Bank Ledger!";

    const text = `Hello ${name},Thank you for registering at Bank Ledger.
                    We're excited to have you on board!
                    Best regards,
                    The Bank Ledger Team
                    `;

    const html = `
<html>
<body>
    <p>Hello ${name},</p>

    <p>
        Thank you for registering at <strong>Bank Ledger</strong>.
        We're excited to have you on board!
    </p>

    <p>
        Best regards,<br>
        <strong>The Bank Ledger Team</strong>
    </p>
</body>
</html>
`;

    await sendEmail(userEmail, subject, text, html);
};


const sendTransactionEmail = async (userEmail, name, amount, toAccount) => {
    const subject = "Transaction Successful!";

    const text = `Hello ${name},

Your transaction was successful.

Amount: ${amount}
Transferred to: ${toAccount}

Thank you for using Bank Ledger.

Best regards,
The Bank Ledger Team`;

    const html = `
<html>
<body>
    <p>Hello ${name},</p>

    <p>
        Your transaction was <strong>successful</strong>.
    </p>

    <p>
        <strong>Amount:</strong> ${amount}<br>
        <strong>Transferred to:</strong> ${toAccount}
    </p>

    <p>
        Thank you for using <strong>Bank Ledger</strong>.
    </p>

    <p>
        Best regards,<br>
        <strong>The Bank Ledger Team</strong>
    </p>
</body>
</html>
`;

    await sendEmail(userEmail, subject, text, html);
};


const sendTransactionFailedEmail = async (userEmail,name,amount,toAccount) => {
    const subject = "Transaction Failed";

    const text = `Hello ${name},

Unfortunately, your transaction could not be completed.

Amount: ${amount}
Attempted transfer to: ${toAccount}


Please check your account details and try again.

Best regards,
The Bank Ledger Team`;

    const html = `
<html>
<body>
    <p>Hello ${name},</p>

    <p>
        Unfortunately, your transaction
        <strong>could not be completed</strong>.
    </p>

    <p>
        <strong>Amount:</strong> ${amount}<br>
        <strong>Attempted transfer to:</strong> ${toAccount}<br>
        
    </p>

    <p>
        Please check your account details and try again.
    </p>

    <p>
        Best regards,<br>
        <strong>The Bank Ledger Team</strong>
    </p>
</body>
</html>
`;

    await sendEmail(userEmail, subject, text, html);
};


module.exports = {
    transporter,
    sendEmail,
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailedEmail,

};
