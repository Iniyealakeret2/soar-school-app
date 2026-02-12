/**
 * Mock Mailer Service for Technical Challenge
 * In a production environment, this would use a library like 'nodemailer'
 * or a service like SendGrid/Amazon SES.
 */

const sendOtp = async (email, otp) => {
    console.log('\n' + '='.repeat(50));
    console.log(`📧 MOCK EMAIL SENT TO: ${email}`);
    console.log(`🔑 YOUR OTP CODE IS: ${otp}`);
    console.log(`⏱ EXPIRATION: 10 Minutes`);
    console.log('='.repeat(50) + '\n');
    
    // Simulate network delay
    return new Promise(resolve => setTimeout(resolve, 500));
};

module.exports = {
    sendOtp
};
