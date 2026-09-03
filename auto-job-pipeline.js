const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");

// Load functions/.env
const envPath = path.join(__dirname, "functions", ".env");

if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");

    for (const line of envFile.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const equalIndex = trimmed.indexOf("=");

        if (equalIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, equalIndex).trim();
        const value = trimmed.slice(equalIndex + 1).trim();

        if (key && value) {
            process.env[key] = value;
        }
    }
}

const serviceAccount = require("./naukrihub-indexing-key.json");

initializeApp({
    credential: cert(serviceAccount),
    projectId: "naukrihub-61299"
});

const db = getFirestore();

function runAI(jobId) {
    return new Promise((resolve, reject) => {

        const scriptPath = path.join(
            __dirname,
            "functions",
            "ai-process-job.js"
        );

        execFile(
            process.execPath,
            [scriptPath, jobId],
            {
                env: {
                    ...process.env
                }
            },
            (error, stdout, stderr) => {

                if (stdout) {
                    console.log(stdout);
                }

                if (stderr) {
                    console.error(stderr);
                }

                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            }
        );
    });
}

async function main() {

    console.log("");
    console.log("======================================");
    console.log("NaukriHub Free AI Job Pipeline");
    console.log("======================================");
    console.log("");

    if (
        typeof process.env.GEMINI_API_KEY !== "string" ||
        !process.env.GEMINI_API_KEY.trim()
    ) {
        throw new Error(
            "GEMINI_API_KEY not found in functions/.env"
        );
    }

    console.log("Gemini API key: LOADED");

    const snapshot = await db
        .collection("jobs")
        .get();

    console.log(`Jobs found: ${snapshot.size}`);

    let processed = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {

        const job = doc.data();
        const jobId = doc.id;

        console.log("");
        console.log(
            `Checking: ${job.title || jobId}`
        );

        // Already AI processed
        if (job.aiProcessed) {

            console.log(
                "Already AI processed → SKIP"
            );

            skipped++;
            continue;
        }

        // Missing apply URL
        if (
            typeof job.applyUrl !== "string" ||
            !job.applyUrl.trim()
        ) {

            console.log(
                "Missing applyUrl → SKIP"
            );

            skipped++;
            continue;
        }

        console.log(
            "New/unprocessed job → AI PROCESSING"
        );

        try {

            await runAI(jobId);

            processed++;

            console.log(
                `AI processing completed: ${jobId}`
            );

        } catch (error) {

            console.error(
                `AI processing failed: ${jobId}`
            );

            console.error(
                error.message
            );
        }
    }

    console.log("");
    console.log("======================================");
    console.log("PIPELINE COMPLETE");
    console.log("======================================");

    console.log(`Processed: ${processed}`);
    console.log(`Skipped: ${skipped}`);
    console.log("");
}

main().catch(error => {

    console.error("");
    console.error(
        "PIPELINE ERROR:",
        error.message
    );

    process.exitCode = 1;
});