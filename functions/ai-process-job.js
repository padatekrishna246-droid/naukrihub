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
            throw new Error(
                `Invalid or missing field: ${field}`
            );
        }
    }


    // Source job MUST have an apply URL
    if (
        typeof sourceJob.applyUrl !== "string" ||
        !sourceJob.applyUrl.trim()
    ) {
        throw new Error(
            "Source job has no valid applyUrl"
        );
    }


    // AI MUST preserve the original apply URL exactly
    if (job.applyUrl !== sourceJob.applyUrl) {

        throw new Error(
            "applyUrl was modified by AI"
        );
    }


    // Validate URL protocol
    try {

        const url = new URL(job.applyUrl);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            throw new Error(
                "Invalid URL protocol"
            );
        }

    } catch {

        throw new Error(
            "Invalid applyUrl"
        );
    }


    return job;
}


async function processJob(jobId) {

    console.log("");
    console.log("==========================================");
    console.log("NaukriHub Repeatable AI Job Processor");
    console.log("==========================================");
    console.log("");

    console.log(`Job ID: ${jobId}`);
    console.log("");

    console.log(
        "Reading job from Firestore..."
    );


    const doc = await db
        .collection("jobs")
        .doc(jobId)
        .get();


    if (!doc.exists) {

        throw new Error(
            `Job not found: ${jobId}`
        );
    }


    const sourceJob = doc.data();


    console.log("");
    console.log("Firestore job found:");

    console.log(
        `${sourceJob.title} | ${sourceJob.company}`
    );


    // Stop immediately if source job has no apply URL
    if (
        typeof sourceJob.applyUrl !== "string" ||
        !sourceJob.applyUrl.trim()
    ) {

        throw new Error(
            "Source job has no valid applyUrl"
        );
    }


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
4. Do NOT invent employer.
5. Do NOT invent location.
6. Do NOT invent job type.
7. Do NOT invent category.
8. Do NOT invent any other factual information.
9. Keep the original applyUrl EXACTLY unchanged.
10. Never replace the applyUrl with another website.
11. Never create a new applyUrl.
12. Improve the description only by making it clear, professional and concise.
13. If experience is genuinely unavailable, use "Not specified".
14. If salary is genuinely unavailable, use "Salary not disclosed".
15. Return JSON only.
16. Do not use markdown.
17. Do not add additional fields.

IMPORTANT:
The applyUrl from the SOURCE JOB must be copied EXACTLY.
Do not modify even one character.

SOURCE JOB:
${JSON.stringify(sourceJob, null, 2)}
`;


    console.log("");
    console.log(
        "Sending job to Gemini..."
    );


    const response = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: prompt
    });


    const raw =
        response.output_text.trim();


    console.log("");
    console.log("===== RAW AI OUTPUT =====");
    console.log("");
    console.log(raw);


    let parsed;


    try {

        parsed = JSON.parse(raw);

    } catch {

        throw new Error(
            "Gemini did not return valid JSON"
        );
    }


    const validated =
        validateJob(
            parsed,
            sourceJob
        );


    console.log("");
    console.log(
        "===== VALIDATED NAUKRIHUB JOB ====="
    );

    console.log("");

    console.log(
        JSON.stringify(
            validated,
            null,
            2
        )
    );


    console.log("");
    console.log(
        "Saving AI result to Firestore..."
    );


    await db
        .collection("jobs")
        .doc(jobId)
        .update({

            aiProcessed:
                validated,

            aiProcessedAt:
                FieldValue.serverTimestamp()
        });


    console.log("");
    console.log(
        "===== FIRESTORE UPDATE SUCCESS ====="
    );

    console.log("");

    console.log(
        `AI result saved to jobs/${jobId}/aiProcessed`
    );

    console.log("");

    console.log(
        "AI FIRESTORE → GEMINI → FIRESTORE: SUCCESS"
    );

    console.log("");
}


async function main() {

    try {

        const jobId =
            process.argv[2];


        if (!jobId) {

            throw new Error(
                "Job ID missing. Usage: node .\\functions\\ai-process-job.js JOB_ID"
            );
        }


        await processJob(
            String(jobId).trim()
        );


    } catch (error) {

        console.error("");
        console.error(
            "AI JOB PROCESSING ERROR:",
            error.message
        );

        process.exitCode = 1;
    }
}


main();