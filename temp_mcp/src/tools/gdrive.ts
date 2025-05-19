import { z } from "zod";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from 'url';

export const gdriveToolName = "gdrive";
export const gdriveToolDescription = "Access and manage Google Drive files";

export const GDriveToolSchema = z.object({
  action: z.enum(["list", "read", "search"]).describe("Action to perform"),
  fileId: z.string().optional().describe("Google Drive file ID"),
  query: z.string().optional().describe("Search query"),
  pageSize: z.number().optional().default(10).describe("Number of results per page"),
  pageToken: z.string().optional().describe("Token for pagination")
});

const drive = google.drive("v3");

async function authenticateAndSaveCredentials(credentialsPath: string, oauthPath: string) {
  console.error("Launching auth flow…");
  const auth = await authenticate({
    keyfilePath: oauthPath,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  await fs.writeFile(credentialsPath, JSON.stringify(auth.credentials));
  console.error("Credentials saved.");
  return auth;
}

async function loadCredentials(credentialsPath: string) {
  if (!await fs.access(credentialsPath).then(() => true).catch(() => false)) {
    throw new Error("Credentials not found. Please authenticate first.");
  }

  const credentials = JSON.parse(await fs.readFile(credentialsPath, "utf-8"));
  const auth = new google.auth.OAuth2();
  auth.setCredentials(credentials);
  google.options({ auth });
  return auth;
}

export async function runGDriveTool(args: z.infer<typeof GDriveToolSchema>) {
  try {
    const credentialsPath = process.env.GDRIVE_CREDENTIALS_PATH || path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../.gdrive-server-credentials.json"
    );

    const oauthPath = process.env.GDRIVE_OAUTH_PATH || path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../gcp-oauth.keys.json"
    );

    // Ensure we're authenticated
    try {
      await loadCredentials(credentialsPath);
    } catch (error) {
      await authenticateAndSaveCredentials(credentialsPath, oauthPath);
    }

    switch (args.action) {
      case "list": {
        const params: any = {
          pageSize: args.pageSize,
          fields: "nextPageToken, files(id, name, mimeType)",
        };

        if (args.pageToken) {
          params.pageToken = args.pageToken;
        }

        const res = await drive.files.list(params);
        const files = res.data.files || [];

        return {
          content: [{
            type: "text",
            text: files.map((file: any) => 
              `Name: ${file.name}\nType: ${file.mimeType}\nID: ${file.id}`
            ).join('\n\n')
          }],
          isError: false
        };
      }

      case "read": {
        if (!args.fileId) {
          throw new Error("File ID is required for read action");
        }

        // First get file metadata
        const file = await drive.files.get({
          fileId: args.fileId,
          fields: "mimeType",
        });

        // For Google Docs/Sheets/etc we need to export
        if (file.data.mimeType?.startsWith("application/vnd.google-apps")) {
          let exportMimeType: string;
          switch (file.data.mimeType) {
            case "application/vnd.google-apps.document":
              exportMimeType = "text/markdown";
              break;
            case "application/vnd.google-apps.spreadsheet":
              exportMimeType = "text/csv";
              break;
            case "application/vnd.google-apps.presentation":
              exportMimeType = "text/plain";
              break;
            case "application/vnd.google-apps.drawing":
              exportMimeType = "image/png";
              break;
            default:
              exportMimeType = "text/plain";
          }

          const res = await drive.files.export(
            { fileId: args.fileId, mimeType: exportMimeType },
            { responseType: "text" },
          );

          return {
            content: [{
              type: "text",
              text: res.data as string
            }],
            isError: false
          };
        }

        // For regular files download content
        const res = await drive.files.get(
          { fileId: args.fileId, alt: "media" },
          { responseType: "arraybuffer" },
        );

        const mimeType = file.data.mimeType || "application/octet-stream";
        if (mimeType.startsWith("text/") || mimeType === "application/json") {
          return {
            content: [{
              type: "text",
              text: Buffer.from(res.data as ArrayBuffer).toString("utf-8")
            }],
            isError: false
          };
        } else {
          return {
            content: [{
              type: "text",
              text: `Binary file content (${mimeType}): ${Buffer.from(res.data as ArrayBuffer).toString("base64").substring(0, 100)}...`
            }],
            isError: false
          };
        }
      }

      case "search": {
        if (!args.query) {
          throw new Error("Search query is required for search action");
        }

        const escapedQuery = args.query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const formattedQuery = `fullText contains '${escapedQuery}'`;

        const res = await drive.files.list({
          q: formattedQuery,
          pageSize: args.pageSize,
          fields: "files(id, name, mimeType, modifiedTime, size)",
        });

        const files = res.data.files || [];

        return {
          content: [{
            type: "text",
            text: files.map((file: any) => 
              `Name: ${file.name}\nType: ${file.mimeType}\nID: ${file.id}\nModified: ${file.modifiedTime}\nSize: ${file.size || 'N/A'}`
            ).join('\n\n')
          }],
          isError: false
        };
      }

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
} 