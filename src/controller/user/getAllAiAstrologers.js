import { asyncHandler } from "../../utils/asyncHandler.js";
import { chat_with_ai_astro } from "../../utils/chat_with_ai_astro.js";
import { AI_Astro_Chat } from "../../models/ai_astro_chat.model.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { AI_Astrologer } from "../../models/ai_astrologer_model.js";
import mongoose from "mongoose";

export const fetch_ai_astro_chats = asyncHandler(async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;

    // Validate and convert dates
    let filter = {};
    if (fromDate && toDate) {
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, null, "Invalid date format. Use YYYY-MM-DD.")
          );
      }

      // Set start of the day for fromDate and end of the day for toDate
      startDate.setHours(0, 0, 0, 0); // Start of the day
      endDate.setHours(23, 59, 59, 999); // End of the day

      filter.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Fetch chats based on date range
    const user_chats = await AI_Astro_Chat.find(filter)
      .populate("userId aiAstroId")
      .sort({ createdAt: -1 });

    // Handle empty results
    if (!user_chats || user_chats.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            [],
            "No chat records found for the specified date range."
          )
        );
    }

    // Return successful response
    return res
      .status(200)
      .json(
        new ApiResponse(200, user_chats, "Chat history fetched successfully.")
      );
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal Server Error"));
  }
});

export const fetch_all_ai_astrologers = asyncHandler(async (req, res) => {
  try {
    const excludeId = new mongoose.Types.ObjectId("689b7892f81b584068a7f22f");

    // Fetch astrologers excluding the given _id
    const astrologers = await AI_Astrologer.find({
      isVerified: true,
      _id: { $ne: excludeId },
    });

    console.log({ astrologers });
    console.log("111111111111111111111111111111111111111111");
    if (!astrologers || astrologers.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No astrologers found."));
    }

    return res.json(
      new ApiResponse(200, astrologers, "Astrologers fetched successfully.")
    );
  } catch (error) {
    console.error("Error fetching astrologers:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch astrologers."));
  }
});

export const fetch_ai_astro_by_id = asyncHandler(async (req, res) => {
  try {
    const { astroId } = req.params;

    // Validate astroId
    if (!astroId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Astrologer ID is required."));
    }

    // Fetch the astrologer details by ID
    const astrologer = await AI_Astrologer.findById(astroId);

    // Handle astrologer not found
    if (!astrologer) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Astrologer not found."));
    }

    // Return the astrologer details
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          astrologer,
          "Astrologer details fetched successfully."
        )
      );
  } catch (error) {
    console.error("Error fetching astrologer by ID:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch astrologer details."));
  }
});
