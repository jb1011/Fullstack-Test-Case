import { http, passthrough } from "msw";
import { setupServer } from "msw/node";

export const MERKL_TEST_URL = "https://merkl.test";

// Supertest calls the app under test on a random local port.
const localRequests = http.all(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//, () => passthrough());

export const server = setupServer(localRequests);
