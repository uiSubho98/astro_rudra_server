import mongoose from "mongoose";
import { Astrologer } from "../../models/astrologer.model.js"; // Adjust the import path as needed
import { AstrologerWithdrawalRequest } from "../../models/withdrawl_request.model.js"; // Assuming you have the Withdrawal Request model
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createWithdrawalRequest = async (req, res) => {
  const { astrologerId, amount, withdrawalType, upiId, bankDetails } = req.body;

  try {
    // Validate input
    if (!astrologerId || !amount || !withdrawalType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Fetch the astrologer from the database
    const astrologer = await Astrologer.findById(astrologerId);
    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    // Validate amount against the astrologer's wallet balance
    if (amount < 1000) {
      return res
        .status(400)
        .json({ message: "Amount must be greater than or equal to 1000" });
    }

    if (amount > astrologer.walletBalance) {
      return res
        .status(400)
        .json({ message: "Insufficient balance in wallet" });
    }

    // Create a withdrawal request
    const withdrawalRequestData = {
      astrologerId,
      amount,
      withdrawalType,
      isPaymentDone: false, // Default value
      isApproved: "false", // Default value
    };

    if (withdrawalType === "upi") {
      if (!upiId) {
        return res
          .status(400)
          .json({ message: "UPI ID is required for UPI withdrawal" });
      }
      withdrawalRequestData.upiId = upiId;
    } else if (withdrawalType === "bank") {
      if (!bankDetails) {
        return res
          .status(400)
          .json({ message: "Bank details are required for bank withdrawal" });
      }
      withdrawalRequestData.bankDetails = bankDetails;
    } else {
      return res.status(400).json({ message: "Invalid withdrawal type" });
    }

    // Save the withdrawal request
    const newWithdrawalRequest = new AstrologerWithdrawalRequest(
      withdrawalRequestData
    );
    await newWithdrawalRequest.save();

    return res.status(201).json({
      message: "Withdrawal request created successfully",
      withdrawalRequest: newWithdrawalRequest,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all withdrawal requests
export const getAllWithdrawalRequests = asyncHandler(async (req, res) => {
  try {
    // Fetch all withdrawal requests and populate astrologer details
    const withdrawalRequests = await AstrologerWithdrawalRequest.find()
      .populate("astrologerId", "name email") // Populate astrologer's name and email
      .sort({ createdAt: -1 }); // Sort by latest first

    if (!withdrawalRequests.length) {
      return res.status(404).json({ message: "No withdrawal requests found" });
    }

    return res.status(200).json({
      message: "All withdrawal requests fetched successfully",
      data: withdrawalRequests,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});
export const getAllWithdrawalRequestsByAstroId = asyncHandler(
  async (req, res) => {
    const { astro_id } = req.body;
    console.log({ astro_id });
    try {
      if (!astro_id) {
        return res.status(400).json({ message: "astro_id is required" });
      }

      // Ensure astro_id is converted into a valid ObjectId
      const withdrawalRequests = await AstrologerWithdrawalRequest.find({
        astrologerId: new mongoose.Types.ObjectId(astro_id),
      })
        .populate("astrologerId", "name email") // Populate astrologer's name and email
        .sort({ createdAt: -1 }); // Latest first

      if (!withdrawalRequests.length) {
        return res
          .status(404)
          .json({ message: "No withdrawal requests found" });
      }

      return res.status(200).json({
        message: "All withdrawal requests fetched successfully",
        data: withdrawalRequests,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
  }
);
