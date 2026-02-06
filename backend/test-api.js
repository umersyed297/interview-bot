import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testAPI() {
  console.log('Testing Gemini API...\n');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Test different models
  const modelsToTest = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-exp-1114',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro',
  ];
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hi");
      const text = result.response.text();
      console.log(`✓ SUCCESS! ${modelName} works\n`);
      return modelName; // Return first working model
    } catch (error) {
      console.log(`✗ Failed: ${error.message.split('\n')[0]}\n`);
    }
  }
}

testAPI();
