const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

const GEMINI_MODEL = "gemini-3-flash-preview";


function validateJob(job, sourceJob) {

    const requiredFields = [
        "title",
        "company",
        "location",
        "category",
        "experience",
        "type",
        "salary",
        "description"
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


    // ==========================================
    // APPLICATION METHOD VALIDATION
    // ==========================================

    const sourceApplyUrl =
        typeof sourceJob.applyUrl === "string"
            ? sourceJob.applyUrl.trim()
            : "";

    const sourceApplicationEmail =
        typeof sourceJob.applicationEmail === "string"
            ? sourceJob.applicationEmail.trim()
            : "";

    const aiApplyUrl =
        typeof job.applyUrl === "string"
            ? job.applyUrl.trim()
            : "";

    const aiApplicationEmail =
        typeof job.applicationEmail === "string"
            ? job.applicationEmail.trim()
            : "";


    if (
        !sourceApplyUrl &&
        !sourceApplicationEmail
    ) {
        throw new Error(
            "Source job has no valid application URL or email"
        );
    }


    if (
        !aiApplyUrl &&
        !aiApplicationEmail
    ) {
        throw new Error(
            "AI result has no valid application URL or email"
        );
    }


    // ==========================================
    // APPLY URL MUST REMAIN EXACTLY SAME
    // ==========================================

    if (aiApplyUrl !== sourceApplyUrl) {

        throw new Error(
            "applyUrl was modified by AI"
        );
    }


    // ==========================================
    // APPLICATION EMAIL MUST REMAIN EXACTLY SAME
    // ==========================================

    if (
        aiApplicationEmail !==
        sourceApplicationEmail
    ) {

        throw new Error(
            "applicationEmail was modified by AI"
        );
    }


    // ==========================================
    // URL VALIDATION
    // ==========================================

    if (sourceApplyUrl) {

        try {

            const url =
                new URL(sourceApplyUrl);

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
    }


    // ==========================================
    // EMAIL VALIDATION
    // ==========================================

    if (sourceApplicationEmail) {

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailRegex.test(
                sourceApplicationEmail
            )
        ) {
            throw new Error(
                "Invalid applicationEmail"
            );
        }
    }


    return {
        ...job,
        applyUrl: sourceApplyUrl,
        applicationEmail: sourceApplicationEmail
    };
}



async function processJob(jobId) {

    console.log(
        `Starting AI processing for job: ${jobId}`
    );


    // ==========================================
    // GEMINI API KEY
    // ==========================================

    const apiKey =
        process.env.GEMINI_API_KEY;

    if (!apiKey) {

        throw new Error(
            "GEMINI_API_KEY is not configured"
        );
    }


    // ==========================================
    // GET JOB
    // ==========================================

    const doc =
        await db
            .collection("jobs")
            .doc(jobId)
            .get();


    if (!doc.exists) {

        throw new Error(
            `Job not found: ${jobId}`
        );
    }


    const sourceJob =
        doc.data();


    console.log(
        `Processing: ${sourceJob.title} | ${sourceJob.company}`
    );


    // ==========================================
    // APPLICATION DATA
    // ==========================================

    const sourceApplyUrl =
        typeof sourceJob.applyUrl === "string"
            ? sourceJob.applyUrl.trim()
            : "";

    const sourceApplicationEmail =
        typeof sourceJob.applicationEmail === "string"
            ? sourceJob.applicationEmail.trim()
            : "";


    if (
        !sourceApplyUrl &&
        !sourceApplicationEmail
    ) {

        throw new Error(
            "Source job has no application URL or application email"
        );
    }


    // ==========================================
    // AI PROMPT
    // ==========================================

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
  "applyUrl": "",
  "applicationEmail": ""
}

RULES:

1. Preserve all factual information from the source job.

2. Do NOT invent salary.

3. Do NOT invent experience.

4. Do NOT invent employer.

5. Do NOT invent location.

6. Do NOT invent job type.

7. Do NOT invent category.

8. Do NOT invent any other factual information.

9. Improve the description only by making it clear, professional and concise.

10. If experience is genuinely unavailable, use "Not specified".

11. If salary is genuinely unavailable, use "Salary not disclosed".

12. The original applyUrl MUST be copied EXACTLY.

13. Never modify the original applyUrl.

14. Never create a new applyUrl.

15. Never replace the original applyUrl with another website.

16. The original applicationEmail MUST be copied EXACTLY.

17. Never modify the original applicationEmail.

18. Never create a new applicationEmail.

19. Never replace the original applicationEmail with another email.

20. If the source has no applyUrl, return applyUrl as an empty string.

21. If the source has no applicationEmail, return applicationEmail as an empty string.

22. At least one of applyUrl or applicationEmail will exist in the source.

23. Return JSON only.

24. Do not use markdown.

25. Do not add additional fields.

IMPORTANT:

APPLICATION URL FROM SOURCE:
${sourceApplyUrl}

APPLICATION EMAIL FROM SOURCE:
${sourceApplicationEmail}

Both values must be preserved exactly.

SOURCE JOB:
${JSON.stringify(sourceJob, null, 2)}

`;


    console.log(
        "Sending job to Gemini..."
    );


    // ==========================================
    // GEMINI GENERATE CONTENT
    // ==========================================

    const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        GEMINI_MODEL +
        ":generateContent?key=" +
        encodeURIComponent(apiKey);


    const payload = {

        contents: [

            {
                parts: [

                    {
                        text: prompt
                    }

                ]
            }

        ]

    };


    const response =
        await fetch(url, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)

        });


    const body =
        await response.text();


    console.log(
        `Gemini HTTP status: ${response.status}`
    );


    if (!response.ok) {

        console.error(
            "Gemini API error:",
            body
        );

        throw new Error(
            `Gemini API failed. HTTP ${response.status}: ${body}`
        );
    }


    let geminiResponse;

    try {

        geminiResponse =
            JSON.parse(body);

    } catch {

        throw new Error(
            "Gemini returned invalid API response"
        );
    }


    // ==========================================
    // EXTRACT AI TEXT
    // ==========================================

    const raw =
        geminiResponse
            ?.candidates?.[0]
            ?.content?.parts?.[0]
            ?.text
            ?.trim();


    if (!raw) {

        throw new Error(
            "Gemini returned empty response"
        );
    }


    console.log("");
    console.log("===== RAW AI OUTPUT =====");
    console.log("");
    console.log(raw);


    // ==========================================
    // PARSE JSON
    // ==========================================

    let parsed;

    try {

        parsed =
            JSON.parse(raw);

    } catch {

        throw new Error(
            "Gemini did not return valid JSON"
        );
    }


    // ==========================================
    // VALIDATE AI RESULT
    // ==========================================

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


    // ==========================================
    // SAVE AI RESULT
    // ==========================================

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
        "AI FIRESTORE -> GEMINI -> FIRESTORE: SUCCESS"
    );

    console.log("");


    return validated;
}



module.exports = {
    processJob
};