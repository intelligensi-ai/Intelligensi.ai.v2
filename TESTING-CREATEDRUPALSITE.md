# Testing the createDrupalSite Function

This guide provides instructions on how to test the `createDrupalSite` Firebase function both locally and in production.

## Prerequisites

1. Ensure you have the necessary AWS credentials:
   - `AWS_REGION` (default: "eu-west-2")
   - `AWS_KEY_PAIR` (default: "Intelligensi.ai")
   - `AWS_ACCESS_KEY`
   - `AWS_SECRET_KEY`
   - `INSTANCE_PREFIX` (default: "drupal")

2. Make sure Firebase CLI is installed and you're logged in:
   ```
   npm install -g firebase-tools
   firebase login
   ```

## Testing Locally

### 1. Start the Firebase Emulators

```bash
cd /path/to/Intelligensi.ai-v2
firebase emulators:start --only functions
```

### 2. Method A: Using the HTML Test Page

1. Open `test-createDrupalSite.html` in your browser
2. Make sure the "Local Emulator" option is selected
3. Enter a custom site name (optional)
4. Click the "Create Drupal Site" button
5. View the results in the result box

### 3. Method B: Using the JavaScript Test Script

1. Update the Firebase configuration in `test-createDrupalSite.js`
2. Run the script:
   ```bash
   node test-createDrupalSite.js
   ```

## Testing in Production

### 1. Deploy the Functions to Firebase

Before deploying, ensure all environment variables are set in the Firebase project:

```bash
firebase functions:secrets:set AWS_REGION
firebase functions:secrets:set AWS_KEY_PAIR
firebase functions:secrets:set AWS_ACCESS_KEY
firebase functions:secrets:set AWS_SECRET_KEY
firebase functions:secrets:set INSTANCE_PREFIX
```

Then deploy the functions:

```bash
firebase deploy --only functions
```

### 2. Method A: Using the HTML Test Page

1. Open `test-createDrupalSite.html` in your browser
2. Select the "Production" option
3. Enter a custom site name (optional)
4. Click the "Create Drupal Site" button
5. View the results in the result box

### 3. Method B: Using the Firebase Console

1. Go to the Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Navigate to Functions > Logs
4. Use the "Test function" button to test the `createDrupalSite` function
5. Enter the following test data:
   ```json
   {
     "data": {
       "customName": "test-site-console"
     }
   }
   ```
6. Click "Test function" and view the results

## Expected Results

When testing in development mode, you should receive mock data:

```json
{
  "success": true,
  "operation": {
    "id": "mock-operation-id",
    "status": "Completed",
    "type": "CreateInstance"
  }
}
```

When testing in production with valid AWS credentials, you should receive actual AWS Lightsail operation data:

```json
{
  "success": true,
  "operation": {
    "id": "actual-operation-id",
    "status": "Started",
    "type": "CreateInstance"
  }
}
```

## Troubleshooting

1. **AWS Credentials Error**: If you receive an "AWS credentials are required" error, ensure the AWS environment variables are properly set.

2. **Key Pair Not Found**: If you receive an "AWS key pair not found" error, ensure the key pair exists in your AWS Lightsail account.

3. **Instance Name Too Long**: If you receive an "Instance name is too long" error, use a shorter custom name.

4. **CORS Issues**: If you encounter CORS issues when testing from a browser, ensure the CORS settings in the function are properly configured.

5. **Function Not Found**: If the function is not found, ensure it's properly exported in the `index.ts` file and deployed to Firebase.
