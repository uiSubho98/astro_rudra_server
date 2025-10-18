import { AI_Astro_Chat } from "../models/ai_astro_chat.model.js";
import { AI_Astrologer } from "../models/ai_astrologer_model.js";
import { User } from "../models/user.model.js";
import { chat_with_ai_astro } from "./chat_with_ai_astro.js";

export const ask_ai_astro = async ({
  question,
  userId,
  astroId,
  isFreeChat,
  isChatEnded,
  userName,
  data
}) => {
  try {
    // console.log({ question, userId, astroId, isFreeChat, isChatEnded , data});

    // Fetch user details
    const userDetails = await getUserDetails(userId);
    if (!userDetails) {
      console.log("User not found.");
      return;
      // return res.status(404).json({ error: "User not found." });
    }

    // Get astrologer details
    const astroDetails = await AI_Astrologer.findById(astroId);
    if (!astroDetails) {
      console.log("Astrologer not found.");
      return;
      // return res.status(404).json({ error: "Astrologer not found." });
    }

    // Get AI-generated answer
    let answer = null;
    if (question) {
      answer = await chat_with_ai_astro(
        question,
        "vedic",
        userDetails,
        userName, 
        data
      );
    }

    // Find existing chat document
    let chatRecord = await AI_Astro_Chat.findOne({
      aiAstroId: astroId,
      userId: userId,
    });

    const currentTime = new Date();
    const currentTimeString = currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (chatRecord) {
      if (!chatRecord.isChatStarted) {
        chatRecord.isChatStarted = true;
        chatRecord.startTime = currentTimeString;
        chatRecord.duration = "1 minute";
      } else {
        // Calculate duration in minutes
        const startTime = new Date(chatRecord.createdAt);
        const elapsedMinutes = Math.ceil((currentTime - startTime) / 60000);
        chatRecord.duration = `${elapsedMinutes} ${elapsedMinutes === 1 ? "minute" : "minutes"}`;
      }

      if (question && answer) {
        chatRecord.messages.push({ question, answer, timestamp: currentTime });
      }

      if (isChatEnded) {
        chatRecord.isChatEnded = true;
      }

      await chatRecord.save();
      console.log({ answer });
      return answer;
      //   return res.json(
      //     new ApiResponse(200, answer, "Message added to existing chat.")
      //   );
    } else {
      // Create new chat record
      const newChatRecord = new AI_Astro_Chat({
        aiAstroId: astroId,
        userId,
        messages:
          question && answer
            ? [{ question, answer, timestamp: currentTime }]
            : [],
        amount: isFreeChat ? 0 : astroDetails.pricePerChatMinute,
        isChatStarted: true,
        startTime: currentTimeString,
        duration: "1 minute",
        isChatEnded,
      });

      await newChatRecord.save();

      return answer;
      // return res.json(
      //   new ApiResponse(200, answer, "New chat record created successfully.")
      // );
    }
  } catch (error) {
    console.error("Error in ask_ai_astro:", error);
    // return res
    //   .status(500)
    //   .json(new ApiResponse(500, null, "Internal server error"));
  }
};

async function getUserDetails(userId) {
  try {
    const user = await User.findById(userId).select(
      "dateOfBirth timeOfBirth name placeOfBirth"
    ); // Fetch dateofbirth and timeofbirth
    return user; // Return the user details (you can customize this based on what is returned)
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
}
