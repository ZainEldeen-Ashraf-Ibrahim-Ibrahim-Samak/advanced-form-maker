require('dotenv').config({ path: '.env.local' });
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const PRESET_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'submissions';

// Re-implementing the core logic from production code (ensureUploadPresetExists)
async function ensureUploadPresetExists(presetName) {
  try {
    console.log(`Checking for preset: ${presetName}...`);
    const preset = await cloudinary.api.upload_preset(presetName);
    console.log(`✅ SUCCESS: Preset '${presetName}' was verified in your account.`);
    console.log(`Settings: Folder='${preset.folder}', Signed='${!preset.unsigned}'`);
    return true;
  } catch (error) {
    const httpCode = error?.http_code || error?.error?.http_code;
    console.log(`Caught error: HTTP ${httpCode} - ${error?.message || error?.error?.message}`);
    
    if (httpCode === 404) {
       console.log('❌ Preset still NOT found. This means it was either not created or there is a name mismatch.');
    } else {
       console.log('⚠️ Unexpected error structure:', JSON.stringify(error, null, 2));
    }
    return false;
  }
}

async function testCloudinary() {
  console.log(`--- Re-Testing Cloudinary Configuration ---`);
  console.log(`Cloud: ${cloudinary.config().cloud_name}`);
  
  const verified = await ensureUploadPresetExists(PRESET_NAME);
  
  if (verified) {
    console.log('\n--- Final Verification: Signature Generation ---');
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: PRESET_NAME, folder: 'submissions' },
      process.env.CLOUDINARY_API_SECRET
    );
    console.log(`Signature generated successfully: ${signature}`);
    console.log(`\n✅ RESULT: Everything is correctly configured and live!`);
  } else {
    console.log(`\n❌ RESULT: Configuration failed. Please check the logs above.`);
  }
  
  console.log(`\n--- Test Finished ---`);
}

testCloudinary();
