import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { Astrologer } from "../../models/astrologer.model.js"; // Path to your astrologer model
import ChatRoom from "../../models/chatRoomSchema.js";
import mongoose from "mongoose";
import moment from "moment-timezone";
import { Language } from "../../models/language.model.js";

// Controller to get all astrologers with pagination
// controllers/astrologer.controller.js

export const getAllAstrologers = asyncHandler(async (req, res) => {
  const { page = 1, size = 10 } = req.query;
  const pageNumber = Math.max(1, parseInt(page, 10));
  const pageSize = Math.max(1, parseInt(size, 10));

  const priorityIds = [
    "68b82ab962b9905ae81f3612",
    "68b97f3962b9905ae81fc57d",
    "68b97c0862b9905ae81fc422",
    "68cbe63a4fe2e1ca4c46854f",
    "68b979a162b9905ae81fc30f",
    "68b97cfb62b9905ae81fc489",
    "68b8295d62b9905ae81f357d",
    "68b97e1e62b9905ae81fc504"
  ];

  const priorityObjectIds = priorityIds.map((id) => new mongoose.Types.ObjectId(id));

  try {
    // 1️⃣ Get total count (excluding priority astrologers for pagination)
    const totalNonPriorityCount = await Astrologer.countDocuments({
      _id: { $nin: priorityObjectIds },
      status: { $in: ["available", "busy", "offline"] },
    });

    let astrologers = [];

    if (pageNumber === 1) {
      // 2️⃣ For page 1: Get all priority astrologers + remaining to fill pageSize
      const priorityAstrologers = await Astrologer.find({
        _id: { $in: priorityObjectIds },
        status: { $in: ["available", "busy", "offline"] },
      })
      .sort({ createdAt: -1 })
      .lean();

      const remainingSlots = Math.max(0, pageSize - priorityAstrologers.length);
      
      const remainingAstrologers = await Astrologer.find({
        _id: { $nin: priorityObjectIds },
        status: { $in: ["available", "busy", "offline"] },
      })
      .sort({ createdAt: -1 })
      .limit(remainingSlots)
      .lean();

      astrologers = [...priorityAstrologers, ...remainingAstrologers];
    } else {
      // 3️⃣ For other pages: Skip priority astrologers and calculate offset
      const skipCount = (pageNumber - 1) * pageSize - priorityObjectIds.length;
      
      astrologers = await Astrologer.find({
        _id: { $nin: priorityObjectIds },
        status: { $in: ["available", "busy", "offline"] },
      })
      .sort({ createdAt: -1 })
      .skip(Math.max(0, skipCount))
      .limit(pageSize)
      .lean();
    }

    if (!astrologers || astrologers.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No astrologers found."));
    }

    // Extract all unique language IDs
    const allLanguageIds = [];
    astrologers.forEach((a) => {
      if (a.languages && Array.isArray(a.languages)) {
        a.languages.forEach((langId) => {
          if (langId && !allLanguageIds.includes(langId.toString())) {
            allLanguageIds.push(langId.toString());
          }
        });
      }
    });

    // Fetch all languages
    const languages = await Language.find({
      _id: { $in: allLanguageIds },
    })
      .select("name _id")
      .lean();

    const languageMap = {};
    languages.forEach((lang) => {
      languageMap[lang._id.toString()] = lang.name;
    });

    // Transform astrologer data
    const transformedAstrologers = astrologers.map((a) => {
      const transformed = { ...a };
      if (a.languages && Array.isArray(a.languages)) {
        transformed.languages = a.languages
          .map((langId) => languageMap[langId.toString()] || "Unknown Language")
          .filter((name) => name !== "Unknown Language");
      }
      if (a.selected_language_id) {
        transformed.selected_language_name =
          languageMap[a.selected_language_id.toString()] || "Unknown Language";
        delete transformed.selected_language_id;
      }
      return transformed;
    });

    // Calculate total pages based on non-priority astrologers
    const totalPages = Math.ceil((totalNonPriorityCount + priorityObjectIds.length) / pageSize);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalCount: totalNonPriorityCount + priorityObjectIds.length,
          totalPages,
          currentPage: pageNumber,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
          astrologers: transformedAstrologers,
        },
        "Astrologers fetched successfully."
      )
    );
  } catch (error) {
    console.error("Error while fetching astrologers:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Server error while fetching astrologers.")
      );
  }
});
export const getActiveById = async (req, res) => {
  try {
    const { astrologerId } = req.body;

    // Check if both fields are provided
    if (!astrologerId) {
      return res.status(400).json({ message: "astrologerId  are required." });
    }

    // Find astrologer by phone
    //   const chatrooms = await ChatRoom.find({ astrologer: astrologerId,status: "active" });

    const chatrooms = await ChatRoom.aggregate([
      {
        $match: {
          astrologer: new mongoose.Types.ObjectId(astrologerId),
        },
      },
      {
        $lookup: {
          from: "users", // Name of the User collection
          localField: "user", // Field in ChatRoom to match
          foreignField: "_id", // Field in User to match
          as: "userDetails", // Output array field
        },
      },
      {
        $project: {
          _id: 1,
          astrologer: 1,
          status: 1,
          user: 1,
          isUserJoined: 1,
          chatRoomId: 1,
          createdAt: 1,
          updatedAt: 1,
          rejectedBy: 1,
          isAstrologerJoined: 1,
          avatar: { $arrayElemAt: ["$userDetails.photo", 0] },
          username: {
            $arrayElemAt: ["$userDetails.name", 0],
          },
        },
      },
    ]);

    if (!chatrooms) {
      return res.status(404).json({ message: "chatrooms not found." });
    }

    // Respond with tokens and success message
    res
      .status(200)
      .json(new ApiResponse(200, chatrooms, "chatrooms List Successfully"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Server error. Please try again later."));
  }
};

export const getAllAstrologersByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.body;

  // Validate categoryId exists
  if (!categoryId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Category ID is required."));
  }

  // Validate categoryId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid Category ID format."));
  }

  try {
    // Find astrologers where the category array contains the requested categoryId
    const astrologers = await Astrologer.find({
      category: new mongoose.Types.ObjectId(categoryId), // Updated to match your document structure
    }).select("-password -refreshToken"); // Exclude sensitive fields

    // If no astrologers are found
    if (!astrologers || astrologers.length === 0) {
      return res
        .status(200) // Changed from 404 to 200 with empty array
        .json(
          new ApiResponse(
            200,
            { astrologers: [] },
            "No astrologers found for this category."
          )
        );
    }

    // Respond with success and the filtered astrologers
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          astrologers, // Removed pagination fields since you don't need them
        },
        "Astrologers fetched successfully by category."
      )
    );
  } catch (error) {
    console.error("Error while fetching astrologers by category:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "Server error while fetching astrologers by category."
        )
      );
  }
});
