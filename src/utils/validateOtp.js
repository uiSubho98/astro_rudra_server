import axios from 'axios';

export const validateOTP = async (phoneNumber, verificationId, code) => {
    const url = `https://cpaas.messagecentral.com/verification/v3/validateOtp?countryCode=91&mobileNumber=${phoneNumber}&verificationId=${verificationId}&customerId=C-9FC5B043F23D48A&code=${code}`;

    // Replace with the actual token you use for authorization
    const authToken = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLTlGQzVCMDQzRjIzRDQ4QSIsImlhdCI6MTc1NzEwMDg5NywiZXhwIjoxOTE0NzgwODk3fQ.8D4ePhEnjegiOUrSwlg5ZcUuueSOkvk0SLmtD1UNZ1zM6w1vBJyQS7nDb89cEOyvjmVZjxv5jVn6XQHaXOMOLA';

    try {
        const response = await axios.get(url, {
            headers: {
                'authToken': authToken,
            },
        });


        if (response.data.responseCode === 200) {
            console.log('OTP validated successfully!');
            return { success: true, data: response.data };
        } else {
            console.error('Failed to validate OTP:', response.data.message);
            return { success: false, data: response.data };
        }
    } catch (error) {
        console.error('Error validating OTP:', error.response ? error.response.data : error.message);
        return { success: false, data: error.response ? error.response.data : error.message };
    }
};
