const { google } = require("googleapis");

async function notifyIndexing() {
  const credentials = JSON.parse(
    process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });

  const indexing = google.indexing({
    version: "v3",
    auth,
  });

  const url = process.argv[2];

  if (!url) {
    console.error("ERROR: Job URL missing.");
    process.exit(1);
  }

  console.log("Sending indexing notification for:");
  console.log(url);

  try {
    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type: "URL_UPDATED",
      },
    });

    console.log("SUCCESS: Google Indexing API accepted the notification.");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("INDEXING API ERROR");

    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

notifyIndexing();