// =====================================================
// NAUKRIHUB - MAIN WEBSITE
// USER LOGIN / REGISTER
// JOBS
// SAVED JOBS
// POST JOB
// ADMIN APPROVAL
// GOOGLE JOBPOSTING STRUCTURED DATA / SEO
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    initializeAuth,
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
    apiKey: "AIzaSyAQQOINfCPq651OmGSvl5mIVz5dfk1P54Q",
    authDomain: "naukrihub-61299.firebaseapp.com",
    projectId: "naukrihub-61299",
    storageBucket: "naukrihub-61299.firebasestorage.app",
    messagingSenderId: "1094751577774",
    appId: "1:1094751577774:web:ed1673ac88629aafaeaf3",
    measurementId: "G-3307PZE918"
};


// =====================================================
// FIREBASE START
// =====================================================

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = initializeAuth(app, {
    persistence: browserLocalPersistence
});


// =====================================================
// ADMIN UID
// =====================================================

const ADMIN_UID = "Iygw97231GQ00oHcQqODfziozZF3";


// =====================================================
// GLOBAL STATE
// =====================================================

let allJobs = [];

let currentUser = null;

let savedJobIds = new Set();

let authMode = "login";


// =====================================================
// APPLICATION DATA HELPERS
// =====================================================

function getApplicationUrl(data) {

    if (!data) return "";

    const possibleValues = [
        data.applyUrl,
        data.applicationUrl,
        data.applicationURL,
        data.applicationLink,
        data.applicationLinkUrl,
        data.applyURL,
        data.applyLink,
        data.applyLinkUrl,
        data.jobApplyUrl,
        data.jobApplicationUrl,
        data.url
    ];

    for (const value of possibleValues) {

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {

            return String(value).trim();
        }
    }

    return "";
}


function getApplicationEmail(data) {

    if (!data) return "";

    const possibleValues = [
        data.applicationEmail,
        data.applyEmail,
        data.applicationMail,
        data.email
    ];

    for (const value of possibleValues) {

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {

            return String(value)
                .trim()
                .toLowerCase();
        }
    }

    return "";
}


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(auth, async (user) => {

    currentUser = user || null;

    updateAuthButton();

    updateAdminButton();

    updatePostJobVisibility();

    updateUserWelcome();

    if (currentUser) {

        await loadSavedJobsFromFirebase();

    } else {

        savedJobIds = new Set();

        loadSavedJobs();

        displayJobs(
            getCurrentlyDisplayedJobsSafe()
        );
    }
});


// =====================================================
// AUTH BUTTON
// =====================================================

function updateAuthButton() {

    const button =
        document.getElementById("authButton");

    if (!button) return;

    if (currentUser) {

        const name =
            currentUser.displayName ||
            currentUser.email ||
            "Account";

        button.textContent =
            `${name} • Logout`;

        button.title =
            currentUser.email || "";

        button.onclick =
            logoutUser;

    } else {

        button.textContent =
            "Login / Register";

        button.title = "";

        button.onclick =
            openAuthModal;
    }
}


// =====================================================
// OPEN AUTH MODAL
// =====================================================

window.openAuthModal = function () {

    const modal =
        document.getElementById("authModal");

    if (!modal) return;

    authMode = "login";

    updateAuthModeUI();

    const email =
        document.getElementById("authEmail");

    const password =
        document.getElementById("authPassword");

    const name =
        document.getElementById("authName");

    if (email) email.value = "";

    if (password) password.value = "";

    if (name) name.value = "";

    const message =
        document.getElementById("authMessage");

    if (message) {

        message.textContent = "";

        message.className =
            "auth-message";
    }

    modal.style.display = "flex";
};


// =====================================================
// CLOSE AUTH MODAL
// =====================================================

window.closeAuthModal = function () {

    const modal =
        document.getElementById("authModal");

    if (modal) {

        modal.style.display = "none";
    }
};


// =====================================================
// TOGGLE LOGIN / REGISTER
// =====================================================

window.toggleAuthMode = function () {

    authMode =
        authMode === "login"
            ? "register"
            : "login";

    updateAuthModeUI();

    const message =
        document.getElementById("authMessage");

    if (message) {

        message.textContent = "";

        message.className =
            "auth-message";
    }
};


// =====================================================
// AUTH MODE UI
// =====================================================

function updateAuthModeUI() {

    const title =
        document.getElementById("authTitle");

    const subtitle =
        document.getElementById("authSubtitle");

    const submit =
        document.getElementById("authSubmitBtn");

    const switchText =
        document.getElementById("authSwitchText");

    const switchButton =
        document.getElementById("authSwitchBtn");

    const nameGroup =
        document.getElementById("nameGroup");

    const isRegister =
        authMode === "register";

    if (title) {

        title.textContent =
            isRegister
                ? "Create Account"
                : "Login";
    }

    if (subtitle) {

        subtitle.textContent =
            isRegister
                ? "Create your NaukriHub account."
                : "Login to save jobs and post jobs.";
    }

    if (submit) {

        submit.textContent =
            isRegister
                ? "Create Account"
                : "Login";
    }

    if (switchText) {

        switchText.textContent =
            isRegister
                ? "Already have an account?"
                : "Don't have an account?";
    }

    if (switchButton) {

        switchButton.textContent =
            isRegister
                ? "Login"
                : "Register";
    }

    if (nameGroup) {

        nameGroup.style.display =
            isRegister
                ? "block"
                : "none";
    }
}


// =====================================================
// AUTH MESSAGE
// =====================================================

function showAuthMessage(
    message,
    type = "error"
) {

    const element =
        document.getElementById("authMessage");

    if (!element) return;

    element.textContent = message;

    element.className =
        `auth-message ${type}`;
}


// =====================================================
// FIREBASE AUTH ERROR MESSAGE
// =====================================================

function firebaseAuthMessage(error) {

    const code =
        error?.code || "";

    const messages = {

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/missing-password":
            "Please enter your password.",

        "auth/weak-password":
            "Password must be at least 6 characters.",

        "auth/email-already-in-use":
            "This email is already registered. Please login.",

        "auth/invalid-credential":
            "Email or password is incorrect.",

        "auth/user-not-found":
            "No account found with this email.",

        "auth/wrong-password":
            "Email or password is incorrect.",

        "auth/too-many-requests":
            "Too many attempts. Please try again later.",

        "auth/network-request-failed":
            "Network error. Please check your internet connection."
    };

    return (
        messages[code] ||
        error?.message ||
        "Authentication failed. Please try again."
    );
}


// =====================================================
// AUTH FORM
// =====================================================

const authForm =
    document.getElementById("authForm");

if (authForm) {

    authForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document
                    .getElementById("authEmail")
                    ?.value
                    .trim()
                    .toLowerCase() || "";

            const password =
                document
                    .getElementById("authPassword")
                    ?.value || "";

            const name =
                document
                    .getElementById("authName")
                    ?.value
                    .trim() || "";

            const submitButton =
                document.getElementById(
                    "authSubmitBtn"
                );

            if (!email || !password) {

                showAuthMessage(
                    "Please enter email and password.",
                    "error"
                );

                return;
            }

            if (
                authMode === "register" &&
                name.length < 2
            ) {

                showAuthMessage(
                    "Please enter your full name.",
                    "error"
                );

                return;
            }

            if (submitButton) {

                submitButton.disabled = true;

                submitButton.textContent =
                    authMode === "register"
                        ? "Creating..."
                        : "Logging in...";
            }

            try {

                if (authMode === "register") {

                    const credential =
                        await createUserWithEmailAndPassword(
                            auth,
                            email,
                            password
                        );

                    await updateProfile(
                        credential.user,
                        {
                            displayName: name
                        }
                    );

                    showAuthMessage(
                        "Account created successfully.",
                        "success"
                    );

                } else {

                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                    showAuthMessage(
                        "Login successful.",
                        "success"
                    );
                }

                authForm.reset();

                setTimeout(() => {

                    closeAuthModal();

                }, 600);

            } catch (error) {

                console.error(
                    "Authentication error:",
                    error
                );

                showAuthMessage(
                    firebaseAuthMessage(error),
                    "error"
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.textContent =
                        authMode === "register"
                            ? "Create Account"
                            : "Login";
                }
            }
        }
    );
}


// =====================================================
// LOGOUT
// =====================================================

window.logoutUser = async function () {

    try {

        await signOut(auth);

        currentUser = null;

        savedJobIds = new Set();

        updateAuthButton();

        updateAdminButton();

        updatePostJobVisibility();

        updateUserWelcome();

        loadSavedJobs();

        displayJobs(
            getCurrentlyDisplayedJobsSafe()
        );

        alert(
            "You have been logged out."
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            "Logout failed. Please try again."
        );
    }
};


// =====================================================
// LOAD JOBS
// =====================================================

async function loadJobs() {

    const container =
        document.getElementById(
            "jobsContainer"
        );

    const noJobs =
        document.getElementById(
            "noJobs"
        );

    try {

        if (container) {

            container.innerHTML = `
                <div style="
                    padding:40px;
                    text-align:center;
                    width:100%;
                ">
                    Loading latest jobs...
                </div>
            `;
        }

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "jobs"
                )
            );

        allJobs = [];

        snapshot.forEach((jobDoc) => {

            const data =
                jobDoc.data();

            const applicationUrl =
                getApplicationUrl(data);

            const applicationEmail =
                getApplicationEmail(data);

            allJobs.push({

                id:
                    jobDoc.id,

                title:
                    data.title || "",

                company:
                    data.company || "",

                location:
                    data.location || "",

                category:
                    data.category || "",

                experience:
                    data.experience || "",

                type:
                    data.type || "Full Time",

                salary:
                    data.salary || "",

                description:
                    data.description || "",

                // NORMALIZED APPLICATION DATA
                applyUrl:
                    applicationUrl,

                applicationEmail:
                    applicationEmail,

                // Keep alternate fields too
                applicationUrl:
                    applicationUrl,

                applicationLink:
                    applicationUrl,

                applyURL:
                    applicationUrl,

                applyEmail:
                    applicationEmail,

                createdAt:
                    data.createdAt || "",

                status:
                    String(
                        data.status ||
                        "approved"
                    )
                        .trim()
                        .toLowerCase(),

                postedBy:
                    data.postedBy || "",

                postedByEmail:
                    data.postedByEmail || "",

                postedByName:
                    data.postedByName || ""
            });
        });

        allJobs.sort((a, b) => {

            const dateA =
                getDateValue(
                    a.createdAt
                );

            const dateB =
                getDateValue(
                    b.createdAt
                );

            return dateB - dateA;
        });

        const approvedJobs =
            getApprovedJobs();

        updateJobCount(
            approvedJobs
        );

        displayJobs(
            approvedJobs
        );

        if (currentUser) {

            await loadSavedJobsFromFirebase();

        } else {

            loadSavedJobs();
        }

        console.log(
            "Firebase jobs loaded:",
            allJobs
        );

        openJobFromURL();

    } catch (error) {

        console.error(
            "Firebase job loading error:",
            error
        );

        if (container) {

            container.innerHTML = `
                <div style="
                    padding:40px;
                    text-align:center;
                    width:100%;
                ">
                    <h3>
                        Unable to load jobs
                    </h3>

                    <p>
                        Please refresh the page.
                    </p>
                </div>
            `;
        }

        if (noJobs) {

            noJobs.style.display =
                "none";
        }
    }
}


// =====================================================
// DATE VALUE
// =====================================================

function getDateValue(value) {

    if (!value) return 0;

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const date =
            value.toDate();

        return date.getTime() || 0;
    }

    const timestamp =
        new Date(value).getTime();

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}


// =====================================================
// APPROVED JOBS ONLY
// =====================================================

function getApprovedJobs() {

    return allJobs.filter((job) => {

        const status =
            String(
                job.status || ""
            )
                .trim()
                .toLowerCase();

        return status === "approved";
    });
}


// =====================================================
// JOB COUNT
// =====================================================

function updateJobCount(
    jobs = null
) {

    const total =
        document.getElementById(
            "totalJobs"
        );

    if (!total) return;

    const approvedJobs =
        jobs || getApprovedJobs();

    total.textContent =
        approvedJobs.length;
}

// =====================================================
// STATIC SEO JOB URL
// MATCHES generate-jobs.js EXACTLY
// =====================================================

function getStaticJobURL(job) {

    const title =
        String(
            job.title || "job"
        )
            .toLowerCase()
            .trim()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                "");

    return `/jobs/${title}-${job.id}.html`;
}
// =====================================================
// DISPLAY JOBS
// =====================================================

function displayJobs(jobs) {

    const container =
        document.getElementById(
            "jobsContainer"
        );

    const noJobs =
        document.getElementById(
            "noJobs"
        );

    const resultCount =
        document.getElementById(
            "resultCount"
        );

    if (!container) return;

    container.innerHTML = "";

    if (resultCount) {

        resultCount.textContent =
            `${jobs.length} jobs found`;
    }

    if (jobs.length === 0) {

        if (noJobs) {

            noJobs.style.display =
                "block";
        }

        return;
    }

    if (noJobs) {

        noJobs.style.display =
            "none";
    }

    jobs.forEach((job) => {

        const card =
            document.createElement("div");

        card.className =
            "job-card";

        const saved =
            isJobSaved(job.id);

        card.innerHTML = `

            <div class="job-card-header">

                <div class="company-logo">

                    ${escapeHTML(
                        getCompanyLetter(
                            job.company
                        )
                    )}

                </div>

                <button
                    class="save-job-btn ${
                        saved ? "saved" : ""
                    }"

                    onclick="toggleSaveJob('${escapeAttribute(
                        job.id
                    )}')"

                    aria-label="${
                        saved
                            ? "Remove saved job"
                            : "Save job"
                    }"

                    title="${
                        saved
                            ? "Remove from Saved Jobs"
                            : "Save Job"
                    }"
                >

                    ${
                        saved
                            ? "♥"
                            : "♡"
                    }

                </button>

            </div>


            <h3>
                ${escapeHTML(job.title)}
            </h3>


            <p class="company-name">
                ${escapeHTML(job.company)}
            </p>


            <div class="job-meta">

                <span>
                    📍
                    ${escapeHTML(job.location)}
                </span>

                <span>
                    💼
                    ${escapeHTML(job.category)}
                </span>

                <span>
                    🎓
                    ${escapeHTML(
                        formatExperience(
                            job.experience
                        )
                    )}
                </span>

                <span>
                    🕐
                    ${escapeHTML(job.type)}
                </span>

            </div>


            <p class="job-description">

                ${escapeHTML(
                    shortenDescription(
                        job.description
                    )
                )}

            </p>


            <div class="job-card-footer">

                <strong>

                    💰

                    ${escapeHTML(
                        job.salary ||
                        "Salary not disclosed"
                    )}

                </strong>


                <button
                    class="details-btn"

                    onclick="viewJobDetails('${escapeAttribute(
                        job.id
                    )}')"
                >
                    View Details
                </button>

            </div>
        `;

        container.appendChild(card);
    });
}


// =====================================================
// SEARCH
// =====================================================

window.searchJobs = function () {

    const search =
        document
            .getElementById("searchInput")
            ?.value
            .trim()
            .toLowerCase() || "";

    const location =
        document
            .getElementById("locationInput")
            ?.value
            .trim()
            .toLowerCase() || "";

    const filtered =
        getApprovedJobs().filter((job) => {

            const text = `
                ${job.title}
                ${job.company}
                ${job.category}
                ${job.description}
            `.toLowerCase();

            const jobLocation =
                String(
                    job.location
                ).toLowerCase();

            return (
                (!search ||
                    text.includes(search)) &&

                (!location ||
                    jobLocation.includes(location))
            );
        });

    updateJobCount(filtered);

    displayJobs(filtered);
};


// =====================================================
// CLEAR SEARCH
// =====================================================

window.clearSearch = function () {

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const locationInput =
        document.getElementById(
            "locationInput"
        );

    if (searchInput) {

        searchInput.value = "";
    }

    if (locationInput) {

        locationInput.value = "";
    }

    const approvedJobs =
        getApprovedJobs();

    updateJobCount(
        approvedJobs
    );

    displayJobs(
        approvedJobs
    );
};


// =====================================================
// CATEGORY FILTER
// =====================================================

window.filterCategory = function (
    category
) {

    const value =
        String(category || "")
            .trim()
            .toLowerCase();

    if (!value) {

        const jobs =
            getApprovedJobs();

        updateJobCount(jobs);

        displayJobs(jobs);

        return;
    }

    const filtered =
        getApprovedJobs().filter(
            (job) =>
                String(
                    job.category || ""
                )
                    .trim()
                    .toLowerCase()
                    .includes(value)
        );

    updateJobCount(
        filtered
    );

    displayJobs(
        filtered
    );
};


// =====================================================
// CATEGORY SELECT COMPATIBILITY
// =====================================================

window.selectCategory = function (
    category
) {

    const filter =
        document.getElementById(
            "categoryFilter"
        );

    if (filter) {

        filter.value =
            category || "";
    }

    filterCategory(category);

    const jobsSection =
        document.getElementById(
            "jobs"
        );

    if (jobsSection) {

        jobsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
};


// =====================================================
// FILTER JOBS
// =====================================================

window.filterJobs = function () {

    const category =
        document.getElementById(
            "categoryFilter"
        )?.value
        .trim()
        .toLowerCase() || "";

    const experience =
        document.getElementById(
            "experienceFilter"
        )?.value
        .trim()
        .toLowerCase() || "";

    const type =
        document.getElementById(
            "typeFilter"
        )?.value
        .trim()
        .toLowerCase() || "";

    const filtered =
        getApprovedJobs().filter(
            (job) => {

                const jobCategory =
                    String(
                        job.category || ""
                    )
                        .trim()
                        .toLowerCase();

                const jobExperience =
                    String(
                        job.experience || ""
                    )
                        .trim()
                        .toLowerCase();

                const jobType =
                    String(
                        job.type || ""
                    )
                        .trim()
                        .toLowerCase();

                return (

                    (!category ||
                        jobCategory.includes(
                            category
                        )) &&

                    (!experience ||
                        jobExperience.includes(
                            experience
                        )) &&

                    (!type ||
                        jobType === type)
                );
            }
        );

    updateJobCount(filtered);

    displayJobs(filtered);
};


// =====================================================
// CLEAR FILTERS
// =====================================================

window.clearFilters = function () {

    const category =
        document.getElementById(
            "categoryFilter"
        );

    const experience =
        document.getElementById(
            "experienceFilter"
        );

    const type =
        document.getElementById(
            "typeFilter"
        );

    if (category) category.value = "";

    if (experience) experience.value = "";

    if (type) type.value = "";

    clearSearch();
};


// =====================================================
// VIEW JOB DETAILS
// =====================================================

window.viewJobDetails = function (
    id
) {

    const job =
        allJobs.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!job) {

        alert(
            "Job not found."
        );

        return;
    }

    if (
        String(job.status || "")
            .trim()
            .toLowerCase() !==
        "approved"
    ) {

        alert(
            "This job is not currently available."
        );

        return;
    }

    updateJobURL(id);

    renderJobDetails(job);
};


// =====================================================
// RENDER JOB DETAILS
// =====================================================

function renderJobDetails(job) {

    const modal =
        document.getElementById(
            "jobDetailsModal"
        );

    const content =
        document.getElementById(
            "jobDetailsContent"
        );

    if (!modal || !content) {

        console.error(
            "Job details modal not found."
        );

        return;
    }

    const applicationUrl =
        job.applyUrl ||
        job.applicationUrl ||
        job.applicationLink ||
        job.applyURL ||
        "";

    const applicationEmail =
        String(
            job.applicationEmail ||
            job.applyEmail ||
            ""
        )
            .trim()
            .toLowerCase();

    console.log(
        "Application data:",
        {
            jobId: job.id,
            title: job.title,
            applicationUrl,
            applicationEmail
        }
    );

    const applyButton = `

        <button
            type="button"
            class="apply-btn"
            onclick="handleApplyJob('${escapeAttribute(
                job.id
            )}')"
        >
            Apply Now →
        </button>

    `;

    content.innerHTML = `

        <div class="job-details-header">

            <div class="company-logo large">

                ${escapeHTML(
                    getCompanyLetter(
                        job.company
                    )
                )}

            </div>

            <div>

                <h2>
                    ${escapeHTML(
                        job.title
                    )}
                </h2>

                <p class="company-name">
                    ${escapeHTML(
                        job.company
                    )}
                </p>

            </div>

        </div>


        <div class="job-details-meta">

            <span>
                📍
                ${escapeHTML(
                    job.location
                )}
            </span>

            <span>
                💼
                ${escapeHTML(
                    job.category
                )}
            </span>

            <span>
                🎓
                ${escapeHTML(
                    formatExperience(
                        job.experience
                    )
                )}
            </span>

            <span>
                🕐
                ${escapeHTML(
                    job.type
                )}
            </span>

            <span>
                💰
                ${escapeHTML(
                    job.salary ||
                    "Salary not disclosed"
                )}
            </span>

        </div>


        <div class="job-details-description">

            <h3>
                Job Description
            </h3>

            <p>
                ${escapeHTML(
                    job.description
                ).replace(
                    /\n/g,
                    "<br>"
                )}
            </p>

        </div>


        <div class="job-details-actions">

            ${applyButton}

            <button
                type="button"
                class="save-details-btn"
                onclick="toggleSaveJob('${escapeAttribute(
                    job.id
                )}')"
            >
                ${
                    isJobSaved(job.id)
                        ? "♥ Saved"
                        : "♡ Save Job"
                }
            </button>

        </div>
    `;

    modal.style.display = "flex";

    addJobPostingSchema(job);
}


// =====================================================
// CLOSE JOB DETAILS
// =====================================================

window.closeJobDetails = function () {

    const modal =
        document.getElementById(
            "jobDetailsModal"
        );

    if (modal) {

        modal.style.display =
            "none";
    }

    removeJobPostingSchema();

    clearJobURL();
};


// =====================================================
// APPLY JOB
// URL FIRST
// EMAIL SECOND
// =====================================================

window.handleApplyJob = function (id) {

    if (!currentUser) {

        openAuthModal();

        showAuthMessage(
            "Please login or register before applying for a job.",
            "error"
        );

        return;
    }

    const job =
        allJobs.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!job) {

        alert(
            "Job not found."
        );

        return;
    }

    const status =
        String(
            job.status || ""
        )
            .trim()
            .toLowerCase();

    if (status !== "approved") {

        alert(
            "This job is not currently available."
        );

        return;
    }

    const applicationUrl =
        String(
            job.applyUrl ||
            job.applicationUrl ||
            job.applicationLink ||
            job.applyURL ||
            ""
        ).trim();

    const applicationEmail =
        String(
            job.applicationEmail ||
            job.applyEmail ||
            ""
        )
            .trim()
            .toLowerCase();

    console.log(
        "========== APPLY DEBUG =========="
    );

    console.log(
        "Job ID:",
        job.id
    );

    console.log(
        "Job Title:",
        job.title
    );

    console.log(
        "Application URL:",
        applicationUrl
    );

    console.log(
        "Application Email:",
        applicationEmail
    );

    console.log(
        "================================="
    );


    // =================================================
    // URL
    // =================================================

    if (applicationUrl) {

        const url =
            safeURL(
                applicationUrl
            );

        if (url !== "#") {

            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );

            return;

        } else {

            alert(
                "The application URL for this job is invalid."
            );

            return;
        }
    }


    // =================================================
    // EMAIL
    // =================================================

    if (applicationEmail) {

        const subject =
            encodeURIComponent(
                `Application for ${job.title || "Job"}`
            );

        const body =
            encodeURIComponent(
                `Hello ${job.company || ""},

I would like to apply for the ${job.title || "job"} position.

Thank you.`
            );

        window.location.href =
            `mailto:${applicationEmail}?subject=${subject}&body=${body}`;

        return;
    }


    // =================================================
    // NOTHING
    // =================================================

    alert(
        "Application link or email has not been added for this job yet."
    );
};


// =====================================================
// SAVE JOB
// =====================================================

window.toggleSaveJob =
async function (id) {

    if (!currentUser) {

        openAuthModal();

        showAuthMessage(
            "Please login or register to save jobs.",
            "error"
        );

        return;
    }

    const job =
        allJobs.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!job) {

        alert(
            "Job not found."
        );

        return;
    }

    const key =
        String(id);

    try {

        const savedRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "savedJobs",
                key
            );

        if (savedJobIds.has(key)) {

            await deleteDoc(
                savedRef
            );

            savedJobIds.delete(
                key
            );

        } else {

            await setDoc(
                savedRef,
                {

                    jobId:
                        key,

                    title:
                        job.title || "",

                    company:
                        job.company || "",

                    location:
                        job.location || "",

                    savedAt:
                        serverTimestamp()
                }
            );

            savedJobIds.add(
                key
            );
        }

        displayJobs(
            getCurrentlyDisplayedJobsSafe()
        );

        const modal =
            document.getElementById(
                "jobDetailsModal"
            );

        if (
            modal &&
            modal.style.display ===
            "flex"
        ) {

            renderJobDetails(job);
        }

    } catch (error) {

        console.error(
            "Save job error:",
            error
        );

        alert(
            "Unable to save job. Please try again."
        );
    }
};


// =====================================================
// LOAD SAVED JOBS
// =====================================================

async function loadSavedJobsFromFirebase() {

    if (!currentUser) return;

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "users",
                    currentUser.uid,
                    "savedJobs"
                )
            );

        savedJobIds =
            new Set(
                snapshot.docs.map(
                    savedDoc =>
                        String(savedDoc.id)
                )
            );

        displayJobs(
            getCurrentlyDisplayedJobsSafe()
        );

    } catch (error) {

        console.error(
            "Load saved jobs error:",
            error
        );

        savedJobIds =
            new Set();
    }
}


// =====================================================
// LOCAL SAVED JOBS
// =====================================================

function loadSavedJobs() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    "naukrihub_saved_jobs"
                ) || "[]"
            );

        if (
            !currentUser &&
            Array.isArray(saved)
        ) {

            savedJobIds =
                new Set(
                    saved.map(
                        id =>
                            String(id)
                    )
                );
        }

    } catch (error) {

        console.error(
            "Local saved jobs error:",
            error
        );

        savedJobIds =
            new Set();
    }
}


// =====================================================
// SHOW SAVED JOBS
// =====================================================

window.showSavedJobs = function () {

    if (!currentUser) {

        openAuthModal();

        showAuthMessage(
            "Please login to view your saved jobs.",
            "error"
        );

        return;
    }

    const saved =
        getApprovedJobs().filter(
            job =>
                savedJobIds.has(
                    String(job.id)
                )
        );

    updateJobCount(
        saved
    );

    displayJobs(
        saved
    );
};


// =====================================================
// SAVED JOB NAVIGATION
// =====================================================

window.handleSavedJobsNav =
function (event) {

    if (event) {

        event.preventDefault();
    }

    if (!currentUser) {

        openAuthModal();

        showAuthMessage(
            "Please login to view your saved jobs.",
            "error"
        );

        return;
    }

    const section =
        document.getElementById(
            "savedJobsSection"
        );

    if (section) {

        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    const saved =
        getApprovedJobs().filter(
            job =>
                savedJobIds.has(
                    String(job.id)
                )
        );

    const container =
        document.getElementById(
            "savedJobsContainer"
        );

    const count =
        document.getElementById(
            "savedJobsCount"
        );

    const noSaved =
        document.getElementById(
            "noSavedJobs"
        );

    if (count) {

        count.textContent =
            `${saved.length} saved`;
    }

    if (container) {

        container.innerHTML = "";

        saved.forEach(job => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "saved-job-item";

            item.innerHTML = `

                <strong>
                    ${escapeHTML(job.title)}
                </strong>

                <span>
                    ${escapeHTML(job.company)}
                </span>

                <button
                    type="button"
                    onclick="viewJobDetails('${escapeAttribute(job.id)}')"
                >
                    View
                </button>
            `;

            container.appendChild(item);
        });
    }

    if (noSaved) {

        noSaved.style.display =
            saved.length
                ? "none"
                : "block";
    }
};


// =====================================================
// GET CURRENTLY DISPLAYED JOBS
// =====================================================

function getCurrentlyDisplayedJobsSafe() {

    const activeSearch =
        document
            .getElementById(
                "searchInput"
            )
            ?.value
            .trim()
            .toLowerCase() || "";

    const activeLocation =
        document
            .getElementById(
                "locationInput"
            )
            ?.value
            .trim()
            .toLowerCase() || "";

    if (
        !activeSearch &&
        !activeLocation
    ) {

        return getApprovedJobs();
    }

    return getApprovedJobs().filter(
        (job) => {

            const text = `
                ${job.title}
                ${job.company}
                ${job.category}
                ${job.description}
            `.toLowerCase();

            const jobLocation =
                String(
                    job.location
                ).toLowerCase();

            return (

                (!activeSearch ||
                    text.includes(
                        activeSearch
                    )) &&

                (!activeLocation ||
                    jobLocation.includes(
                        activeLocation
                    ))
            );
        }
    );
}


// =====================================================
// CHECK SAVED
// =====================================================

function isJobSaved(id) {

    return savedJobIds.has(
        String(id)
    );
}


// =====================================================
// COMPANY LETTER
// =====================================================

function getCompanyLetter(
    company
) {

    const value =
        String(
            company || ""
        ).trim();

    if (!value) return "?";

    return value
        .charAt(0)
        .toUpperCase();
}


// =====================================================
// EXPERIENCE FORMAT
// =====================================================

function formatExperience(
    value
) {

    const text =
        String(
            value || ""
        ).trim();

    if (!text) {

        return "Experience not specified";
    }

    return text;
}


// =====================================================
// SHORT DESCRIPTION
// =====================================================

function shortenDescription(
    text,
    maxLength = 180
) {

    const value =
        String(
            text || ""
        ).trim();

    if (
        value.length <=
        maxLength
    ) {

        return value;
    }

    return (
        value.slice(
            0,
            maxLength
        ).trim() +
        "..."
    );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// =====================================================
// ESCAPE ATTRIBUTE
// =====================================================

function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            "&quot;"
        );
}


// =====================================================
// SAFE URL
// =====================================================

function safeURL(
    value
) {

    try {

        const url =
            new URL(
                String(
                    value || ""
                ).trim()
            );

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {

            return "#";
        }

        return url.href;

    } catch {

        return "#";
    }
}


// =====================================================
// OPEN JOB FROM URL
// =====================================================

function openJobFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const jobId =
        params.get("job");

    if (!jobId) return;

    const job =
        allJobs.find(
            item =>
                String(item.id) ===
                String(jobId)
        );

    if (!job) return;

    if (
        String(job.status || "")
            .trim()
            .toLowerCase() !==
        "approved"
    ) {

        return;
    }

    renderJobDetails(job);
}


// =====================================================
// UPDATE JOB URL
// =====================================================

function updateJobURL(
    jobId
) {

    if (!jobId) return;

    try {

        const url =
            new URL(
                window.location.href
            );

        url.searchParams.set(
            "job",
            String(jobId)
        );

        window.history.pushState(
            {},
            "",
            url
        );

    } catch (error) {

        console.error(
            "Unable to update job URL:",
            error
        );
    }
}


// =====================================================
// CLEAR JOB URL
// =====================================================

function clearJobURL() {

    try {

        const url =
            new URL(
                window.location.href
            );

        if (
            !url.searchParams.has("job")
        ) {

            return;
        }

        url.searchParams.delete(
            "job"
        );

        window.history.pushState(
            {},
            "",
            url
        );

    } catch (error) {

        console.error(
            "Unable to clear job URL:",
            error
        );
    }
}


// =====================================================
// GOOGLE JOBPOSTING STRUCTURED DATA
// =====================================================

window.addJobPostingSchema =
function (job) {

    if (!job) return;

    removeJobPostingSchema();

    const schema = {

        "@context":
            "https://schema.org",

        "@type":
            "JobPosting",

        title:
            job.title || "",

        description:
            job.description || "",

        datePosted:
            formatSchemaDate(
                job.createdAt
            ),

        hiringOrganization: {

            "@type":
                "Organization",

            name:
                job.company || ""
        },

        jobLocation: {

            "@type":
                "Place",

            address: {

                "@type":
                    "PostalAddress",

                addressLocality:
                    job.location || "",

                addressCountry:
                    "IN"
            }
        },

        employmentType:
            normalizeEmploymentType(
                job.type
            )
    };

    const salary =
        parseSalary(
            job.salary
        );

    if (salary) {

        schema.baseSalary = {

            "@type":
                "MonetaryAmount",

            currency:
                "INR",

            value:
                salary
        };
    }

    const script =
        document.createElement(
            "script"
        );

    script.type =
        "application/ld+json";

    script.dataset.jobpostingSchema =
        "true";

    script.textContent =
        JSON.stringify(
            schema
        );

    document.head.appendChild(
        script
    );
};


// =====================================================
// REMOVE JOBPOSTING SCHEMA
// =====================================================

function removeJobPostingSchema() {

    const existing =
        document.querySelector(
            'script[data-jobposting-schema="true"]'
        );

    if (existing) {

        existing.remove();
    }
}


// =====================================================
// SCHEMA DATE
// =====================================================

function formatSchemaDate(
    value
) {

    if (!value) {

        return new Date().toISOString();
    }

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        return value
            .toDate()
            .toISOString();
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return new Date().toISOString();
    }

    return date.toISOString();
}


// =====================================================
// SALARY PARSER
// =====================================================

function parseSalary(
    salaryText
) {

    const text =
        String(
            salaryText || ""
        ).trim();

    if (!text) return null;

    const numbers =
        text
            .replace(
                /,/g,
                ""
            )
            .match(
                /\d+(?:\.\d+)?/g
            );

    if (!numbers || !numbers.length) {

        return null;
    }

    const values =
        numbers
            .map(Number)
            .filter(
                Number.isFinite
            );

    if (!values.length) {

        return null;
    }

    if (values.length >= 2) {

        return {

            "@type":
                "QuantitativeValue",

            minValue:
                Math.min(
                    values[0],
                    values[1]
                ),

            maxValue:
                Math.max(
                    values[0],
                    values[1]
                )
        };
    }

    return {

        "@type":
            "QuantitativeValue",

        value:
            values[0]
    };
}


// =====================================================
// EMPLOYMENT TYPE
// =====================================================

function normalizeEmploymentType(
    type
) {

    const value =
        String(
            type || ""
        )
            .trim()
            .toLowerCase();

    if (value.includes("part")) {

        return "PART_TIME";
    }

    if (value.includes("contract")) {

        return "CONTRACTOR";
    }

    if (value.includes("temporary")) {

        return "TEMPORARY";
    }

    if (value.includes("intern")) {

        return "INTERN";
    }

    if (value.includes("volunteer")) {

        return "VOLUNTEER";
    }

    return "FULL_TIME";
}


// =====================================================
// POST JOB FORM
// IMPORTANT: HTML ID = jobForm
// =====================================================

const postJobForm =
    document.getElementById(
        "jobForm"
    );

if (postJobForm) {

    postJobForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (!currentUser) {

                openAuthModal();

                showAuthMessage(
                    "Please login or register before posting a job.",
                    "error"
                );

                return;
            }

            const inputs =
                postJobForm.querySelectorAll(
                    "input"
                );

            const textarea =
                postJobForm.querySelector(
                    "textarea"
                );

            const title =
                inputs[0]
                    ?.value
                    .trim() || "";

            const company =
                inputs[1]
                    ?.value
                    .trim() || "";

            const location =
                inputs[2]
                    ?.value
                    .trim() || "";

            const category =
                inputs[3]
                    ?.value
                    .trim() || "";

            const experience =
                inputs[4]
                    ?.value
                    .trim() || "";

            const salary =
                inputs[5]
                    ?.value
                    .trim() || "";

            const description =
                textarea
                    ?.value
                    .trim() || "";


            // =================================================
            // APPLICATION FIELDS
            // =================================================

            const applyUrl =
                document
                    .getElementById(
                        "applyUrl"
                    )
                    ?.value
                    .trim() || "";

            const applicationEmail =
                document
                    .getElementById(
                        "applicationEmail"
                    )
                    ?.value
                    .trim()
                    .toLowerCase() || "";


            // =================================================
            // REQUIRED JOB FIELDS
            // =================================================

            if (
                !title ||
                !company ||
                !location ||
                !category ||
                !experience ||
                !salary ||
                !description
            ) {

                alert(
                    "Please fill all required job fields."
                );

                return;
            }


            // =================================================
            // APPLICATION METHOD
            // =================================================

            if (
                !applyUrl &&
                !applicationEmail
            ) {

                alert(
                    "Please add either an Application URL or an Application Email."
                );

                return;
            }


            // =================================================
            // VALIDATE URL
            // =================================================

            let finalApplyUrl = "";

            if (applyUrl) {

                finalApplyUrl =
                    safeURL(
                        applyUrl
                    );

                if (
                    finalApplyUrl === "#"
                ) {

                    alert(
                        "Please enter a valid Application URL."
                    );

                    return;
                }
            }


            // =================================================
            // VALIDATE EMAIL
            // =================================================

            if (
                applicationEmail &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    applicationEmail
                )
            ) {

                alert(
                    "Please enter a valid Application Email."
                );

                return;
            }


            // =================================================
            // SUBMIT BUTTON
            // =================================================

            const submitButton =
                postJobForm.querySelector(
                    'button[type="submit"]'
                );

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Submitting...";
            }


            // =================================================
            // FIRESTORE DATA
            // =================================================

            const jobData = {

                title,

                company,

                location,

                category,

                experience,

                type:
                    "Full Time",

                salary,

                description,


                // =================================================
                // STANDARD APPLICATION FIELDS
                // =================================================

                applyUrl:
                    finalApplyUrl,

                applicationEmail:
                    applicationEmail,


                // =================================================
                // STATUS
                // =================================================

                status:
                    "pending",


                // =================================================
                // USER INFO
                // =================================================

                postedBy:
                    currentUser.uid,

                postedByEmail:
                    currentUser.email ||
                    "",

                postedByName:
                    currentUser.displayName ||
                    "User",


                // =================================================
                // DATE
                // =================================================

                createdAt:
                    serverTimestamp()
            };


            try {

                await addDoc(
                    collection(
                        db,
                        "jobs"
                    ),
                    jobData
                );

                alert(
                    "Job posted successfully and sent for admin approval."
                );

                postJobForm.reset();

                closeAddJob();

                await loadJobs();

            } catch (error) {

                console.error(
                    "Error posting job:",
                    error
                );

                alert(
                    "Unable to post job. Please try again."
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Post Job";
                }
            }
        }
    );
}


// =====================================================
// OPEN POST JOB
// IMPORTANT: HTML uses jobModal
// =====================================================

window.openPostJob =
function () {

    if (!currentUser) {

        openAuthModal();

        showAuthMessage(
            "Please login or register before posting a job.",
            "error"
        );

        return;
    }

    const modal =
        document.getElementById(
            "jobModal"
        );

    if (!modal) {

        console.error(
            "jobModal not found."
        );

        return;
    }

    modal.style.display =
        "flex";
};


// =====================================================
// OPEN ADD JOB COMPATIBILITY
// =====================================================

window.openAddJob =
function () {

    openPostJob();
};


// =====================================================
// CLOSE ADD JOB
// =====================================================

window.closeAddJob =
function () {

    const modal =
        document.getElementById(
            "jobModal"
        );

    if (modal) {

        modal.style.display =
            "none";
    }
};


// =====================================================
// ADMIN PANEL
// =====================================================

window.openAdminPanel =
function () {

    if (!currentUser) {

        openAuthModal();

        showAuthMessage(
            "Please login first.",
            "error"
        );

        return;
    }

    if (
        currentUser.uid !==
        ADMIN_UID
    ) {

        alert(
            "Access denied."
        );

        return;
    }

    window.location.href =
        "admin.html";
};


// =====================================================
// ADMIN BUTTON VISIBILITY
// =====================================================

function updateAdminButton() {

    const button =
        document.getElementById(
            "adminButton"
        );

    if (!button) return;

    if (
        currentUser &&
        currentUser.uid ===
        ADMIN_UID
    ) {

        button.style.display =
            "inline-flex";

    } else {

        button.style.display =
            "none";
    }
}


// =====================================================
// POST JOB VISIBILITY
// =====================================================

function updatePostJobVisibility() {

    const section =
        document.getElementById(
            "postJobSection"
        );

    if (!section) return;

    if (currentUser) {

        section.classList.remove(
            "login-required"
        );

    } else {

        section.classList.add(
            "login-required"
        );
    }
}


// =====================================================
// USER WELCOME
// =====================================================

function updateUserWelcome() {

    const element =
        document.getElementById(
            "userWelcome"
        );

    if (!element) return;

    if (!currentUser) {

        element.textContent = "";

        return;
    }

    const name =
        currentUser.displayName ||
        currentUser.email ||
        "User";

    element.textContent =
        `Welcome, ${name}`;
}


// =====================================================
// MOBILE MENU
// =====================================================

const mobileMenuButton =
    document.getElementById(
        "mobileMenuButton"
    );

const mobileMenu =
    document.getElementById(
        "mobileMenu"
    );

if (mobileMenuButton) {

    mobileMenuButton.addEventListener(
        "click",
        function () {

            if (!mobileMenu) return;

            mobileMenu.classList.toggle(
                "active"
            );
        }
    );
}


// =====================================================
// NAVIGATION
// =====================================================

window.scrollToSection =
function (id) {

    const section =
        document.getElementById(id);

    if (!section) return;

    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
};


// =====================================================
// HOME
// =====================================================

window.goHome =
function () {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    clearSearch();
};


// =====================================================
// SHOW ALL JOBS
// =====================================================

window.showAllJobs =
function () {

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const locationInput =
        document.getElementById(
            "locationInput"
        );

    if (searchInput) {

        searchInput.value = "";
    }

    if (locationInput) {

        locationInput.value = "";
    }

    const jobs =
        getApprovedJobs();

    updateJobCount(jobs);

    displayJobs(jobs);
};


// =====================================================
// CONTACT
// =====================================================

window.showContact =
function () {

    const contact =
        document.getElementById(
            "contactSection"
        );

    if (!contact) return;

    contact.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
};


// =====================================================
// ABOUT
// =====================================================

window.showAbout =
function () {

    const about =
        document.getElementById(
            "aboutSection"
        );

    if (!about) return;

    about.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
};


// =====================================================
// SEARCH INPUT
// =====================================================

const searchInput =
    document.getElementById(
        "searchInput"
    );

if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchJobs();
            }
        }
    );
}


// =====================================================
// LOCATION INPUT
// =====================================================

const locationInput =
    document.getElementById(
        "locationInput"
    );

if (locationInput) {

    locationInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchJobs();
            }
        }
    );
}


// =====================================================
// SEARCH BUTTON
// =====================================================

const searchButton =
    document.getElementById(
        "searchButton"
    );

if (searchButton) {

    searchButton.addEventListener(
        "click",
        function () {

            searchJobs();
        }
    );
}


// =====================================================
// CLEAR SEARCH BUTTON
// =====================================================

const clearSearchButton =
    document.getElementById(
        "clearSearchButton"
    );

if (clearSearchButton) {

    clearSearchButton.addEventListener(
        "click",
        function () {

            clearSearch();
        }
    );
}


// =====================================================
// HERO SEARCH
// =====================================================

const heroSearchForm =
    document.getElementById(
        "heroSearchForm"
    );

if (heroSearchForm) {

    heroSearchForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            searchJobs();

            const jobsSection =
                document.getElementById(
                    "jobsSection"
                );

            if (jobsSection) {

                jobsSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }
    );
}


// =====================================================
// SAVED JOBS BUTTON
// =====================================================

const savedJobsButton =
    document.getElementById(
        "savedJobsButton"
    );

if (savedJobsButton) {

    savedJobsButton.addEventListener(
        "click",
        function () {

            showSavedJobs();
        }
    );
}


// =====================================================
// CATEGORY BUTTONS
// =====================================================

document
    .querySelectorAll(
        "[data-category]"
    )
    .forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const category =
                        button.dataset.category;

                    filterCategory(
                        category
                    );
                }
            );
        }
    );


// =====================================================
// AUTH CLOSE BUTTON
// =====================================================

const authCloseButton =
    document.getElementById(
        "authCloseButton"
    );

if (authCloseButton) {

    authCloseButton.addEventListener(
        "click",
        closeAuthModal
    );
}


// =====================================================
// AUTH SWITCH BUTTON
// =====================================================

const authSwitchButton =
    document.getElementById(
        "authSwitchBtn"
    );

if (authSwitchButton) {

    authSwitchButton.addEventListener(
        "click",
        toggleAuthMode
    );
}


// =====================================================
// JOB MODAL CLOSE BUTTON
// =====================================================

const jobCloseButton =
    document.getElementById(
        "jobDetailsClose"
    );

if (jobCloseButton) {

    jobCloseButton.addEventListener(
        "click",
        closeJobDetails
    );
}


// =====================================================
// OUTSIDE MODAL CLICK
// =====================================================

window.addEventListener(
    "click",
    function (event) {

        const authModal =
            document.getElementById(
                "authModal"
            );

        const jobModal =
            document.getElementById(
                "jobDetailsModal"
            );

        const postJobModal =
            document.getElementById(
                "jobModal"
            );

        if (
            event.target ===
            authModal
        ) {

            closeAuthModal();
        }

        if (
            event.target ===
            jobModal
        ) {

            closeJobDetails();
        }

        if (
            event.target ===
            postJobModal
        ) {

            closeAddJob();
        }
    }
);


// =====================================================
// ESCAPE KEY
// =====================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !==
            "Escape"
        ) {

            return;
        }

        const authModal =
            document.getElementById(
                "authModal"
            );

        const jobModal =
            document.getElementById(
                "jobDetailsModal"
            );

        const postJobModal =
            document.getElementById(
                "jobModal"
            );

        if (
            authModal &&
            authModal.style.display ===
            "flex"
        ) {

            closeAuthModal();

            return;
        }

        if (
            jobModal &&
            jobModal.style.display ===
            "flex"
        ) {

            closeJobDetails();

            return;
        }

        if (
            postJobModal &&
            postJobModal.style.display ===
            "flex"
        ) {

            closeAddJob();
        }
    }
);


// =====================================================
// POPSTATE
// =====================================================

window.addEventListener(
    "popstate",
    function () {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const jobId =
            params.get("job");

        if (!jobId) {

            const modal =
                document.getElementById(
                    "jobDetailsModal"
                );

            if (modal) {

                modal.style.display =
                    "none";
            }

            removeJobPostingSchema();

            return;
        }

        const job =
            allJobs.find(
                item =>
                    String(item.id) ===
                    String(jobId)
            );

        if (job) {

            renderJobDetails(job);
        }
    }
);


// =====================================================
// BACK TO TOP
// =====================================================

const backToTop =
    document.getElementById(
        "backToTop"
    );

if (backToTop) {

    window.addEventListener(
        "scroll",
        function () {

            if (
                window.scrollY >
                400
            ) {

                backToTop.classList.add(
                    "show"
                );

            } else {

                backToTop.classList.remove(
                    "show"
                );
            }
        }
    );

    backToTop.addEventListener(
        "click",
        function () {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );
}


// =====================================================
// FOOTER YEAR
// =====================================================

const yearElement =
    document.getElementById(
        "currentYear"
    );

if (yearElement) {

    yearElement.textContent =
        new Date().getFullYear();
}


// =====================================================
// INITIAL UI
// =====================================================

updateAuthModeUI();

updateAuthButton();

updateAdminButton();

updatePostJobVisibility();

updateUserWelcome();

loadSavedJobs();


// =====================================================
// INITIAL JOB LOAD
// =====================================================

loadJobs();


// =====================================================
// FINAL MESSAGE
// =====================================================

console.log(
    "NaukriHub Main Website started successfully."
);