const axios = require("axios");

async function testRecipeRequest() {
  try {
    const response = await axios.post(
      "http://localhost:5001/intelligensi-ai-v2/us-central1/updateHomepage",
      {
        prompt: "please can you create a recipe for chicken tikka",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("=== RESPONSE ===");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("=== ERROR ===");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

testRecipeRequest();
