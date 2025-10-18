import mongoose from "mongoose";

const statusLogSchema = new mongoose.Schema({
  fromStatus: {
    type: String,
    enum: ["pending", "confirmed", "active", "rejected", "ended", "none"],
    required: true,
  },
  toStatus: {
    type: String,
    enum: ["pending", "confirmed", "active", "rejected", "ended"],
    required: true,
  },
  changedBy: {
    type: String,
    enum: ["user", "astrologer", "system"],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const chatRoomSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    astrologer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Astrologer",
      required: true,
    },
    chatType: {
      type: String,
      enum: ["text", "audio", "video"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "active", "rejected", "ended"],
      default: "pending",
    },
    rejectedBy: {
      type: String,
      enum: ["user", "astrologer", "system"],
    },
    endedBy: {
      type: String,
      enum: ["user", "astrologer", "system"],
    },
    isUserJoined: {
      type: Boolean,
      default: false,
    },
    isAstrologerJoined: {
      type: Boolean,
      default: false,
    },
    statusLogs: {
      type: [statusLogSchema],
      default: [],
    },
    previousStatus: {
      type: String,
      enum: ["pending", "confirmed", "active", "rejected", "ended", "none"],
      default: "none",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Middleware to log status changes
chatRoomSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    // Determine who changed the status
    let changedBy = "system";
    if (this.status === "rejected" && this.rejectedBy) {
      changedBy = this.rejectedBy;
    } else if (this.status === "ended" && this.endedBy) {
      changedBy = this.endedBy;
    }

    // Add new log entry
    this.statusLogs.push({
      fromStatus: this.previousStatus,
      toStatus: this.status,
      changedBy: changedBy,
      timestamp: new Date(),
      metadata: {
        // You can add additional context here
        atStage: this.status,
        userJoined: this.isUserJoined,
        astrologerJoined: this.isAstrologerJoined,
      },
    });

    // Update previousStatus for next change
    this.previousStatus = this.status;
  }
  next();
});

// Helper method to change status with logging
chatRoomSchema.methods.changeStatus = async function (
  newStatus,
  changedBy,
  metadata = {}
) {
  // Validate status transition
  const validTransitions = {
    pending: ["confirmed", "rejected"],
    confirmed: ["active", "rejected"],
    active: ["ended"],
    rejected: [],
    ended: [],
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(
      `Invalid status transition from ${this.status} to ${newStatus}`
    );
  }

  // Set the appropriate "by" field
  if (newStatus === "rejected") {
    this.rejectedBy = changedBy;
  } else if (newStatus === "ended") {
    this.endedBy = changedBy;
  }

  // Update status (which will trigger the pre-save hook)
  this.status = newStatus;
  this.markModified("status");

  // Add custom metadata to the last log entry
  if (this.statusLogs.length > 0) {
    const lastLog = this.statusLogs[this.statusLogs.length - 1];
    lastLog.metadata = { ...lastLog.metadata, ...metadata };
  }

  return this.save();
};

// Virtual for current chat duration (if active)
chatRoomSchema.virtual("duration").get(function () {
  if (this.status === "active" && this.updatedAt) {
    return Date.now() - this.updatedAt;
  }
  return null;
});

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
export default ChatRoom;
