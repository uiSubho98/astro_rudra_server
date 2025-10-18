import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { User } from "../../models/user.model.js";
import bcrypt from "bcrypt";
import { validatePhoneNumber } from "../../utils/validatePhoneNumber.js";
import { sendOTP } from "../../utils/sendOtp.js";
import { validateOTP } from "../../utils/validateOtp.js";
import { Astrologer } from "../../models/astrologer.model.js";
import { uploadOnCloudinary } from "../../middlewares/cloudinary.setup.js";
import fs from "fs";
import AgoraAccessToken from "agora-access-token";
import { startCall } from "./callController.js";
import mongoose from "mongoose";
export const registerUser = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      gender,
      password,
      photo,
    } = req.body;

    // Check for required fields (all except photo)
    if (
      !name ||
      !email ||
      !phone ||
      !dateOfBirth ||
      !timeOfBirth ||
      !placeOfBirth ||
      !gender ||
      !password
    ) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, null, "All fields except photo are required.")
        );
    }

    if (!validatePhoneNumber(phone)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid phone number format."));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res
        .status(201)
        .json(new ApiResponse(400, null, "User already registered"));
    }
    const existingAstrologer = await Astrologer.findOne({ phone });
    if (existingAstrologer) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            201,
            null,
            "This number is already used by an astrologer"
          )
        );
    }
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Upload new avatar to Cloudinary
    let avatarUrl = photo;

    // Create new user
    const newUser = await User.create({
      name,
      email,
      phone,
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      gender,
      photo: req.body.photo ? avatarUrl : "", // Save photo URL directly
      password: hashedPassword,
    });

    // Generate tokens
    const accessToken = newUser.generateAccessToken();
    const refreshToken = newUser.generateRefreshToken();

    // Save refresh token
    newUser.refreshToken = refreshToken;
    await newUser.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
          user: {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            dateOfBirth: newUser.dateOfBirth,
            timeOfBirth: newUser.timeOfBirth,
            placeOfBirth: newUser.placeOfBirth,
            gender: newUser.gender,
            phone: newUser.phone,
            walletBalance: newUser.walletBalance,
            Free_Chat_Available: newUser.Free_Chat_Available,
            followed_astrologers: newUser.followed_astrologers,
            consultations: newUser.consultations,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
            __v: newUser.__v,
            photo: newUser.photo,
          },
        },
        "User registered successfully."
      )
    );
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Something went wrong. Please try again.")
      );
  }
});

export const userLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;
    // console.log({ phone, password });
    // Check if both fields are provided
    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "Phone and password are required." });
    }
    if (!validatePhoneNumber(phone)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid phone number format."));
    }

    console.log(validatePhoneNumber(phone));

    // Find astrologer by phone
    const user = await User.findOne({ phone });
    if (!user) {
      const response = res
        .status(200)
        .json(new ApiResponse(401, { user: {} }, "User Not Found"));

      return response;
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const response = res
        .status(200)
        .json(new ApiResponse(401, { user: {} }, "Incorrect Password"));

      return response;
    }

    // Set available to true on login
    user.available = true;

    // Generate access and refresh tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save the refresh token to the database (optional but recommended)
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    user.photo = "https://www.google.com/";

    await user.save();

    // Respond with tokens and success message
    res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            dateOfBirth: user.dateOfBirth,
            timeOfBirth: user.timeOfBirth,
            placeOfBirth: user.placeOfBirth,
            gender: user.gender,
            phone: user.phone,
            walletBalance: user.walletBalance,
            Free_Chat_Available: user.Free_Chat_Available,
            followed_astrologers: user.followed_astrologers,
            consultations: user.consultations,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            __v: user.__v,
            photo: user.photo,
          },
        },
        "User Login Successfully"
      )
    );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Server error. Please try again later."));
  }
};

export const userLogout = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    user.refreshToken = null;
    user.accessToken = null;
    await user.save();

    return res.status(200).json({
      message: "Logout successful",
      success: true,
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
});

export const changePassword = async (req, res) => {
  try {
    const { userId } = req.params; // assuming the astrologer's ID is passed as a route parameter
    const { currentPassword, newPassword } = req.body;

    // Check if both current and new passwords are provided
    if (!currentPassword || !newPassword) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            {},
            "Both current and new passwords are required.."
          )
        );
    }

    // Check if both current and new passwords are the same
    if (currentPassword === newPassword) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            {},
            "New password must be different from the current password."
          )
        );
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(new ApiResponse(404, {}, "User not found"));
    }

    // Verify the current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json(new ApiResponse(401, {}, "Current password is incorrect."));
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the astrologer's password
    user.password = hashedPassword;
    await user.save();

    // Respond with success message
    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Password changed successfully."));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Something went wrong. Please try again.")
      );
  }
};

export const forgetPassword = asyncHandler(async (req, res) => {
  try {
    const { phone, role } = req.body;
    console.log({ phone, role });
    if (role !== "user") {
      return res.status(400).json(new ApiResponse(400, null, "Invalid user"));
    }
    // Validate the phone number
    if (!validatePhoneNumber(phone)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid phone number format."));
    }

    // Check if an astrologer exists with the given phone number
    const user = await User.findOne({ phone });

    if (!user) {
      return res
        .status(201)
        .json(
          new ApiResponse(201, null, "No User found with this phone number.")
        );
    }

    // If astrologer exists, send OTP
    const otpResponse = await sendOTP(phone);

    if (!otpResponse) {
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to send OTP."));
    }

    // console.log(otpResponse)

    // Return success response with ApiResponse
    return res
      .status(200)
      .json(
        new ApiResponse(
          otpResponse.data.responseCode,
          otpResponse.data,
          otpResponse.data.message
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "An error occurred while processing the request."
        )
      );
  }
});

export const validateloginOtp = asyncHandler(async (req, res) => {
  try {
    const { phone, verificationId, code } = req.body;

    // Ensure all necessary data is provided
    if (!phone || !verificationId || !code) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Phone, verificationId, and code are required."
          )
        );
    }

    // Call the validateOTP function
    const response = await validateOTP(phone, verificationId, code);

    // Find astrologer by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Set available to true on login
    user.available = true;

    // Generate access and refresh tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save the refresh token to the database (optional but recommended)
    user.refreshToken = refreshToken;

    user.save();

    // Check the response and return appropriate message
    if (response.success) {
      console.log("Here is my code");
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              dateOfBirth: user.dateOfBirth,
              timeOfBirth: user.timeOfBirth,
              placeOfBirth: user.placeOfBirth,
              gender: user.gender,
              phone: user.phone,
              walletBalance: user.walletBalance,
              Free_Chat_Available: user.Free_Chat_Available,
              followed_astrologers: user.followed_astrologers,
              consultations: user.consultations,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              __v: user.__v,
              photo: user.photo,
            },
          },
          "User Login Successfully"
        )
      );
    } else {
      return res
        .status(201)
        .json(new ApiResponse(201, response.data, "OTP validation failed."));
    }
  } catch (error) {
    console.error("Error in OTP validation controller:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "An error occurred while validating OTP.")
      );
  }
});

export const validateOtp = asyncHandler(async (req, res) => {
  try {
    const { phone, verificationId, code } = req.body;

    // Ensure all necessary data is provided
    if (!phone || !verificationId || !code) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Phone, verificationId, and code are required."
          )
        );
    }

    // Call the validateOTP function
    const response = await validateOTP(phone, verificationId, code);

    // Check the response and return appropriate message
    if (response.success) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, response.data, "OTP validated successfully.")
        );
    } else {
      return res
        .status(201)
        .json(new ApiResponse(201, response.data, "OTP validation failed."));
    }
  } catch (error) {
    console.error("Error in OTP validation controller:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "An error occurred while validating OTP.")
      );
  }
});

export const updatePassword_user = asyncHandler(async (req, res) => {
  try {
    const { phone, newPassword } = req.body;

    // Check if phone and newPassword are provided
    if (!phone || !newPassword) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Phone number and new password are required."
          )
        );
    }

    // Find astrologer by phone number
    const user = await User.findOne({ phone });
    // If astrologer not found
    if (!user) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "User not found."));
    }

    // Check if the new password is the same as the old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "New password cannot be the same as the old0 password."
          )
        );
    }

    // Hash the new password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update astrologer's password with the hashed password
    user.password = hashedPassword;

    // Save the updated astrologer
    await user.save();

    // Send success response
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Password updated successfully."));
  } catch (error) {
    console.error("Error updating password:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "An error occurred while updating the password."
        )
      );
  }
});

export const getuserById = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if both fields are provided
    if (!userId) {
      return res.status(400).json({ message: "userId  are required." });
    }

    // Find astrologer by phone
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Respond with tokens and success message
    res.status(200).json(new ApiResponse(200, user, "User Login Successfully"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Server error. Please try again later."));
  }
};

export const updateUserById = async (req, res) => {
  try {
    const { userId, updates } = req.body;

    console.log("Received update request:", { updates, userId });

    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Validate userId format

    // Ensure phone number is not updated
    if (updates && updates.phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number cannot be updated.",
      });
    }

    // Create a clean updates object by removing null, empty, or undefined values
    const cleanUpdates = {};
    if (updates) {
      Object.keys(updates).forEach((key) => {
        const value = updates[key];
        // Only include non-empty, non-null values
        if (value !== null && value !== undefined && value !== "") {
          // For string fields, also check if not empty after trim
          if (typeof value === "string" && value.trim() !== "") {
            cleanUpdates[key] = value.trim();
          } else if (typeof value !== "string") {
            cleanUpdates[key] = value;
          }
        }
      });
    }

    // Check if there are any valid updates after cleaning
    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid updates provided.",
      });
    }

    console.log("Cleaned updates:", cleanUpdates);

    // Find and update the user
    const updatedUser = await User.findByIdAndUpdate(userId, cleanUpdates, {
      new: true, // Return the updated document
      runValidators: true, // Ensure the updates follow the schema's validation rules
    }).select("-password -refreshToken"); // Exclude sensitive fields

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "User updated successfully."));
  } catch (error) {
    console.error("Update user error:", error);

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate field value entered. This value already exists.",
      });
    }

    res
      .status(500)
      .json(new ApiResponse(500, {}, "Server error. Please try again later."));
  }
};

export const starCall = async (req, res) => {
  try {
    const { channelName, uid, userId, astrologerId } = req.body;

    if (!channelName || uid === undefined) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "channelName and uid are required."));
    }
    const user = await User.findById(userId);
    const astrologer = await Astrologer.findById(astrologerId);
    const role = AgoraAccessToken.RtcRole.PUBLISHER;
    const expireTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTimeInSeconds;
    const AGORA_APP_ID = process.env.AGORAAPPID;
    const AGORA_APP_CERTIFICATE = process.env.AGORACERTIFICATE;
    const token = AgoraAccessToken.RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      parseInt(uid),
      role,
      privilegeExpiredTs
    );
    console.log({ token });
    return res
      .status(200)
      .json(
        new ApiResponse(200, { token }, "Agora token generated successfully.")
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Server error. Please try again later."));
  }
};
export const deleteUserById = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    // Find and delete the user
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "User not found."));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "User deleted successfully."));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Server error. Please try again later.")
      );
  }
}); // this will modify in future

// new flow changing

// controllers/otpController.js

export const handleSendOTP = async (req, res) => {
  const { phoneNumber } = req.body;
  console.log({ phoneNumber });
  if (!phoneNumber) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number is required" });
  }

  try {
    // Check if the user already exists with this phone number
    const existingUser = await User.findOne({ phone: phoneNumber });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already registered with this phone number",
      });
    }

    // If not registered, proceed to send OTP
    const result = await sendOTP(phoneNumber);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error("OTP send error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const handleValidateOTPAndRegister = async (req, res) => {
  const { phoneNumber, verificationId, code } = req.body;

  if (!phoneNumber || !verificationId || !code) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    const result = await validateOTP(phoneNumber, verificationId, code);

    if (!result.success) {
      return res.status(401).json(result);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone: phoneNumber });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "Phone number already registered" });
    }

    // Register new user with phone number only
    const newUser = await User.create({
      phone: phoneNumber,
    });

    // Generate tokens
    const accessToken = newUser.generateAccessToken();
    const refreshToken = newUser.generateRefreshToken();

    // Save refresh token
    newUser.refreshToken = refreshToken;
    await newUser.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
          user: {
            _id: newUser._id,
            phone: newUser.phone,
            walletBalance: newUser.walletBalance,
            Free_Chat_Available: newUser.Free_Chat_Available,
            followed_astrologers: newUser.followed_astrologers,
            consultations: newUser.consultations,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
            __v: newUser.__v,
            photo: newUser.photo || "",
          },
        },
        "User registered successfully."
      )
    );
  } catch (error) {
    console.error("OTP Validation or User Creation Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
