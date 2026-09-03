const fs = require("fs");
const path = require("path");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccountPath = path.join(
    __dirname,
    "serviceAccountKey.json"
);

if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ serviceAccountKey.json not found!");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const outputDir = path.join(
    __dirname,
    "jobs"
);

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {
        recursive: true
    });
}

const BASE_URL =
    "https://naukrihub-61299.web.app";

function escapeHTML(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function makeSlug(title, id) {
    const slug = String(title || "job")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `${slug}-${id}`;
}

function getDatePosted(createdAt) {

    if (!createdAt) {
        return new Date().toISOString();
    }

    if (
        createdAt.toDate &&
        typeof createdAt.toDate === "function"
    ) {
        return createdAt.toDate().toISOString();
    }

    const date = new Date(createdAt);

    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }

    return new Date().toISOString();
}

async function generateJobs() {

    console.log(
        "🔄 Reading approved jobs from Firestore..."
    );

    const snapshot = await db
        .collection("jobs")
        .where("status", "==", "approved")
        .get();

    console.log(
        `✅ ${snapshot.size} approved jobs found`
    );

    const sitemapURLs = [];

    /*
    ==========================================
    HOMEPAGE
    ==========================================
    */

    sitemapURLs.push(
        `${BASE_URL}/`
    );

    /*
    ==========================================
    GENERATE JOB PAGES
    ==========================================
    */

    for (const doc of snapshot.docs) {

        const job = doc.data();
        const id = doc.id;

        /*
        ==========================================
        AI PROCESSED JOB DATA
        ==========================================
        */

        const aiJob = job.aiProcessed || {};

        /*
        ==========================================
        USE AI DATA FIRST
        FALLBACK TO ORIGINAL JOB DATA
        ==========================================
        */

        const title = String(
            aiJob.title ||
            job.title ||
            "Job Opportunity"
        );

        const company = String(
            aiJob.company ||
            job.company ||
            "NaukriHub"
        );

        const description = String(
            aiJob.description ||
            job.description ||
            `Apply for ${title} at ${company}.`
        );

        const location = String(
            aiJob.location ||
            job.location ||
            "India"
        );

        const type = String(
            aiJob.type ||
            job.type ||
            "Full Time"
        );

        const experience = String(
            aiJob.experience ||
            job.experience ||
            "Not specified"
        );

        const salary = String(
            aiJob.salary ||
            job.salary ||
            "Salary not disclosed"
        );

        let employmentType =
            "FULL_TIME";

        const lowerType = type
            .toLowerCase()
            .trim();

        if (
            lowerType.includes("part")
        ) {
            employmentType =
                "PART_TIME";

        } else if (
            lowerType.includes("intern")
        ) {
            employmentType =
                "INTERN";

        } else if (
            lowerType.includes("contract")
        ) {
            employmentType =
                "CONTRACTOR";

        } else if (
            lowerType.includes("temporary")
        ) {
            employmentType =
                "TEMPORARY";
        }

        const datePosted =
            getDatePosted(
                job.createdAt
            );

        const slug =
            makeSlug(
                title,
                id
            );

        const jobURL =
            `${BASE_URL}/jobs/${slug}.html`;

        /*
        ==========================================
        JOBPOSTING SCHEMA
        ==========================================
        */

        const schema = {

            "@context":
                "https://schema.org",

            "@type":
                "JobPosting",

            "title":
                title,

            "description":
                description,

            "datePosted":
                datePosted,

            "employmentType":
                employmentType,

            "hiringOrganization": {

                "@type":
                    "Organization",

                "name":
                    company,

                "sameAs":
                    `${BASE_URL}/`
            },

            "jobLocation": {

                "@type":
                    "Place",

                "address": {

                    "@type":
                        "PostalAddress",

                    "addressLocality":
                        location,

                    "addressCountry":
                        "IN"
                },

            },

            "url":
                jobURL
        };

        const schemaJSON =
            JSON.stringify(schema)
                .replace(
                    /</g,
                    "\\u003c"
                )
                .replace(
                    />/g,
                    "\\u003e"
                )
                .replace(
                    /&/g,
                    "\\u0026"
                );

        /*
        ==========================================
        HTML PAGE
        ==========================================
        */

        const html = `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<title>
${escapeHTML(title)}
-
${escapeHTML(company)}
| NaukriHub
</title>

<meta
    name="description"
    content="${escapeHTML(description)}"
>

<link
    rel="canonical"
    href="${jobURL}"
>

<script type="application/ld+json">
${schemaJSON}
</script>

</head>

<body>

<h1>
${escapeHTML(title)}
</h1>

<h2>
${escapeHTML(company)}
</h2>

<p>
<strong>Location:</strong>
${escapeHTML(location)}
</p>

<p>
<strong>Experience:</strong>
${escapeHTML(experience)}
</p>

<p>
<strong>Job Type:</strong>
${escapeHTML(type)}
</p>

<p>
<strong>Salary:</strong>
${escapeHTML(salary)}
</p>

<h3>
Job Description
</h3>

<p>
${escapeHTML(description)}
</p>

<p>
<a href="/">
Back to NaukriHub
</a>
</p>

</body>

</html>`;

        /*
        ==========================================
        WRITE JOB FILE
        ==========================================
        */

        const filePath =
            path.join(
                outputDir,
                `${slug}.html`
            );

        fs.writeFileSync(
            filePath,
            html,
            "utf8"
        );

        console.log(
            `✅ Created: jobs/${slug}.html`
        );

        /*
        ==========================================
        ADD JOB TO SITEMAP
        ==========================================
        */

        sitemapURLs.push(
            jobURL
        );
    }

    /*
    ==========================================
    GENERATE SITEMAP.XML
    ==========================================
    */

    const sitemapEntries =
        sitemapURLs
            .map(
                (url) => `
    <url>
        <loc>${url}</loc>
    </url>`
            )
            .join("");

    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>

<urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${sitemapEntries}

</urlset>
`;

    const sitemapPath =
        path.join(
            __dirname,
            "sitemap.xml"
        );

    fs.writeFileSync(
        sitemapPath,
        sitemapXML,
        "utf8"
    );

    console.log("");
    console.log(
        `🗺️ Sitemap generated: ${sitemapURLs.length} URLs`
    );

    console.log("");
    console.log(
        "🎉 All job pages and sitemap generated successfully!"
    );
}

generateJobs().catch((error) => {

    console.error(
        "Generate jobs failed:",
        error.message
    );

    process.exitCode = 1;
});