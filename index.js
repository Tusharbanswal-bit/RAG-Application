import OpenAI from "openai";
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import promptSync from "prompt-sync";
const prompt = promptSync();
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.aimlapi.com"
});

const client = new Client({
    node: 'https://65.108.134.51:10208',
    auth: {
        username: process.env.ELASTIC_USERNAME,
        password: process.env.ELASTIC_PASSWORD
    }

});

async function generateResponse(query) {
    //Retrieve relevant documents from Elasticsearch database based on user prompt
    const searchResults = await client.search({
        body: {
            query: {
                multi_match: {
                    query: query,
                    fields: ['*']
                }
            }
        }
    });

    // // Extract relevant text from search results
    const context = JSON.stringify(searchResults.hits.hits);

    const prompt = `Here is some relevant information:\n${context}\n\nBased on this information, answer the following question:\n${query}`;
    let result = '';
    const stream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ "role": "user", "content": prompt }],
        stream: true,
    });
    for await (const part of stream) {
        result += part.choices[0]?.delta?.content || '';
    }

    return result;
}

(async function () {
    const query = prompt("query: ");
    const response = await generateResponse(query);
    console.log(`Output: ${response}`);
})()

