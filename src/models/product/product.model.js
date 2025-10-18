import mongoose from "mongoose";

const { Schema, model } = mongoose;

const productSchema = new Schema(
  {
    productName: {
      type: String,
      trim: true,
      required: [true, "Product name is required"],
    },
    image: {
      type: String,
      required: [true, "Product image is required"],
    },
    productDescription: {
      type: String,
      trim: true,
      required: [true, "Product description is required"],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: [true, "Product category is required"],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      required: [true, "Product rating is required"],
    },
    brand: {
      type: String,
      trim: true,
      required: [true, "Product brand is required"],
    },
    weight: {
      type: String,
      trim: true,
    },
    material: {
      type: String,
      trim: true,
    },
    height: {
      type: String,
      trim: true,
    },
    width: {
      type: String,
      trim: true,
    },
    originalPrice: {
      type: Number,
      required: [true, "Original price is required"],
    },
    displayPrice: {
      type: Number,
      required: [true, "Display price is required"],
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    in_stock: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Product = model("Product", productSchema);

export default Product;
