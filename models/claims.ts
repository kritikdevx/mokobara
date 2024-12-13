import mongoose from "mongoose";

const WarrantyClaimSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  order_number: {
    type: String,
    required: true,
  },
  product_type: {
    type: String,
    required: true,
  },
  product_name: {
    type: String,
    required: true,
  },
  invoice: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  images: {
    type: [String],
    required: false,
  },
});

export const WarrantyClaim = mongoose.model(
  "WarrantyClaim",
  WarrantyClaimSchema
);
