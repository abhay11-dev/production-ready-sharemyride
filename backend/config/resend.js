// config/resend.js

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy123456789");

module.exports = resend;