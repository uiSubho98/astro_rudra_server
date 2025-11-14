import Call from "../../../models/call.model.js";
import ChatRoom from "../../../models/chatRoomSchema.js";
import { ApiResponse } from "../../../utils/apiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

export const getChatRoomsByFilter = asyncHandler(async (req, res) => {
  try {
    const { fromDate, toDate, status } = req.body;

    // Validate status
    const validStatuses = [
      "pending",
      "confirmed",
      "active",
      "rejected",
      "ended",
    ];
    if (status && !validStatuses.includes(status)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid status value."));
    }

    // Validate date inputs
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "fromDate and toDate are required."));
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999); // Include full day

    // Build query dynamically
    const query = {
      createdAt: { $gte: from, $lte: to },
    };

    if (status) query.status = status;

    // Fetch data
    const chatRooms = await ChatRoom.find(query)
      .populate("user", "name phone email")
      .populate("astrologer", "name phone email")
      .sort({ createdAt: -1 });

    // ✅ FIX: Return 200 with empty array instead of 404
    return res
      .status(200)
      .json(
        new ApiResponse(
          200, 
          chatRooms, 
          chatRooms.length 
            ? "Chat rooms fetched successfully." 
            : "No chat rooms found for given filters."
        )
      );
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "An error occurred while fetching chat room data."
        )
      );
  }
});

export const getCallsByFilter = asyncHandler(async (req, res) => {
  try {
    let { fromDate, toDate, status } = req.body;

    console.log({ fromDate, toDate, status });

    // ✅ Default to today's date if missing
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];
    if (!fromDate) fromDate = formattedToday;
    if (!toDate) toDate = formattedToday;

    // ✅ Convert date range
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999); // include full day

    // ✅ Normalize status (always lowercase)
    if (status) status = String(status).trim().toLowerCase();

    // ✅ Define valid statuses
    const validStatuses = ["ringing", "rejected", "ongoing", "ended"];

    // Validate status if provided
    if (status && !validStatuses.includes(status)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid status value."));
    }

    // ✅ Build query
    const query = {
      createdAt: { $gte: from, $lte: to },
    };
    if (status) query.status = status;

    // ✅ Fetch from DB
    const calls = await Call.find(query)
      .populate("userId", "name phone email")
      .populate("astrologerId", "name phone email")
      .sort({ createdAt: -1 });

    // ✅ FIX: Return 200 with empty array instead of 404
    return res
      .status(200)
      .json(
        new ApiResponse(
          200, 
          calls, 
          calls.length 
            ? "Calls fetched successfully." 
            : "No calls found for the given filters."
        )
      );
  } catch (error) {
    console.error("Error fetching calls:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "An error occurred while fetching call records."
        )
      );
  }
});