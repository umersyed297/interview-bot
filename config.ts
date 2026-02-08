/**
 * App Configuration
 * 
 * For local development:   API_BASE_URL = "http://localhost:3000"
 * For production (Render):  API_BASE_URL = "https://your-app.onrender.com"
 * 
 * Change this URL after deploying your backend to Render.
 */

// Toggle this between your local and deployed backend URL
const IS_PRODUCTION = true;

const LOCAL_URL = "http://localhost:3000";
const PRODUCTION_URL = "https://interview-bot-api-5ul8.onrender.com"; // <-- Update if your Render URL differs

export const API_BASE_URL = IS_PRODUCTION ? PRODUCTION_URL : LOCAL_URL;
