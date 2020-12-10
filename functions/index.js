const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.importDataDump = functions.storage.object().onFinalize(async (file, context) => {
    // console.log()
    console.log(`  Event: ${context.eventId}`);
    console.log(`  Event Type: ${context.eventType}`);
    console.log(`  Bucket: ${file.bucket}`);
    console.log(`  File: ${file.name}`);
    console.log(`  Metageneration: ${file.metageneration}`);
    console.log(`  Created: ${file.timeCreated}`);
    console.log(`  Updated: ${file.updated}`);
    // return;
});