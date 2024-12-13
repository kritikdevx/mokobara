import { z } from "zod";

export const warrantyClaimSchema = z.object({
  full_name: z.string().min(1, { message: "Full name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z
    .string()
    .regex(/^\+?\d{10,15}$/, { message: "Invalid phone number" }),
  address: z.string().min(1, { message: "Address is required" }),
  order_number: z.string().min(1, { message: "Order number is required" }),
  product_type: z.string().min(1, { message: "Product type is required" }),
  product_name: z.string().min(1, { message: "Product name is required" }),
  description: z.string().trim().optional(),
  invoice: z.string().min(1, { message: "Invoice is required" }),
  images: z
    .array(z.string())
    .min(1, { message: "Images are required" })
    .max(5, { message: "Maximum of 5 images allowed" }),
});
