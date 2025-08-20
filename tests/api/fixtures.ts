import { request, APIRequestContext, test as base  } from "@playwright/test";
import dotenv from 'dotenv';
import OpenProjectClient from "../../src/api/workPackagesService";

dotenv.config();

const BASE_URL = process.env.OPENPROJECT_BASE_URL!;
const API_KEY = process.env.OPENPROJECT_API_KEY!;
// const TYPE_ID = Number(process.env.OPENPROJECT_TYPE_ID!);       // e.g. 1 (Task)
// Extend Playwright test with a `svc` fixture providing OpenProjectClient


export const test = base.extend<{ opclient: OpenProjectClient }>({
  opclient: async ({  }, use) => {
    const token = Buffer.from(`apikey:${API_KEY}`).toString("base64");
    const auth = { Authorization: `Basic ${token}` };
    const api: APIRequestContext = await request.newContext({
        baseURL: BASE_URL,
        extraHTTPHeaders: {
            ...auth,
            "Content-Type": "application/json"
        },
    });

    await use(new OpenProjectClient(api));
  },
});
