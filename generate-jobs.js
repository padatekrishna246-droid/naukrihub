const fs = require("fs");
const path = require("path");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccountPath = path.join(
    __dirname,
    "serviceAccountKey.json"
);

if (!fs.existsSync(serviceAccountPath)) {
    console.error("? serviceAccountKey.json not found!");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const outputDir = path.join(__dirname, "jobs");

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {
        recursive: true
    });
}

const BASE_URL = "https://naukrihub-61299.web.app";

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

function getApplicationEmail(job, aiJob) {
    return String(
        job.applicationEmail ||
        job.email ||
        job.applyEmail ||
        aiJob.applicationEmail ||
        aiJob.email ||
        aiJob.applyEmail ||
        ""
    ).trim();
}

function getApplicationUrl(job, aiJob) {
    return String(
        job.applicationUrl ||
        job.applyUrl ||
        job.applicationURL ||
        aiJob.applicationUrl ||
        aiJob.applyUrl ||
        aiJob.applicationURL ||
        ""
    ).trim();
}

async function generateJobs() {

    console.log("?? Reading approved jobs from Firestore...");

    const snapshot = await db
        .collection("jobs")
        .where("status", "==", "approved")
        .get();

    console.log(`? ${snapshot.size} approved jobs found`);

    const sitemapURLs = [];

    sitemapURLs.push(`${BASE_URL}/`);

    for (const doc of snapshot.docs) {

        const job = doc.data();
        const id = doc.id;

        const aiJob = job.aiProcessed || {};

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
            "Not Disclosed"
        );

        const applicationEmail =
            getApplicationEmail(job, aiJob);

        const applicationUrl =
            getApplicationUrl(job, aiJob);

        let employmentType = "FULL_TIME";

        const lowerType = type
            .toLowerCase()
            .trim();

        if (lowerType.includes("part")) {
            employmentType = "PART_TIME";
        } else if (lowerType.includes("intern")) {
            employmentType = "INTERN";
        } else if (lowerType.includes("contract")) {
            employmentType = "CONTRACTOR";
        } else if (lowerType.includes("temporary")) {
            employmentType = "TEMPORARY";
        }

        const datePosted =
            getDatePosted(job.createdAt);

        const slug =
            makeSlug(title, id);

        const jobURL =
            `${BASE_URL}/jobs/${slug}.html`;

        /*
        ==========================================
        JOBPOSTING SCHEMA
        ==========================================
        */

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
                "sameAs": `${BASE_URL}/`
            },

            "jobLocation": {
                "@type": "Place",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": location,
                    "addressCountry": "IN"
                }
            },

            "url": jobURL
        };

        if (applicationUrl) {
            schema.directApply = true;
        }

        const schemaJSON =
            JSON.stringify(schema)
                .replace(/</g, "\\u003c")
                .replace(/>/g, "\\u003e")
                .replace(/&/g, "\\u0026");

        /*
        ==========================================
        APPLY SECTION
        ==========================================
        */

        let applySection = "";

        if (applicationUrl || applicationEmail) {

            applySection = `
<section class="apply-card">

    <div class="apply-heading">

        <div class="apply-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg>
        </div>

        <div>
            <h2>
                Ready to Apply?
            </h2>

            <p>
                Take the next step in your career.
            </p>
        </div>

    </div>

    <div class="apply-actions">

        ${
            applicationUrl
                ? `
        <a
            class="apply-primary"
            href="${escapeHTML(applicationUrl)}"
            target="_blank"
            rel="noopener noreferrer"
        >
            Apply Now
            <span class="button-arrow" aria-hidden="true">→</span>
        </a>
        `
                : ""
        }

        ${
            applicationEmail
                ? `
        <a
            class="apply-secondary"
            href="mailto:${escapeHTML(applicationEmail)}"
        >
            <span class="inline-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></span> Apply via Email
        </a>
        `
                : ""
        }

    </div>

    ${
        applicationEmail
            ? `
    <div class="email-row">

        <span class="email-label">
            Application Email
        </span>

        <a
            href="mailto:${escapeHTML(applicationEmail)}"
        >
            ${escapeHTML(applicationEmail)}
        </a>

    </div>
    `
            : ""
    }

</section>
`;
        }

        /*
        ==========================================
        HTML PAGE
        ==========================================
        */

        const html = `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
${escapeHTML(title)} - ${escapeHTML(company)} | NaukriHub
</title>

<meta
    name="description"
    content="${escapeHTML(description)}"
>

<link
    rel="canonical"
    href="${escapeHTML(jobURL)}"
>

<script type="application/ld+json">
${schemaJSON}
</script>

<style>

* {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    margin: 0;

    font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;

    background: #f5f7fb;
    color: #172033;

    line-height: 1.6;
}

a {
    text-decoration: none;
}

/* ==============================
   HEADER
   ============================== */

.header {
    background: #ffffff;

    border-bottom:
        1px solid #e8ebf2;

    position: sticky;
    top: 0;

    z-index: 100;

    box-shadow:
        0 3px 16px rgba(15, 23, 42, 0.04);
}

.header-inner {
    max-width: 1180px;

    margin: auto;

    min-height: 72px;

    padding:
        0 24px;

    display: flex;

    align-items: center;

    justify-content: space-between;
}

.logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    font-size: 27px;
    font-weight: 850;
    letter-spacing: -1px;
    color: #111827;
}

.logo-mark {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #ffffff !important;
    font-size: 21px;
    font-weight: 900;
    letter-spacing: -0.5px;
    box-shadow: 0 7px 18px rgba(37, 99, 235, 0.22);
}

.logo span:last-child {
    color: #111827;
}

.logo span:last-child span {
    color: #2563eb;
}

.home-link {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
    color: #1f2937;
    font-size: 15px;
    font-weight: 750;
    padding: 10px 15px;
    border: 1px solid #e2e8f0;
    border-radius: 11px;
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.home-icon {
    width: 19px;
    height: 19px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex: 0 0 auto;
}

.home-link:hover {
    background: #f8fbff;
    color: #2563eb;
    border-color: #bfdbfe;
    box-shadow: 0 7px 18px rgba(37, 99, 235, 0.10);
    transform: translateY(-1px);
}

/* ==============================
   MAIN
   ============================== */

.page {
    max-width: 1180px;

    margin: auto;

    padding:
        35px 24px 70px;
}

.breadcrumb {
    margin-bottom: 20px;

    font-size: 14px;

    color: #7b8495;
}

.breadcrumb a {
    color: #2563eb;

    text-decoration: none;

    font-weight: 700;
}

.job-layout {
    display: grid;

    grid-template-columns:
        minmax(0, 1fr)
        320px;

    gap: 25px;

    align-items: start;
}

/* ==============================
   JOB MAIN CARD
   ============================== */

.job-card {
    background: #ffffff;

    border:
        1px solid #e7eaf0;

    border-radius: 20px;

    padding: 34px;

    box-shadow:
        0 12px 38px rgba(15, 23, 42, 0.06);
}

/* ==============================
   JOB HEADER
   ============================== */

.job-top {
    display: block;
}

/*
   FULL COMPANY NAME
   Instead of P / A initial box
*/

.company-logo {
    display: inline-flex;

    align-items: center;

    justify-content: center;

    max-width: 100%;

    min-height: 46px;

    padding:
        9px 16px;

    margin-bottom: 19px;

    border-radius: 11px;

    background: #eef4ff;

    border:
        1px solid #d9e6ff;

    color: #2563eb;

    font-size: 15px;

    line-height: 1.35;

    font-weight: 850;

    word-break: break-word;
}

.job-title {
    margin:
        0 0 9px;

    font-size:
        clamp(28px, 4vw, 38px);

    line-height: 1.2;

    letter-spacing:
        -0.8px;

    color: #111827;

    font-weight: 850;
}

.company {
    margin: 0;

    color: #2563eb;

    font-size: 18px;

    font-weight: 750;
}

/* ==============================
   BADGES
   ============================== */

.badges {
    display: flex;

    flex-wrap: wrap;

    gap: 9px;

    margin-top: 25px;

    padding-top: 23px;

    border-top:
        1px solid #edf0f5;
}

.badge {
    display: inline-flex;

    align-items: center;

    gap: 7px;

    padding:
        9px 13px;

    background: #f7f9fc;

    border:
        1px solid #e7eaf0;

    border-radius: 9px;

    font-size: 14px;

    color: #374151;

    font-weight: 650;
}

.badge-icon {
    width: 17px;
    height: 17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #2563eb;
    flex: 0 0 17px;
}

.badge-icon svg {
    width: 17px;
    height: 17px;
}

/* ==============================
   DESCRIPTION
   ============================== */

.description-section {
    margin-top: 34px;

    padding-top: 30px;

    border-top:
        1px solid #edf0f5;
}

.section-title {
    margin:
        0 0 17px;

    font-size: 23px;

    color: #111827;

    font-weight: 850;
}

.description {
    font-size: 16px;

    line-height: 1.85;

    color: #4b5563;

    white-space: pre-line;

    overflow-wrap: anywhere;
}

/* ==============================
   APPLY CARD
   ============================== */

.apply-card {
    margin-top: 28px;

    padding: 24px 25px;

    border-radius: 16px;

    border:
        1px solid #dbe5ff;

    background:
        linear-gradient(
            135deg,
            #f7f9ff,
            #f1f6ff
        );
}

.apply-heading {
    display: flex;

    align-items: center;

    gap: 14px;

    margin-bottom: 20px;
}

.apply-icon {
    width: 46px;

    height: 46px;

    min-width: 46px;

    border-radius: 12px;

    background: #2563eb;

    color: #ffffff;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 22px;

    font-weight: 700;

    box-shadow:
        0 6px 15px
        rgba(37, 99, 235, 0.20);
}

.apply-heading h2 {
    margin:
        0 0 3px;

    font-size: 20px;

    color: #111827;
}

.apply-heading p {
    margin: 0;

    font-size: 14px;

    color: #6b7280;
}

.apply-actions {
    display: flex;

    gap: 11px;

    flex-wrap: wrap;
}

.apply-primary,
.apply-secondary {
    min-height: 49px;

    padding:
        0 21px;

    border-radius: 10px;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    gap: 10px;

    text-decoration: none;

    font-weight: 800;

    font-size: 15px;

    transition:
        transform 0.2s,
        box-shadow 0.2s;
}

.apply-primary {
    background: #2563eb;

    color: #ffffff;

    box-shadow:
        0 8px 20px
        rgba(37, 99, 235, 0.24);
}

.apply-secondary {
    background: #ffffff;

    color: #2563eb;

    border:
        1px solid #cdd9f5;
}

.apply-primary:hover,
.apply-secondary:hover {
    transform:
        translateY(-2px);
}

.apply-primary:hover {
    box-shadow:
        0 11px 26px
        rgba(37, 99, 235, 0.30);
}

.email-row {
    margin-top: 17px;

    padding-top: 17px;

    border-top:
        1px solid #e1e7f5;
}

.email-label {
    display: block;

    margin-bottom: 5px;

    font-size: 12px;

    text-transform: uppercase;

    letter-spacing:
        0.5px;

    color: #7b8495;

    font-weight: 750;
}

.email-row a {
    color: #2563eb;

    text-decoration: none;

    font-size: 15px;

    font-weight: 650;

    word-break: break-word;
}

.apply-icon svg {
    width: 22px;
    height: 22px;
}

.inline-icon {
    width: 17px;
    height: 17px;
    display: inline-flex;
}

.inline-icon svg {
    width: 17px;
    height: 17px;
}

.button-arrow {
    font-size: 18px;
    line-height: 1;
}

.back-arrow {
    font-size: 17px;
    line-height: 1;
}

/* ==============================
   SIDE CARD
   ============================== */

.side-card {
    background: #ffffff;

    border:
        1px solid #e7eaf0;

    border-radius: 18px;

    padding: 25px;

    box-shadow:
        0 10px 30px
        rgba(15, 23, 42, 0.05);

    position: sticky;

    top: 95px;
}

.side-title {
    margin:
        0 0 20px;

    font-size: 21px;

    color: #111827;

    font-weight: 850;
}

.side-item {
    padding:
        15px 0;

    border-bottom:
        1px solid #edf0f5;
}

.side-item:last-child {
    border-bottom: none;
}

.side-label {
    display: block;

    font-size: 11px;

    color: #8a93a3;

    margin-bottom: 5px;

    text-transform: uppercase;

    letter-spacing:
        0.6px;

    font-weight: 800;
}

.side-value {
    color: #273244;

    font-size: 14px;

    font-weight: 700;

    overflow-wrap: anywhere;
}

/* ==============================
   BACK
   ============================== */

.back-link {
    display: inline-flex;

    align-items: center;

    gap: 8px;

    margin-top: 25px;

    color: #2563eb;

    text-decoration: none;

    font-size: 14px;

    font-weight: 750;
}

.back-link:hover {
    text-decoration: underline;
}

/* ==============================
   FOOTER
   ============================== */

.footer {
    background: #111827;

    color: #9ca3af;

    text-align: center;

    padding:
        28px 20px;

    font-size: 13px;
}

.footer strong {
    color: #ffffff;
}

/* ==============================
   TABLET
   ============================== */

@media (max-width: 850px) {

    .job-layout {
        grid-template-columns: 1fr;
    }

    .side-card {
        position: static;
    }
}

/* ==============================
   MOBILE
   ============================== */

@media (max-width: 600px) {

    .header-inner {
        min-height: 64px;

        padding:
            0 16px;
    }

    .logo {
        font-size: 24px;
    }

    .home-link {
        padding:
            8px 12px;

        font-size: 14px;
    }

    .page {
        padding:
            21px 12px 45px;
    }

    .job-card {
        padding: 21px;

        border-radius: 15px;
    }

    .company-logo {
        min-height: 43px;

        padding:
            8px 13px;

        margin-bottom: 16px;

        font-size: 14px;
    }

    .job-title {
        font-size: 25px;
    }

    .company {
        font-size: 16px;
    }

    .badges {
        gap: 7px;

        margin-top: 20px;

        padding-top: 19px;
    }

    .badge {
        font-size: 13px;

        padding:
            8px 10px;
    }

    .description-section {
        margin-top: 28px;

        padding-top: 24px;
    }

    .section-title {
        font-size: 21px;
    }

    .description {
        font-size: 15px;

        line-height: 1.75;
    }

    .apply-card {
        padding: 20px;
    }

    .apply-actions {
        flex-direction: column;
    }

    .apply-primary,
    .apply-secondary {
        width: 100%;
    }

    .side-card {
        padding: 20px;
    }

    .breadcrumb {
        font-size: 13px;
    }
}

</style>

</head>

<body>

<header class="header">

    <div class="header-inner">

        <a class="logo" href="/" aria-label="NaukriHub home">
            <span class="logo-mark">N</span>
            <span>Naukri<span>Hub</span></span>
        </a>

        <a class="home-link" href="/">
            <svg class="home-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5"></path>
                <path d="M5.5 9.5V21h13V9.5"></path>
                <path d="M9.5 21v-6h5v6"></path>
            </svg>
            <span>Home</span>
        </a>

    </div>

</header>


<main class="page">

    <div class="breadcrumb">

        <a href="/">
            NaukriHub
        </a>

        <span>
            / Job Details
        </span>

    </div>


    <div class="job-layout">


        <article class="job-card">


            <div class="job-top">


                <div class="company-logo">

                    ${escapeHTML(company)}

                </div>


                <div>

                    <h1 class="job-title">

                        ${escapeHTML(title)}

                    </h1>


                    <p class="company">

                        ${escapeHTML(company)}

                    </p>

                </div>


            </div>


            <div class="badges">


                <div class="badge">

                    <span class="badge-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg>
                    </span>

                    ${escapeHTML(location)}

                </div>


                <div class="badge">

                    <span class="badge-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M3 12h18"/></svg>
                    </span>

                    ${escapeHTML(type)}

                </div>


                <div class="badge">

                    <span class="badge-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                    </span>

                    ${escapeHTML(experience)}

                </div>


                <div class="badge">

                    <span class="badge-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M16 7.5c0-1.4-1.5-2.5-3.5-2.5S9 6.1 9 7.5 10.2 9.7 12.5 10c2.2.3 3.5 1.1 3.5 2.8s-1.5 2.7-3.8 2.7S8.5 14.4 8.5 13"/></svg>
                    </span>

                    ${escapeHTML(salary)}

                </div>


            </div>


            <section class="description-section">


                <h2 class="section-title">

                    Job Description

                </h2>


                <div class="description">

                    ${escapeHTML(description)}

                </div>


            </section>


            ${applySection}


            <a
                class="back-link"
                href="/"
            >

                <span class="back-arrow" aria-hidden="true">←</span> Back to NaukriHub

            </a>


        </article>


        <aside class="side-card">


            <h2 class="side-title">

                Job Overview

            </h2>


            <div class="side-item">

                <span class="side-label">
                    Company
                </span>

                <span class="side-value">

                    ${escapeHTML(company)}

                </span>

            </div>


            <div class="side-item">

                <span class="side-label">
                    Location
                </span>

                <span class="side-value">

                    ${escapeHTML(location)}

                </span>

            </div>


            <div class="side-item">

                <span class="side-label">
                    Experience
                </span>

                <span class="side-value">

                    ${escapeHTML(experience)}

                </span>

            </div>


            <div class="side-item">

                <span class="side-label">
                    Job Type
                </span>

                <span class="side-value">

                    ${escapeHTML(type)}

                </span>

            </div>


            <div class="side-item">

                <span class="side-label">
                    Salary
                </span>

                <span class="side-value">

                    ${escapeHTML(salary)}

                </span>

            </div>


        </aside>


    </div>

</main>


<footer class="footer">

    © ${new Date().getFullYear()}

    <strong>NaukriHub</strong>.

    All rights reserved.

</footer>


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
            `? Created: jobs/${slug}.html`
        );

        sitemapURLs.push(jobURL);
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
        `??? Sitemap generated: ${sitemapURLs.length} URLs`
    );

    console.log("");

    console.log(
        "?? All job pages and sitemap generated successfully!"
    );
}

generateJobs().catch((error) => {

    console.error(
        "Generate jobs failed:",
        error.message
    );

    process.exitCode = 1;
});
