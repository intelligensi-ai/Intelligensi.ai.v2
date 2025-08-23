const axios = require('axios');

async function testRecipeCreation() {
  try {
    const prompt = 'Create a detailed recipe for cookies and cream ice cream with detailed instructions';
    console.log('Sending request with prompt:', prompt);
    
    const response = await axios.post(
      'http://localhost:5001/intelligensi-ai-v2/us-central1/updateHomepage',
      { prompt },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      }
    );
    console.log('\n=== Response Status ===');
    console.log(response.status);
    
    console.log('\n=== Response Data ===');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Validate the response
    if (response.data?.drupalResponse?.status === 'success') {
      console.log('\n✅ Successfully created/updated recipe in Drupal');
      if (response.data.recipe?.body) {
        console.log('✅ Recipe body is present in the response');
      } else {
        console.warn('⚠️  Warning: Recipe body is missing from the response');
      }
    } else {
      console.warn('⚠️  Warning: Drupal response indicates an issue');
      if (response.data?.drupalResponse?.details) {
        console.log('\nDrupal error details:');
        console.log(JSON.stringify(response.data.drupalResponse.details, null, 2));
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error:');
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      
      // Log detailed error information if available
      if (error.response.data?.error) {
        console.error('Error details:', error.response.data.error);
      }
      if (error.response.data?.details) {
        console.error('Additional details:', error.response.data.details);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.message);
      console.error('Request config:', error.config);
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    throw error; // Re-throw to allow handling by the caller if needed
  }
}

// Run the test
(async () => {
  try {
    console.log('=== Starting Recipe Creation Test ===');
    await testRecipeCreation();
    console.log('=== Test Completed ===');
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  } finally {
    // Ensure the process exits cleanly
    process.exit(0);
  }
})();

