import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { warrantyClaimSchema } from "./libs/validator";
import connect from "./db";
import { WarrantyClaim } from "./models/claims";
import { upload, uploadFileToSpace } from "./upload";
import { MulterError } from "multer";

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();
connect();

const PORT = process.env.PORT || 8000;
const SHOPIFY_URL = `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

/* Get all products */

app.get("/products/all", async (req, res) => {
  try {
    let products = [];
    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const productsResponse = await fetch(SHOPIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: `
                query Products($cursor: String) {
                  products(first: 250, after: $cursor) {
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                    edges {
                      node {
                        id
                        title
                        productType
                      }
                    }
                  }
                }`,
          variables: {
            cursor,
          },
        }),
      })
        .then((response) => response.json())
        .catch((error) => {
          console.error("Error:", error);
          return null;
        });

      const ps =
        productsResponse.data?.products?.edges?.map((edge: any) => edge.node) ||
        [];

      products.push(...ps);
      const pageInfo: { hasNextPage?: boolean; endCursor?: string } =
        productsResponse?.data?.products?.pageInfo;
      hasNextPage = pageInfo?.hasNextPage ?? false;
      cursor = pageInfo?.endCursor;
    }

    const productTypes = products.map((product: any) => product.productType);

    const uniqueProductTypes = [...new Set(productTypes)];

    res.status(200).json({
      success: true,
      message: "Products fetched",
      products,
      productTypes: uniqueProductTypes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/* Get all order details */

app.get("/orders/:id", async (req, res) => {
  const id = req.params.id;

  try {
    if (!id || id.trim() === "") {
      res.status(400).json({ error: "Order ID is required" });
    }

    const orderResponse = await fetch(SHOPIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: `
        query OrderByName($name: String!) {
          orders(first: 1, query: $name) {
            edges {
              node {
                name
                email
                createdAt
                updatedAt
                shippingAddress {
                  firstName
                  lastName
                  address1
                  address2
                  city
                  province
                  country
                  zip
                  phone
                }
                customer {
                  displayName
                  phone
                  email
                }
                fulfillments {
                  displayStatus
                  deliveredAt
                  createdAt
                  updatedAt
                }
                lineItems(first: 250) {
                  edges {
                    node {
                      title
                      quantity
                      product {
                        id
                        title
                        productType
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        variables: {
          name: "name:#" + id,
        },
      }),
    })
      .then((response) => response.json())
      .catch((error) => {
        console.error("Error:", error);
        return null;
      });

    const order = orderResponse?.data?.orders?.edges[0]?.node || null;

    if (!order) {
      let products = [];
      let cursor = null;
      let hasNextPage = true;

      while (hasNextPage) {
        const productsResponse = await fetch(SHOPIFY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          },
          body: JSON.stringify({
            query: `
                  query Products($cursor: String) {
                    products(first: 250, after: $cursor) {
                      pageInfo {
                        hasNextPage
                        endCursor
                      }
                      edges {
                        node {
                          id
                          title
                          productType
                        }
                      }
                    }
                  }`,
            variables: {
              cursor,
            },
          }),
        })
          .then((response) => response.json())
          .catch((error) => {
            console.error("Error:", error);
            return null;
          });

        const ps =
          productsResponse.data?.products?.edges?.map(
            (edge: any) => edge.node
          ) || [];

        products.push(...ps);
        const pageInfo: { hasNextPage?: boolean; endCursor?: string } =
          productsResponse?.data?.products?.pageInfo;
        hasNextPage = pageInfo?.hasNextPage ?? false;
        cursor = pageInfo?.endCursor;
      }

      const productTypes = products.map((product: any) => product.productType);

      const uniqueProductTypes = [...new Set(productTypes)];

      res.status(200).json({
        success: true,
        message: "Order not found",
        products,
        productTypes: uniqueProductTypes,
        isShopifyOrder: false,
      });
    } else {
      const isDelivered = order?.fulfillments?.find(
        (fulfillment: any) => fulfillment.displayStatus === "DELIVERED"
      );

      if (!isDelivered) {
        res.status(200).json({
          success: true,
          message: "Order is not delivered yet",
          isDelivered: false,
          isShopifyOrder: true,
        });
      } else {
        const products = order.lineItems.edges.map(
          (edge: any) => edge.node.product
        );

        order.lineItems = products;

        res.status(200).json({
          success: true,
          message: "Order is delivered",
          order,
          isDelivered: true,
          isShopifyOrder: true,
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/* Create a warranty claim */

app.post(
  "/warranty/claim",
  upload.fields([
    { name: "invoice", maxCount: 1 },
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const invoice =
        req.files && "invoice" in req.files ? req.files.invoice[0] : undefined;

      const images = req.files && "images" in req.files ? req.files.images : [];

      const video =
        req.files && "video" in req.files ? req.files.video[0] : undefined;

      if (!invoice) {
        return res.status(400).json({
          success: false,
          error: "Invoice is required",
        });
      }

      if (images.length < 1 || images.length > 5) {
        return res.status(400).json({
          success: false,
          error: "Between 1-5 images are required",
        });
      }

      if (!video) {
        return res.status(400).json({
          success: false,
          error: "Video is not supported",
        });
      }

      const invoiceUrl = await uploadFileToSpace(
        invoice.buffer,
        invoice.originalname,
        invoice.mimetype,
        "warranty-claims/",
        process.env.BUCKET_NAME!
      );

      const imageUrls = await Promise.all(
        images.map((image: Express.Multer.File) =>
          uploadFileToSpace(
            image.buffer,
            image.originalname,
            image.mimetype,
            "warranty-claims/",
            process.env.BUCKET_NAME!
          )
        )
      );

      const videoUrl = await uploadFileToSpace(
        video.buffer,
        video.originalname,
        video.mimetype,
        "warranty-claims/",
        process.env.BUCKET_NAME!
      );

      const data = warrantyClaimSchema.parse({
        ...req.body,
        invoice: invoiceUrl,
        images: imageUrls,
        video: videoUrl,
      });

      const warrantyClaim = await WarrantyClaim.create({
        ...data,
        invoice: invoiceUrl,
        images: imageUrls,
        video: videoUrl,
      });

      const response = await fetch(process.env.GOOGLE_SPREADSHEET_LINK!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(warrantyClaim),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send data to Google Spreadsheet", {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText,
        });
      } else {
        console.log("Successfully sent data to Google Spreadsheet");
      }

      res.status(201).json({
        success: true,
        message: "Warranty claim created",
        data: warrantyClaim,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: formattedErrors[0].message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    }
  }
);

app.use((err: MulterError, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    console.error("Multer error:", err.field, err.message);
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          error: `File size too large for field: ${err.field}`,
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          error: `Max files exceeded for field: ${err.field}`,
        });
      default:
        return res.status(400).json({
          success: false,
          error: `Multer error (${err.field}): ${err.message}`,
        });
    }
  }

  res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
