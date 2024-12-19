import { z } from "zod";

export const warrantyClaimSchema = z.object({
  platform_name: z
    .string({ message: "Full name is required" })
    .trim()
    .min(1, { message: "Full name is required" }),
  full_name: z
    .string({ message: "Full name is required" })
    .trim()
    .min(1, { message: "Full name is required" }),
  email: z
    .string({ message: "Email is required" })
    .email({ message: "Invalid email address" }),
  phone: z
    .string({ message: "Phone number is required" })
    .trim()
    .regex(/^\+?\d{10,15}$/, { message: "Invalid phone number" }),
  address: z
    .string({ message: "Address is required" })
    .trim()
    .min(1, { message: "Address is required" }),
  city: z
    .string({ message: "City is required" })
    .trim()
    .min(1, { message: "City is required" }),
  pincode: z
    .string({ message: "Pincode is required" })
    .trim()
    .min(1, { message: "Pincode is required" }),
  order_number: z
    .string({ message: "Order number is required" })
    .trim()
    .min(1, { message: "Order number is required" }),
  order_date: z
    .string({ message: "Order date is required" })
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid order date format",
    }),
  product_type: z
    .string({ message: "Product type is required" })
    .trim()
    .min(1, { message: "Product type is required" }),
  product_name: z
    .string({ message: "Product name is required" })
    .trim()
    .min(1, { message: "Product name is required" }),
  description: z.string().trim().optional(),
  invoice: z
    .string({ message: "Invoice is required" })
    .min(1, { message: "Invoice is required" }),
  images: z
    .array(z.string())
    .min(1, { message: "Images are required" })
    .max(5, { message: "Maximum of 5 images allowed" }),
  video: z.string().min(1, { message: "Video is required" }),
  po_number: z.string().trim().min(1, { message: "PO number is required" }),
});
