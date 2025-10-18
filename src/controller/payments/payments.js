// import { User } from "../../models/user.model.js"; // Uncomment and adjust model name/path accordingly
import axios from "axios";
import crypto from "crypto";
import { Admin } from "../../models/adminModel.js";
import { AdminWallet } from "../../models/adminWallet.js";
import { User } from "../../models/user.model.js";
import { Wallet } from "../../models/walletSchema.model.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import Notification from "../../models/notifications.model.js";

export const payuSuccess = asyncHandler(async (req, res) => {
  const {
    key,
    txnid,
    amount,
    status,
    firstname,
    email,
    phone,
    productinfo,
    udf1, // userId
    hash,
  } = req.body;

  console.log("✅ Payment Success Payload:", req.body);
  const salt = "be69FGy54g7iLgRmOo0aWr89AoYSFZuF";
  try {
    // 1. Verify the payment with PayU
    const verificationResponse = await verifyPayuPayment(
      txnid,
      key,
      salt,
      false
    ); // true = test env

    const txnDetails = verificationResponse?.transaction_details?.[txnid];
    console.log({ txnDetails });

    if (!txnDetails || txnDetails.status !== "success") {
      throw new Error("Payment verification failed");
    }

    // 2. Update user wallet (using your existing function)
    await addWalletBalance({
      phone: phone,
      transaction_id: txnid,
      amount: parseFloat(amount),
      amount_type: "credit",
    }); // Pass res for proper response handling

    // 3. Prepare deep link with all necessary parameters

    // 4. Send success response with redirect
    return res.status(200).set("Cache-Control", "no-store").send(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Payment Success</title>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          margin-top: 100px;
          background-color: #f0fff4;
        }
        h2 {
          color: #22c55e;
        }
        
        .info {
          font-size: 16px;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <h2>✅ Payment Successful!</h2>
      <div class="info">
        <p><strong>Transaction ID:</strong> ${txnid}</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>Status:</strong> Verified</p>
        <p>Thank you for your payment.</p>
      </div>
    </body>
  </html>
`);
  } catch (error) {
    console.error("Payment processing error:", error);

    // Fallback deep link for failure cases
    const errorDeepLink = `astrobandhan://payment-failure?txnid=${txnid}&reason=verification_failed`;

    return res.status(200).set("Cache-Control", "no-store").send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="5;url=${errorDeepLink}">
          <title>Payment Error</title>
        </head>
        <body style="text-align:center; margin-top:100px; background-color:#fff0f0;">
          <h2 style="color:red;">❌ Payment Processing Error</h2>
          <p>We encountered an issue verifying your payment.</p>   
        </body>
      </html>
    `);
  }
});

export const payuSuccessTemplate = asyncHandler(async (req, res) => {
  const { txnid, amount, status } = req.body; // PayU posts data here

  return res.status(200).set("Cache-Control", "no-store").send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Success</title>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin-top: 100px;
              background-color: #f0fff4;
            }
            h2 {
              color: #22c55e;
            }
            .info {
              font-size: 16px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <h2>✅ Payment Successful!</h2>
          <div class="info">
            <p><strong>Transaction ID:</strong> ${txnid || "N/A"}</p>
            <p><strong>Amount:</strong> ₹${amount || "0.00"}</p>
            <p><strong>Status:</strong> ${status || "Verified"}</p>
            <p>Thank you for your payment.</p>
          </div>
        </body>
      </html>
  `);
});

export const payuFailure = asyncHandler(async (req, res) => {
  console.log("❌ Payment Failure Payload:", req.body);

  return res.status(200).set("Cache-Control", "no-store").send(`
    <html>
      <head>
        <title>Payment Failed</title>
        <meta charset="utf-8" />
        <script>
          // Redirect to app after 2 seconds
          setTimeout(function() {
            window.location.href = "astrobandhan://payment-failure";
          }, 2000);
        </script>
      </head>
      <body style="text-align:center; margin-top:100px; font-family:Arial;">
        <h2>❌ Payment Failed!</h2>
      </body>
    </html>
  `);
});

//helper function to verify payment with PayU
// PayU Verification Function
const verifyPayuPayment = async (txnid, key, salt, isTestEnv = false) => {
  const command = "verify_payment";
  const stringToHash = `${key}|${command}|${txnid}|${salt}`;
  console.log("🔐 Raw String to Hash:", `"${stringToHash}"`);
  const hash = crypto.createHash("sha512").update(stringToHash).digest("hex");
  console.log("🔍 Verifying PayU Payment:", hash);
  console.log("key:", key);
  console.log("command:", command);
  console.log("txnid:", txnid);
  console.log("salt:", salt);
  const url = isTestEnv
    ? "https://test.payu.in/merchant/postservice.php?form=2"
    : "https://info.payu.in/merchant/postservice.php?form=2";

  const formData = new URLSearchParams();
  formData.append("key", key);
  formData.append("command", command);
  formData.append("var1", txnid);
  formData.append("hash", hash);

  try {
    const response = await axios.post(url, formData.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return response.data; // You can drill into response as needed
  } catch (error) {
    console.error(
      "❌ PayU verification failed:",
      error.response?.data || error.message
    );
    throw new Error("PayU verification failed");
  }
};

//helper function to add wallet balance
// utils/walletService.js

const addWalletBalance = async (
  { phone, transaction_id, amount, amount_type },
  io = null,
  activeUsers = {}
) => {
  console.log({ phone, transaction_id, amount, amount_type });
  // Validate input parameters
  if (!phone || !transaction_id || !amount || !amount_type) {
    throw new Error("All fields are required");
  }

  // Remove 18% GST from the amount to get the base price
  const baseAmount = amount / 1.18;
  const gstAmount = amount - baseAmount;

  console.log(
    `Original amount: ${amount}, Base amount (after GST removal): ${baseAmount.toFixed(2)}, GST: ${gstAmount.toFixed(2)}`
  );

  // Check if user exists
  const user = await User.findOne({ phone });
  if (!user) {
    throw new Error("User not found");
  }

  const BONUS_MAP = {
    1: 1,
    25: 25, // No bonus
    50: 75, // +25 bonus
    100: 150, // +50 bonus
    199: 300, // +101 bonus
    500: 750, // 50% bonus
    1000: 1060, // 6% bonus
    2000: 2220, // 11% bonus
    3000: 3330, // 11% bonus
    5000: 5700, // 14% bonus
  };

  // Use the base amount (without GST) for bonus calculation
  const creditedAmount = BONUS_MAP[baseAmount] || baseAmount;

  if (amount_type === "credit") {
    await User.findByIdAndUpdate(user._id, {
      $inc: { walletBalance: creditedAmount },
    });
  }

  // Create wallet transaction record with both amounts
  const walletDoc = new Wallet({
    user_id: user._id,
    amount: baseAmount, // Base amount without GST
    original_amount: amount, // Original amount with GST
    gst_amount: gstAmount, // GST portion
    transaction_id,
    transaction_type: amount_type,
    credit_type: "wallet_recharge",
  });

  // Create admin wallet record
  const adminWalletDoc = new AdminWallet({
    service_id: transaction_id,
    userId: user._id,
    amount: baseAmount, // Base amount without GST
    original_amount: amount, // Original amount with GST
    gst_amount: gstAmount, // GST portion
    transaction_id,
    transaction_type: amount_type,
    credit_type: "wallet_recharge",
  });

  // Update admin balance using base amount (without GST)
  const admins = await Admin.find({});
  const admin = admins[0];
  admin.adminWalletBalance += baseAmount;
  await admin.save();

  // Save both documents
  await Promise.all([walletDoc.save(), adminWalletDoc.save()]);

  // Create and save notification
  const notification = new Notification({
    userId: user._id,
    message: [
      {
        title: amount_type === "credit" ? "Coin Credited" : "Coin Debited",
        desc: `${creditedAmount} coins have been ${amount_type === "credit" ? "credited to" : "debited from"} your wallet (Base: ${baseAmount.toFixed(2)} + Bonus: ${(creditedAmount - baseAmount).toFixed(2)})`,
      },
    ],
  });
  await notification.save();

  return {
    wallet: walletDoc,
    adminWallet: adminWalletDoc,
    gstDetails: {
      originalAmount: amount,
      baseAmount: baseAmount,
      gstAmount: gstAmount,
    },
  };
};
