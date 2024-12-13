import multer from "multer";
import aws from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const spacesEndpoint = new aws.Endpoint(process.env.BUCKET_URL!);

const s3 = new aws.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.BUCKET_WRITE_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKET_WRITE_ACCESS_KEY_SECRET,
});

export const uploadFileToSpace = async (
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  folderPath: string,
  bucketName: string
) => {
  const fileKey = `${folderPath}${Date.now()}_${fileName}`;

  const uploadParams = {
    Bucket: bucketName,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: fileType,
    ACL: "public-read",
  };

  try {
    const uploadResult = await s3.upload(uploadParams).promise();
    return uploadResult.Location; // Return the URL of the uploaded file
  } catch (error) {
    console.error("Error uploading file to Space:", error);
    throw new Error("File upload failed");
  }
};
