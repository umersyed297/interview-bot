import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key:', apiKey.substring(0, 10) + '...');

const genAI = new GoogleGenerativeAI(apiKey);

async function testBasic() {
  try {
    console.log('\nTesting with gemini-2.0-flash (latest)...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Say hello in one word');
    console.log('✓ Success:', result.response.text());
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

testBasic();
