const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();

exports.jobPage = onRequest(async (req, res) => {
    try {
        const jobId = req.query.id;

        if (!jobId) {
            res.status(400).send("Job ID missing");
            return;
        }

        const jobDoc = await db.collection("jobs").doc(String(jobId)).get();

        if (!jobDoc.exists) {
            res.status(404).send("Job not found");
            return;
        }

        const job = jobDoc.data();

        if (
            String(job.status || "")
                .trim()
                .toLowerCase() !== "approved"
        ) {
            res.status(404).send("Job not available");
            return;
        }

        const title = String(job.title || "");
        const company = String(job.company || "NaukriHub");
        const description = String(
            job.description || title
        );

        let datePosted = new Date().toISOString();

        if (job.createdAt) {
            const parsedDate = new Date(job.createdAt);

            if (!isNaN(parsedDate.getTime())) {
                datePosted = parsedDate.toISOString();
            }
        }

        let employmentType = "FULL_TIME";

        const jobType = String(
            job.type || "Full Time"
        )
            .trim()
            .toLowerCase();

        if (jobType.includes("part")) {
            employmentType = "PART_TIME";
        } else if (jobType.includes("intern")) {
            employmentType = "INTERN";
        } else if (jobType.includes("contract")) {
            employmentType = "CONTRACTOR";
        } else if (jobType.includes("temporary")) {
            employmentType = "TEMPORARY";
        }

        const protocol =
            req.headers["x-forwarded-proto"] || "https";

        const host =
            req.headers["x-forwarded-host"] || req.headers.host;

        const jobURL =
            `${protocol}://${host}/job?id=${encodeURIComponent(jobId)}`;

        const schema = {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": title,
            "description": description,
            "datePosted": datePosted,
            "employmentType": employmentType,

            "hiringOrganization": {
                "@type": "Organization",
                "name": company,
                "sameAs": `https://${host}`
            },

            "jobLocation": {
                "@type": "Place",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality":
                        String(job.location || "India"),
                    "addressCountry": "IN"
                }
            },

            "url": jobURL
        };

        const safeJSON = JSON.stringify(schema)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026");

        res.set("Cache-Control", "public, max-age=300");

        res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <title>${escapeHTML(title)} - ${escapeHTML(company)} | NaukriHub</title>

    <meta
        name="description"
        content="${escapeHTML(description.substring(0, 155))}"
    >

    <link rel="canonical" href="${escapeAttribute(jobURL)}">

    <script type="application/ld+json">${safeJSON}</script>
</head>

<body>
    <h1>${escapeHTML(title)}</h1>

    <h2>${escapeHTML(company)}</h2>

    <p>
        <strong>Location:</strong>
        ${escapeHTML(job.location || "India")}
    </p>

    <p>
        <strong>Category:</strong>
        ${escapeHTML(job.category || "")}
    </p>

    <p>
        <strong>Experience:</strong>
        ${escapeHTML(job.experience || "Not specified")}
    </p>

    <p>
        <strong>Job Type:</strong>
        ${escapeHTML(job.type || "Full Time")}
    </p>

    <p>
        <strong>Salary:</strong>
        ${escapeHTML(job.salary || "Not disclosed")}
    </p>

    <h3>Job Description</h3>

    <p>${escapeHTML(description)}</p>

    <p>
        <a href="/">View all jobs on NaukriHub</a>
    </p>
</body>
</html>
        `);

    } catch (error) {
        console.error("Job page error:", error);

        res.status(500).send("Unable to load job.");
    }
});


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}