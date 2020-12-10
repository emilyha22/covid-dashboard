const admin = require('firebase-admin');
const assert = require('assert');
const uuid = require('uuid');
const sinon = require('sinon');

/**
 * We're gonna run these in online mode. Mostly because
 * we can't emulate the firebase storage service locally.
 * @url https://firebase.google.com/docs/functions/unit-testing#online-mode
 */ 
const test = require('firebase-functions-test')({
  databaseURL: 'https://covid-dashboard-f47ce.firebaseapp.com',
  storageBucket: 'covid-dashboard-f47ce.appspot.com',
  projectId: 'covid-dashboard-f47ce',
}, 'test/serviceAccountKey.json');

// Import functions for testing
const myFunctions = require('../index.js');
const wrapped = test.wrap(myFunctions.importDataDump);


const stubConsole = function () {
  sinon.stub(console, 'error');
  sinon.stub(console, 'log');
};

const restoreConsole = function () {
  console.log.restore();
  console.error.restore();
};

beforeEach(stubConsole);
afterEach(restoreConsole);

/**
 * Fetchs the deets for our test file
 * @url https://firebase.google.com/docs/storage/admin/start#use_a_default_bucket
 */
let metaData = {};
before(async () => {
    const bucket = admin.storage().bucket();
    [metaData] = await bucket.file("test/unit-test-file-do-not-delete-me.csv").getMetadata();
});


it('importDataDump: should print out event', async () => {

    // Call tested function and verify its behavior
    wrapped(metaData);
    assert.ok(console.log.calledWith(`  Event Type: google.storage.object.finalize`));
});