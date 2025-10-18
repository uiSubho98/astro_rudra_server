import axios from "axios";

export const sendOTP = async (phoneNumber) => {
  const url = `https://cpaas.messagecentral.com/verification/v3/send?countryCode=91&customerId=C-9FC5B043F23D48A&flowType=SMS&mobileNumber=${phoneNumber}`;

  // Replace this with your actual token
  const authToken =
    "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLTlGQzVCMDQzRjIzRDQ4QSIsImlhdCI6MTc1NzEwMDg5NywiZXhwIjoxOTE0NzgwODk3fQ.8D4ePhEnjegiOUrSwlg5ZcUuueSOkvk0SLmtD1UNZ1zM6w1vBJyQS7nDb89cEOyvjmVZjxv5jVn6XQHaXOMOLA";

  try {
    // Send the request to the API to send OTP
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          authToken: authToken, // Use actual token here
        },
      }
    );

    // Check if the response was successful
    if (response.data.responseCode === 200) {
      console.log("OTP sent successfully!", response.data);
      return { success: true, data: response.data };
    } else {
      console.error("Failed to send OTP:", response.data);
      return { success: false, data: response.data };
    }
  } catch (error) {
    // Handle errors properly by checking error.response
    console.error(
      "Error sending OTP:",
      error.response ? error.response.data : error.message
    );
    return {
      success: false,
      data: error.response ? error.response.data : error.message,
    };
  }
};
