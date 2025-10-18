import { asyncHandler } from "../../utils/asyncHandler.js";
import { Astrologer } from "../../models/astrologer.model.js";
import Review from "../../models/review.model.js";
import ChatRoom from "../../models/chatRoomSchema.js";

export const toggle_Offline_Online = asyncHandler(async (req, res) => {
  try {
    const { astrologerId, available_status } = req.body;
    console.log({ astrologerId, available_status });

    // Find the astrologer by astrologerId
    const astrologer = await Astrologer.findById(astrologerId);
    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    if (available_status === "offline") {
      // Check if the astrologer has any active chat rooms
      const activeChatRoom = await ChatRoom.findOne({
        astrologer: astrologerId,
        status: "active",
      });

      if (activeChatRoom) {
        return res.status(400).json({
          message:
            "Cannot go offline. Please end your active chat session first.",
        });
      }

      // Update offline state
      astrologer.available = {
        isAvailable: false,
        isCallAvailable: false,
        isChatAvailable: false,
        isVideoCallAvailable: false,
      };
      astrologer.isOffline = true;
      astrologer.status = "offline"; // 🔹 add this line
    } else if (available_status === "online") {
      astrologer.available = {
        isAvailable: true,
        isCallAvailable: true,
        isChatAvailable: true,
        isVideoCallAvailable: true,
      };
      astrologer.isOffline = false;
      astrologer.status = "available"; // 🔹 ensure status is set correctly
    }

    await astrologer.save();

    res.status(200).json({
      message: "Astrologer availability updated successfully",
      astrologer,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get Astrologer by ID
export const getAstrologerById = asyncHandler(async (req, res) => {
  try {
    const { astrologerId } = req.params;
    console.log({ astrologerId });
    // Find the astrologer by ID
    const astrologer = await Astrologer.findById(astrologerId);

    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    // Fetch reviews for this astrologer and populate the user's name
    const reviews = await Review.find({ astrologerId })
      .populate({
        path: "userId", // Populate the `userId` field in the review
        select: "name", // Only fetch the `name` field from the User collection
      })
      .sort({ createdAt: -1 }) // Sort by `createdAt` in descending order (most recent first)
      .limit(8); // Limit the result to the last 8 reviews

    // Prepare the review data with user names
    const reviewsWithUserNames = reviews.map((review) => ({
      comment: review.comment,
      rating: review.rating,
      userName: review.userId.name, // Replace userId with the user's name
    }));

    // Respond with astrologer data and reviews inside the astrologer object
    res.status(200).json({
      message: "Astrologer fetched successfully",
      astrologer: {
        ...astrologer.toObject(), // Spread the astrologer data
        reviews: reviewsWithUserNames, // Add reviews directly inside astrologer object
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update Astrologer by ID
export const updateAstrologerById = asyncHandler(async (req, res) => {
  try {
    const { astrologerId } = req.params;

    // Find the astrologer by _id
    const astrologer = await Astrologer.findById(astrologerId);

    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    // Update the astrologer's data with the request body
    const updatedAstrologer = await Astrologer.findByIdAndUpdate(
      astrologerId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Astrologer updated successfully",
      astrologer: updatedAstrologer,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//check status
export const checkAstrologerSocketStatus = asyncHandler(async (req, res) => {
  try {
    const { astrologerId } = req.body;

    if (!astrologerId) {
      return res.status(400).json({ message: "Astrologer ID is required" });
    }

    // Find the astrologer by ID and only select the socketId field
    const astrologer =
      await Astrologer.findById(astrologerId).select("socketId");

    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    // Check if socketId exists and is not empty
    const isPresent = !!astrologer.socketId;

    res.status(200).json({
      success: true,
      isPresent,
      message: isPresent
        ? "Astrologer has active socket connection"
        : "Astrologer has no active socket connection",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});
