import { Server as socketIo } from "socket.io"; // Named import for socket.io
import {
  createChatRoom,
  deductMoney,
  joinChatRoom,
  saveChatMessage,
} from "./chatHelper.js";
import ChatRoom from "../../models/chatRoomSchema.js";
import { ObjectId } from "bson";
import Chat from "../../models/chatSchema.js";
import moment from "moment-timezone";
import { User } from "../../models/user.model.js";
import { Astrologer } from "../../models/astrologer.model.js";
import { Wallet } from "../../models/walletSchema.model.js";
import {
  endCallAndLogTransaction,
  startCall,
} from "../../controller/user/callController.js";
import axios from "axios";
import AgoraAccessToken from "agora-access-token";
import { AdminWallet } from "../../models/adminWallet.js";
import { Admin } from "../../models/adminModel.js";
import Notification from "../../models/notifications.model.js";
import mongoose from "mongoose";

// Store connected users (active users map)
export let activeUsers = {}; // Store users by userId and socketId

let io; // Declare io variable to be initialized later

let chatIntervals = {}; // Store intervals for each chat room
let chatRoomParticipants = {}; // Store users in chat rooms
const chatStartTimes = {}; // To store start time of each chat room

// Helper function to check if both the user and astrologer are in the chat room
const isAllUsersJoined = (chatRoomId, userId, astrologerId) => {
  const participants = chatRoomParticipants[chatRoomId];
  console.log({ userId, astrologerId, chatRoomId });
  // Check if both user and astrologer are in the chat room
  console.log({ participants });
  return (
    participants.size === 2 &&
    participants.has(userId) &&
    participants.has(astrologerId)
  );
};

// Function to handle socket connections and events
export const initSocket = (server) => {
  // console.log({ server });

  // Initialize socket.io with the provided server
  io = new socketIo(server, {
    cors: {
      origin: "https://localhost:6000", // Adjust based on where your client is hosted
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Event listener for a new connection
  io.on("connection", (socket) => {
    console.log(`User connected with socket ID: ${socket.id}`);

    // When the user sends their userId to the server (after logging in, for example)
    socket.on("set_user_id", (userId) => {
      activeUsers[userId] = socket.id; // Store the socketId associated with the userId
      console.log(
        `User ID ${userId} is connected with socket ID: ${socket.id}`
      );
    });

    // Event for when a user wants to start a chat
    // Event for when a user wants to start a chat

    socket.on("startChat", async ({ userId, role, astrologerId }) => {
      const user = await User.findById(userId);
      const astrologer = await Astrologer.findById(astrologerId);

      if (!user || !astrologer) {
        console.error("User or astrologer not found.");
        return;
      }

      const per_min_cost = astrologer.pricePerChatMinute;
      if (user.walletBalance < per_min_cost) {
        return socket.emit("error", "Insufficient Funds, Please Recharge");
      }

      const totalSeconds = Math.floor((user.walletBalance / per_min_cost) * 60);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      const totalTime = `${totalMinutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;

      try {
        const result = await createChatRoom(userId, role, astrologerId);
        if (result.success) {
          const chatRoomId = result.chatRoomId;
          socket.join(chatRoomId);
          socket.emit("chatRoomCreated", {
            success: true,
            chatRoomId,
            astrologerId: astrologerId,
            userId: userId,
            totalChatDuration: totalTime,
          });
          if (!chatRoomParticipants[result.chatRoomId]) {
            chatRoomParticipants[result.chatRoomId] = new Set(); // Initialize the set for new chat room
          }
          chatRoomParticipants[result.chatRoomId].add(userId);

          socket
            .to(chatRoomId)
            .emit("system_message", `Astrologer will join soon !`);

          const astrologerSocketId = activeUsers[astrologerId];
          if (astrologerSocketId) {
            io.to(astrologerSocketId).emit("newChatRoom", {
              chatRoomId: result.chatRoomId,
              userId,
              astrologerId,
              message: `A user has requested a consultation with you.`,
            });
          }

          const newNotification = new Notification({
            userId: astrologerId,
            message: [
              {
                title: "Chat Request",
                desc: "You have a pending chat request",
              },
            ],
          });

          // Save the notification to the database
          newNotification.save();

          // Notify the astrologer of the incoming chat request
          socket.to(astrologer.socketId).emit("incomingChatRequest", {
            userId,
            chatRoomId,
            message: "Incoming chat request",
          });

          // Handle astrologer's response
          socket.on("astrologerResponse", async ({ chatRoomId, response }) => {
            if (response === "approve") {
              console.log("Astrologer approved the chat");
              socket.to(chatRoomId).emit("chatApproved", {
                chatRoomId,
                message: "Chat approved by astrologer",
              });
            } else if (response === "deny") {
              console.log("Astrologer denied the chat");

              // Notify the user and force them to leave the chat room
              socket.to(chatRoomId).emit("chatDenied", {
                message: "Chat request denied by astrologer",
              });
              socket.leave(chatRoomId);
              // Remove the chat room from active sessions
              delete chatRoomParticipants[chatRoomId];
              // Optionally clean up the chat room data in the database
              await ChatRoom.findByIdAndUpdate(chatRoomId, {
                status: "inactive",
              });
            }
          });
        } else {
          socket.emit("error", result.message);
        }
      } catch (error) {
        console.error("Error starting chat:", error);
        socket.emit("error", "An error occurred while starting the chat.");
      }
    });

    socket.on(
      "startaudiocall",
      async ({ userId, channleid, astrologerId, callType }) => {
        const appID = "69779ffdb88442ecb348ae75b0b3963d";
        const appCertificate = "e10b414d78c84ec9bcd1160d6fe0ef4c";

        // Generate unique UIDs for both client and astrologer
        const userUid = Math.floor(Math.random() * 100000); // Unique UID for the client
        const astrologerUid = Math.floor(Math.random() * 100000); // Unique UID for the astrologer

        // Function to generate Agora token with provided role (PUBLISHER or SUBSCRIBER)
        const generateAgoraToken = (
          channelName,
          appID,
          appCertificate,
          uid,
          role
        ) => {
          const token = AgoraAccessToken.RtcTokenBuilder.buildTokenWithUid(
            appID,
            appCertificate,
            channelName,
            uid,
            role,
            Math.floor(Date.now() / 1000) + 3600 // Token expires in 1 hour
          );
          return token;
        };

        // Define the channel name from the passed `channleid`
        let channelName = channleid;

        // Generate tokens for both client (PUBLISHER) and astrologer (SUBSCRIBER)
        const clientToken = generateAgoraToken(
          channelName,
          appID,
          appCertificate,
          userUid,
          AgoraAccessToken.RtcRole.PUBLISHER
        );
        const astrologerToken = generateAgoraToken(
          channelName,
          appID,
          appCertificate,
          astrologerUid,
          AgoraAccessToken.RtcRole.PUBLISHER
        );

        // Get the active socket IDs for astrologer and client
        const astrologerSocketId = activeUsers[astrologerId];
        const userSocketId = activeUsers[userId];

        // Emit the start call event to both users with their tokens and UIDs
        io.to(astrologerSocketId).emit("startaudiocall", {
          channleid: channelName,
          userId,
          astrologerId,
          token: astrologerToken, // Token for astrologer (SUBSCRIBER)
          uid: astrologerUid,
          callType, // UID for astrologer
          message: `A user has requested a consultation with you.`,
        });

        const newNotification = new Notification({
          userId: astrologerId,
          message: [
            {
              title:
                callType === "audio"
                  ? "Audio Call Request"
                  : "Video Call Request",
              desc: `You have a pending ${callType} request`,
            },
          ],
        });

        // Save the notification to the database
        newNotification.save();

        io.to(userSocketId).emit("startaudiocall", {
          channleid: channelName,
          userId,
          astrologerId,
          token: clientToken, // Token for client (PUBLISHER)
          uid: userUid,
          callType, // UID for client
          message: `A user has requested a consultation with you.`,
        });
      }
    );

    socket.on(
      "joinedaudiocall",
      async ({
        userId,
        channleid,
        astrologerId,
        publisherUid,
        JoinedId,
        callType,
      }) => {
        console.log({ publisherUid, JoinedId });
        const payload = {
          userId, // Replace with actual userId
          astrologerId, // Replace with actual astrologerId
          channleid,
          publisherUid,
          JoinedId,
          callType,
        };

        console.log("payload");
        console.log(payload);

        // Send POST request using axios
        // const response = await axios.post('https://devifai.in/astrobandhan/v1/user/start/call', payload);
        const response = await startCall(payload);
        console.log({ response });

        const astrologerSocketId = activeUsers[astrologerId];
        const userSocketId = activeUsers[userId];

        io.to(astrologerSocketId).emit("callid_audiocall", {
          callId: response.callId, // Access callId directly from response
          response: response.data,
          message: `Successfully joined the call room.`,
        });

        io.to(userSocketId).emit("callid_audiocall", {
          callId: response.callId, // Access callId directly from response
          response: response.data,
          message: `A user has joined call room with you.`,
        });
      }
    );

    socket.on("endaudiocall", async ({ callId, astrologerId, userId }) => {
      const payload = {
        callId, // Replace with actual channelName
      };
      // const response = await axios.post('https://devifai.in/astrobandhan/v1/user/end/call', payload);
      const response = await endCallAndLogTransaction(callId); // Pass callId directly
      // console.log(response);
      console.log(response);

      const astrologerSocketId = activeUsers[astrologerId];
      const userSocketId = activeUsers[userId];

      io.to(astrologerSocketId).emit("endaudiocall", {
        userId,
        astrologerId,
        message: `Audio Call Ended.`,
      });
      io.to(userSocketId).emit("endaudiocall", {
        userId,
        astrologerId,
        message: `Audio Call Ended.`,
      });
    });

    console.log({ chatRoomParticipants });
    // Event for when a user wants to resume/join a chat
    socket.on(
      "joinChatFirstTime",
      async ({ userId, astrologerId, chatRoomId, hitBy }) => {
        try {
          console.log(`First time joining:`, {
            userId,
            astrologerId,
            chatRoomId,
            hitBy,
          });

          const userSocketId = activeUsers[userId];

          io.to(userSocketId).emit("acceptedchat", {
            userId,
            astrologerId,
            message: `Astrologer Joined Success.`,
          });

          // Step 1: Ensure the chat room is initialized
          // if (!chatRoomParticipants[chatRoomId]) {
          //     chatRoomParticipants[chatRoomId] = new Set();
          // }

          // Step 2: Add the participant based on `hitBy`
          if (hitBy === "user") {
            chatRoomParticipants[chatRoomId].add(userId);
          } else {
            chatRoomParticipants[chatRoomId].add(astrologerId);
          }
          console.log({ chatRoomParticipants });
          console.log({ chatRoomId, userId, astrologerId });

          const user = await User.findById(userId);
          const astrologer = await Astrologer.findById(astrologerId);

          if (!user || !astrologer) {
            socket.emit("error", "User or astrologer not found.");
            return;
          }

          const minuteCost = astrologer.pricePerChatMinute;
          const minuteComission = astrologer.chatCommission;

          // Step 3: Check if both participants have joined
          if (isAllUsersJoined(chatRoomId, userId, astrologerId)) {
            console.log("isAllUsersJoined");
            joinChatRoom(userId, astrologerId, chatRoomId, hitBy);
            console.log(
              "Both users are in the chat room:",
              chatRoomParticipants
            );
            socket.to(chatRoomId).emit("system_message", `Astrologer Joined !`);

            // Step 5: Fetch user and astrologer details
            // const user = await User.findById(userId);
            // const astrologer = await Astrologer.findById(astrologerId);

            // if (!user || !astrologer) {
            //     socket.emit('error', 'User or astrologer not found.');
            //     return;
            // }

            // const minuteCost = astrologer.pricePerChatMinute;
            // const minuteComission = astrologer.chatCommission;

            // Step 6: Check user's wallet balance
            if (user.walletBalance < minuteCost) {
              socket.emit(
                "warning",
                "Your balance is low. Please recharge your wallet"
              );
              const updatedUser = await User.findById(userId);
              if (updatedUser.walletBalance < minuteCost) {
                socket.emit(
                  "error",
                  "Insufficient balance. Chat session is ending."
                );
                socket.leave(chatRoomId); // Force leave the chat room
                await Chat.findOneAndUpdate(
                  { chatRoomId },
                  { $set: { duration: "0:00" } },
                  { new: true }
                );
                clearInterval(chatIntervals[chatRoomId]); // Stop the interval
              }
            } else {
              // Step 4: Store the start time of the chat session
              chatStartTimes[chatRoomId] = Date.now();

              const admins = await Admin.find({}); // Or Astrologer.findAll() if you're working with astrologers

              if (admins.length === 0) {
                return res.status(404).json({ message: "No Admin found" });
              }

              // Take the first user/astrologer document
              const adminUser = admins[0]; // Change this to astrologer if working with astrologers
              // adminUser.adminWalletBalance += minuteComission;
              // await adminUser.save()

              // Deduct the cost for 1 minute
              user.walletBalance -= minuteCost;
              await user.save();

              // Increment astrologer's wallet balance
              astrologer.walletBalance += minuteCost - minuteComission;
              await astrologer.save();

              const adminWalletTransaction = await AdminWallet.create({
                amount: minuteComission,
                transaction_id: `ADMIN_TXN_${Date.now()}`,
                transaction_type: "credit",
                credit_type: "chat",
                service_id: chatRoomId,
                userId: userId,
              });
              await adminWalletTransaction.save();
              // Log the transaction
              const userTransaction = new Wallet({
                user_id: userId,
                amount: minuteCost,
                transaction_type: "debit",
                transaction_id: `TXN-${Date.now()}`,
                debit_type: "chat",
                service_reference_id: chatRoomId,
              });
              await userTransaction.save();

              const astrologerTransaction = new Wallet({
                astrologer_id: astrologerId,
                amount: minuteCost - minuteComission,
                transaction_id: `TXN-${Date.now()}`,
                transaction_type: "credit",
                credit_type: "chat",
                service_reference_id: chatRoomId,
              });
              await astrologerTransaction.save();

              // Emit success message
              socket.emit("intervalMessage", {
                chatRoomId,
                message: `Total of ${minuteCost} deducted from user's wallet. Remaining balance: ${user.walletBalance}`,
              });
              console.log(
                `Total of ${minuteCost} deducted from user's wallet. Remaining balance: ${user.walletBalance}`
              );
            }

            // Step 7: Start emitting every 1 minute for chat duration updates
            chatIntervals[chatRoomId] = setInterval(async () => {
              try {
                const currentTime = Date.now();
                const startTime = chatStartTimes[chatRoomId];
                const elapsedSeconds = Math.ceil(
                  (currentTime - startTime) / 1000
                );
                const minutes = Math.ceil(elapsedSeconds / 60);
                const seconds = elapsedSeconds % 60;
                const elapsedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

                console.log({
                  currentTime,
                  startTime,
                  elapsedSeconds,
                  minutes,
                  seconds,
                  elapsedTime,
                });

                const user = await User.findById(userId);

                if (!user) {
                  throw new Error("User not found.");
                }

                // Check if the user has enough balance each minute
                if (user.walletBalance < minuteCost) {
                  socket.emit(
                    "warning",
                    "Your balance is low. Please recharge before the next minute."
                  );
                  setTimeout(async () => {
                    if (user.walletBalance < minuteCost) {
                      socket.emit(
                        "error",
                        "Insufficient balance. Chat session is ending."
                      );
                      socket.leave(chatRoomId);
                      await Chat.findOneAndUpdate(
                        { chatRoomId },
                        { $set: { duration: elapsedTime } },
                        { new: true }
                      );
                      clearInterval(chatIntervals[chatRoomId]);
                    }
                  }, 60000);
                }

                const userWalletDoc = await Wallet.findOne({
                  user_id: userId,
                  amount_type: "debit",
                  service_reference_id: chatRoomId,
                });
                const astrologerWalletDoc = await Wallet.findOne({
                  astrologer_id: astrologerId,
                  amount_type: "credit",
                  service_reference_id: chatRoomId,
                });
                const adminWalletDoc = await AdminWallet.findOne({
                  service_id: chatRoomId,
                });
                if (adminWalletDoc) {
                  adminWalletDoc.amount += minuteComission;
                  await adminWalletDoc.save();
                }
                if (userWalletDoc) {
                  // Increment the wallet balance with the minuteCost
                  user.walletBalance -= minuteCost; // Adding the minute cost to the wallet balance
                  await user.save(); // Save the updated user balance

                  userWalletDoc.amount += minuteCost;

                  await userWalletDoc.save();
                }

                if (astrologerWalletDoc) {
                  astrologer.walletBalance += minuteCost - minuteComission;
                  await astrologer.save();

                  astrologerWalletDoc.amount += minuteCost - minuteComission;
                  await astrologerWalletDoc.save();
                }

                console.log({ elapsedTime });
                // Update the chat duration
                await Chat.findOneAndUpdate(
                  { chatRoomId },
                  { $set: { duration: elapsedTime } },
                  { new: true }
                );

                socket.emit("intervalMessage", {
                  message: `Chat duration: ${elapsedTime}`,
                });
              } catch (error) {
                console.error(
                  "Error during interval message or money deduction:",
                  error
                );
                clearInterval(chatIntervals[chatRoomId]);
                socket.emit(
                  "error",
                  "An error occurred while processing the chat."
                );
              }
            }, 60000); // 1-minute interval
          }

          // Step 8: Join the chat room
          socket.join(chatRoomId);
          socket.emit("chatRoomJoined", {
            chatRoomId,
            message: "Successfully joined the chat room.",
          });
        } catch (error) {
          console.error("Error during first-time join:", error);
          socket.emit("error", "An error occurred while joining the chat.");
        }
      }
    );

    socket.on("resumeChat", async ({ chatRoomId, userId, astrologerId }) => {
      try {
        // Ensure the chat room exists in participants list
        if (!chatRoomParticipants[chatRoomId]) {
          chatRoomParticipants[chatRoomId] = new Set();
        }

        // Add user and astrologer to the room
        chatRoomParticipants[chatRoomId].add(userId);
        chatRoomParticipants[chatRoomId].add(astrologerId);

        console.log(
          `User ${userId} and Astrologer ${astrologerId} have rejoined the chat room: ${chatRoomId}`
        );
        console.log(
          "Current Participants:",
          Array.from(chatRoomParticipants[chatRoomId])
        );

        // Notify all participants in the room about resumption
        socket
          .to(chatRoomId)
          .emit(
            "resumeMessage",
            `Chat has been resumed for room ${chatRoomId}`
          );

        // Let the user and astrologer join the chat room (via socket.io)
        socket.join(chatRoomId);

        // Emit a confirmation to the client who triggered the event
        socket.emit(
          "resumeSuccess",
          `You have successfully rejoined chat room ${chatRoomId}`
        );
      } catch (error) {
        console.error("Error during chat resumption:", error);
        socket.emit("error", "An error occurred while resuming the chat.");
      }
    });

    // Event for when a user wants to ends a chat
    socket.on("endChat", async ({ userId, astrologerId, chatRoomId }) => {
      console.log("userId");
      console.log(userId);
      console.log(astrologerId);
      console.log(chatRoomId);

      try {
        // Find the chat room and ensure the user/astrologer is part of it, then update status to 'inactive'
        const chatRoom = await ChatRoom.findOneAndUpdate(
          {
            $and: [
              { chatRoomId: chatRoomId },
              { user: userId },
              { astrologer: astrologerId },
            ],
            status: "active", // Ensure the chat is active
          },
          {
            $set: { status: "inactive" }, // Update the status to 'inactive'
          },
          { new: true } // Return the updated document
        );

        if (chatRoom) {
          // Notify both the user and astrologer
          clearInterval(chatIntervals[chatRoomId]);

          const astrologerSocketId = activeUsers[astrologerId];
          if (astrologerSocketId) {
            io.to(astrologerSocketId).emit("chatEnded_XX", {
              chatRoomId: chatRoomId,
              userId,
              astrologerId,
              message: `chat room Ended.`,
            });
          }
          socket
            .to(chatRoomId)
            .emit("chatEnded", { chatRoomId, message: "The chat has ended." });

          // Optionally, leave the chat room
          socket.leave(chatRoomId);
          // Remove the participants from the chat room
          delete chatRoomParticipants[chatRoomId];
        } else {
          socket.emit("error", "Chat room not found or already inactive.");
        }
      } catch (error) {
        console.error("Error ending chat:", error);
        socket.emit("error", "An error occurred while ending the chat.");
      }
    });

    // Handle sending a message from user or astrologer
    socket.on(
      "sendMessage",
      async ({ message, senderId, chatRoomId, senderType, messageType }) => {
        try {
          console.log("sending message::::::::::::::", {
            message,
            senderId,
            chatRoomId,
            senderType,
            messageType,
          });
          // Prepare the chat message
          const chatMessage = {
            senderType: senderType,
            senderId: new mongoose.Types.ObjectId(senderId), // Correctly handle ObjectId
            messageType,
            message: message,
            timestamp: moment().tz("Asia/Kolkata").toDate(), // Correctly using moment for local timezone
          };

          let userData;

          if (senderType === "user") {
            // Fetch user details from the database
            userData = await User.findById(senderId).lean();

            if (!userData) {
              throw new Error("User not found.");
            }
          }

          // Check if the chat room exists
          const chat = await Chat.findOne({ chatRoomId });

          if (!chat) {
            // If the chat document doesn't exist, create it with a formatted "Hello World" system message
            const systemMessage = {
              senderType: "system",
              senderId: null,
              messageType: "text",
              message: `Hello! Here are the details of the user:\nName: ${userData.name}\nDate of Birth: ${userData.dateOfBirth}\nPlace of Birth: ${userData.placeOfBirth}`, // Formatted message
              timestamp: moment().tz("Asia/Kolkata").toDate(), // Add timestamp
            };
            await Chat.create({
              chatRoomId,
              messages: [systemMessage, chatMessage], // Initialize with the system message and the new message
            });
          } else {
            console.log(chatMessage);
            // If the chat exists, simply push the new message
            await Chat.findOneAndUpdate(
              { chatRoomId }, // Find chat by chatRoomId
              { $push: { messages: chatMessage } }, // Push the new message to the 'messages' array
              { new: true } // Return the updated document
            );
          }

          // Broadcast the message to everyone in the room
          socket.to(chatRoomId).emit("chatMessage", chatMessage);
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", "Failed to send the message.");
        }
      }
    );

    // Disconnect handler
    socket.on("disconnect", () => {
      for (let userId in activeUsers) {
        if (activeUsers[userId] === socket.id) {
          delete activeUsers[userId]; // Remove the user from activeUsers map
          console.log(`User ID ${userId} disconnected.`);
          break;
        }
      }
    });
  });
};

// Export the `io` object for use elsewhere in the application
export { io };
