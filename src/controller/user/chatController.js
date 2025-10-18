import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import Chat from "../../models/chatSchema.js";
import ChatRoom from "../../models/chatRoomSchema.js";

export const fetchChatHistory = async (req, res) => {
  try {
    const { chatRoomId } = req.body;
    const chatData = await Chat.findOne({ chatRoomId });
    if (!chatData) {
      return res.status(200).json(new ApiResponse(400, null, "No Data Found"));
    } else {
      return res
        .status(200)
        .json(new ApiResponse(400, chatData, "Chat Data Found"));
    }
  } catch (error) {}
};

export const fetchChatHistoryById = asyncHandler(async (req, res) => {
  try {
    const { chatRoomId } = req.body;

    console.log({ chatRoomId });

    // Find chat room document
    const chatRoom = await ChatRoom.findById(chatRoomId);

    if (!chatRoom) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Chat room not found"));
    }

    // Find chat messages for this chat room
    const chatHistory = await Chat.find({
      chatRoomId: chatRoomId,
    }).sort({ "messages.timestamp": 1 });

    console.log({ chatHistory });

    // Prepare response data
    const responseData = {
      chatHistory,
      chatRoomDetails: {
        ...chatRoom._doc,
        // Convert timestamps to IST (UTC+5:30)
        startTime: convertToIST(
          getStatusTimestamp(chatRoom.statusLogs, "active")
        ),
        endedTime: convertToIST(
          getStatusTimestamp(chatRoom.statusLogs, "ended")
        ),
      },
    };

    console.log("Response Data:", responseData);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          responseData,
          "Chat history retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

// Helper function to get timestamp for a specific status
function getStatusTimestamp(statusLogs, targetStatus) {
  const statusEntry = statusLogs.find((log) => log.toStatus === targetStatus);
  return statusEntry ? statusEntry.timestamp : null;
}

// Helper function to convert date to IST (UTC+5:30)
function convertToIST(date) {
  if (!date) return null;

  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  return new Date(date).toLocaleString("en-IN", options);
}
export const fetchChatRoom_forUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body; // <-- get userId from payload

    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "User ID is required"));
    }

    // Find chat rooms for the user with status 'active' or 'pending'
    const chatRooms = await ChatRoom.find({
      user: userId,
      status: { $in: ["active", "pending"] },
    })
      .populate({
        path: "astrologer", // populate astrologer details
        select: "name avatar", // select fields you want from astrologer
      })
      .sort({ updatedAt: -1 }); // optional: latest chat first

    if (!chatRooms.length) {
      return res
        .status(200)
        .json(new ApiResponse(400, null, "No chat rooms found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, chatRooms, "Chat rooms retrieved successfully")
      );
  } catch (error) {
    console.error("Error fetching chat rooms for user:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});
