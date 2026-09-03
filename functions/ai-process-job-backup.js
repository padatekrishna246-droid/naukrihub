const { GoogleGenAI } = require("@google/genai");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const serviceAccount = require("../naukrihub-indexing-key.json");

initializeApp({
    credential: cert(serviceAccount),
    projectId: "naukrihub-61299"
});

const db = getFirestore();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const JOB_ID = "o54XLB6Gl7Dz43Y9h3cx";

function validateJob(job, sourceJob) {
    const requiredFields = [
        "title",
        "company",
        "location",
        "category",
        "experience",
        "type",
        "salary",
        "description",
        "applyUrl"
    ];

    for (const field of requiredFields) {
        if (
            typeof job[field] !== "string" ||
            !job[field].trim()
        ) {
            throw new Error(`Invalid or missing field: ${field}`);
        }
    }

    if (job.applyUrl !== sourceJob.applyUrl) {
        throw new Error("applyUrl was modified by AI");
    }

    try {
        const url = new URL(job.applyUrl);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            throw new Error("Invalid URL protocol");
        }
    } catch {
        throw new Error("Invalid applyUrl");
    }

    return job;
}

async function main() {
    try {
        console.log("Reading job from Firestore...");

        const doc = await db
            .collection("jobs")
            .doc(JOB_ID)
            .get();

        if (!doc.exists) {
            throw new Error(`Job not found: ${JOB_ID}`);
        }

        const sourceJob = doc.data();

        console.log("Firestore job found:");
        console.log(`${sourceJob.title} | ${sourceJob.company}`);

        const prompt = `
You are the job-processing AI for NaukriHub.

Process the supplied job information and return ONLY valid JSON.

The output MUST contain exactly these fields:

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

1. Preserve factual information from the source.
2. Do NOT invent salary.
3. Do NOT invent experience.
4. Do NOT invent employer, location, job type or other facts.
5. Keep the original applyUrl EXACTLY unchanged.
6. Improve the description only by making it clear, professional and concise.
7. If experience is genuinely unavailable, use "Not specified".
8. If salary is genuinely unavailable, use "Salary not disclosed".
9. Return JSON only.
10. Do not use markdown.
11. Do not add additional fields.

SOURCE JOB:
${JSON.stringify(sourceJob, null, 2)}
`;

        console.log("\nSending Firestore job to Gemini...");

        const response = await ai.interactions.create({
            model: "gemini-3.6-flash",
            input: prompt
        });

        const raw = response.output_text.trim();

        console.log("\n===== RAW AI OUTPUT =====\n");
        console.log(raw);

        let parsed;

        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error("Gemini did not return valid JSON");
        }

        const validated = validateJob(parsed, sourceJob);

        console.log(
            "\n===== VALIDATED NAUKRIHUB JOB =====\n"
        );

        console.log(
            JSON.stringify(validated, null, 2)
        );

        console.log("\nSaving AI result to Firestore...");

        await db
            .collection("jobs")
            .doc(JOB_ID)
            .update({
                aiProcessed: validated,
                aiProcessedAt: FieldValue.serverTimestamp()
            });

        console.log("\n===== FIRESTORE UPDATE SUCCESS =====");

        console.log(
            `AI result saved to jobs/${JOB_ID}/aiProcessed`
        );

        console.log(
            "\nAI FIRESTORE → GEMINI → FIRESTORE: SUCCESS"
        );

    } catch (error) {
        console.error(
            "\nAI FIRESTORE → GEMINI → FIRESTORE ERROR:",
            error.message
        );

        process.exitCode = 1;
    }
}

main();