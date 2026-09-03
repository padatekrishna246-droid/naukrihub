const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const job = {
    title: "Engineer I, Controls",
    company: "CommScope",
    location: "Verna, Goa, India",
    description: `
Engineer I, Controls position at CommScope in Verna, Goa.
The role involves engineering and controls-related responsibilities.
This is a real job listing used to test NaukriHub's AI job-processing flow.
`,
    type: "Full Time",
    experience: "Not specified",
    salary: "Not disclosed",
    applyUrl: "https://jobs.commscope.com/job/Verna-Engineer-I%2C-Controls-Goa/1425260200/"
};

async function main() {
    const prompt = `
You are the AI job-processing engine for NaukriHub.

Analyze the following real job listing and return ONLY valid JSON.

Required JSON fields:
{
  "title": "",
  "company": "",
  "location": "",
  "category": "",
  "experience": "",
  "type": "",
  "salary": "",
  "description": "",
  "applyUrl": ""
}

Rules:
- Preserve factual information from the source.
- Do not invent salary or experience.
- If information is missing, use "Not specified" or "Not disclosed".
- Keep the description professional and concise.
- Return JSON only. No markdown and no explanation.

JOB DATA:
${JSON.stringify(job, null, 2)}
`;

    try {
        const response = await ai.interactions.create({
            model: "gemini-3.6-flash",
            input: prompt
        });

        console.log("\n===== NAUKRIHUB AI RESULT =====\n");
        console.log(response.output_text);
        console.log("\n===== END =====\n");

    } catch (error) {
        console.error("GEMINI ERROR:", error.message);
    }
}

main();