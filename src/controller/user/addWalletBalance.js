import { asyncHandler } from "../../utils/asyncHandler.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { Wallet } from "../../models/walletSchema.model.js";
import { activeUsers, io } from "../../utils/sockets/socket.js";
import { AdminWallet } from "../../models/adminWallet.js";
import Notification from "../../models/notifications.model.js";
import { Admin } from "../../models/adminModel.js";
import Order from "../../models/product/order.model.js";
import mongoose from "mongoose";

export const add_wallet_balance = asyncHandler(async (req, res) => {
  const { userId, amount, transaction_id, amount_type } = req.body;

  // Validate required fields
  if (!userId || !amount || !transaction_id || !amount_type) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "All fields are required: userId, amount, transaction_id, amount_type"
        )
      );
  }

  // Validate amount type
  if (amount_type !== "credit") {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "amount_type must be 'credit' for adding balance"
        )
      );
  }

  // Validate amount is positive
  if (amount <= 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Amount must be greater than 0"));
  }

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    // Check if transaction ID already exists to prevent duplicates
    const existingTransaction = await Wallet.findOne({ transaction_id });
    if (existingTransaction) {
      return res
        .status(409)
        .json(new ApiResponse(409, null, "Transaction ID already exists"));
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create wallet transaction
      const walletTransaction = new Wallet({
        user_id: userId,
        amount: amount,
        transaction_id: transaction_id,
        transaction_type: "credit",
        credit_type: "wallet_recharge",
      });

      await walletTransaction.save({ session });

      // Update user's wallet balance
      user.walletBalance = (user.walletBalance || 0) + amount;
      await user.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Return success response
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            newBalance: user.walletBalance,
            transaction: walletTransaction,
          },
          "Wallet balance added successfully"
        )
      );
    } catch (transactionError) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }
  } catch (error) {
    console.error("Error adding wallet balance:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Internal server error: " + error.message)
      );
  }
});
export const find_transaction_history_by_category = asyncHandler(
  async (req, res) => {
    try {
      const { userId, debit_type, amount_type } = req.body;

      console.log({ userId, debit_type, amount_type });

      // Validation for userId and at least one of debit_type or amount_type
      if (!userId) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "User ID is required."));
      }

      if (!debit_type && !amount_type) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              "At least one of debit_type or amount_type is required."
            )
          );
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json(new ApiResponse(404, {}, "User not found."));
      }

      // Find wallet transactions
      let transactions;
      if (amount_type === "all") {
        transactions = await Wallet.find({ user_id: userId })
          .sort({ createdAt: -1 })
          .exec(); // Execute query
      } else if (amount_type === "credit") {
        transactions = await Wallet.find({
          user_id: userId,
          transaction_type: amount_type,
        })
          .sort({ createdAt: -1 })
          .exec(); // Execute query
      } else {
        transactions = await Wallet.find({
          user_id: userId,
          transaction_type: amount_type,
          debit_type,
        })
          .sort({ createdAt: -1 })
          .exec(); // Execute query
      }
      const response = {
        transactions,
        balance: user.walletBalance, // Add the balance here
      };
      // Send response
      return res
        .status(200)
        .json(new ApiResponse(200, response, `Operation successfully done.`));
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json(
          new ApiResponse(
            500,
            {},
            "An error occurred while searching balance history."
          )
        );
    }
  }
);

export const get_orders_by_user = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(">>>>>>>>>>>>>>>>>>>");
    // console.log({ userId });
    console.log(">>>>>>>>>>>>>>>>>>>");
    // Validate userId
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User ID is required."));
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(new ApiResponse(404, {}, "User not found."));
    }

    // Find all orders for this user, sorted by newest first
    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).exec();

    return res
      .status(200)
      .json(new ApiResponse(200, orders, "Orders retrieved successfully."));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "An error occurred while fetching orders.")
      );
  }
});
