const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    objectName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    confidence: {
      type: Number,
      default: 0,
    },

    image: {
      type: String,
      default: "",
    },

    wikipediaUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const History =
  mongoose.models.History ||
  mongoose.model("History", historySchema);

module.exports = History;