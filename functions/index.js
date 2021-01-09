require('dotenv').config()
const functions = require('firebase-functions');
const parse = require('csv-parse');
const got = require('got');

const admin = require('firebase-admin');
admin.initializeApp();

// const mappings = [
//     "HV" = "Quarantine Dorm",
//              "NO" = "Dorm Complex",
//              "NW" = "Dorm Complex",
//              "SUB" = "Student Union",
//              "TW" = "Dorm Complex",
//              "WWTP" = "Wastewater Treatment Plant",
//              "MANS" = "Isolation Dorm",
//              "SO" = "Dorm Complex",
//              "WOOD" = "Library and Central campus",
//              "STRC" = "Dorm Complex",
//              "GARG" = "Apartment Complex",
//              "CHOK" = "Apartment Complex",
//              "ALUM" = "Apartment Complex",
//              "HILL" = "Apartment Complex",
//              "GRAD" = "Isolation Dorm"
// ]


exports.importWastewaterData = functions.https.onRequest( async (req, res) => {

    // Build our URL
    let csv = [
        'https://',
        process.env.GITHUB_USER,
        ':',
        process.env.GITHUB_TOKEN,
        '@',
        process.env.RAW_WASTEWATER_URL
    ].join('');

    // Human readable ID for our import job
    const importID = Date();

    // Root Collection for all sample imports
    const rootCollection = process.env.NODE_ENV == 'production' ? 'samples' : 'samplesUnitTests';
    const rootCollectionRef = admin.firestore().collection(rootCollection);

    // The collection for the current import
    const collectionRef = rootCollectionRef.doc( 'imported' ).collection( importID );

    // Where we reference the current sample set. Serves as a pointer later on.
    const currentSampleSetDoc = rootCollectionRef.doc('currentSampleSet');

    // Most recent collection date
    let mostRecentCollectionDate = "";

    //  Storage for all of the "write" promises.
    let writes = [];

    /**
     * Read and parse the CSV stream
     * 
     * @url https://csv.js.org/parse/api/stream/
     */
    let parser = got(csv, { isStream: true }).pipe(parse({
        columns: true,
        trim: true       
    }));

    // Iterate over each record/row in the CSV
    for await (const record of parser) {
        
        // use empty column name as "id"
        let id = record[''];
        delete record[''];

        if (record.date.replace('-', '') > mostRecentCollectionDate.replace('-', '') && record.date !== 'NA'){
            mostRecentCollectionDate = record.date;
        }

        /**
         * I would batch these, but there's a limit of
         * 500 records, so we'd have to split everything into
         * separate batches. Future me.
         * 
         * @todo Split writes into batches
         */
        writes.push(collectionRef.doc(id).set(record));     
        
        //  Use for testing without writing to firestore (comment previous line)
        // writes.push( 
        //     new Promise((resolve, reject) => {
        //         setTimeout(resolve, 10000, 'foo');
        //     }) 
        // );          
    }
    
    // Handle the success or failure of our writes
    return Promise.all(writes).then( async (values) => {
        /**
         * Success! Update the reference to the current data set
         * so everyone can find it among our collections
         */ 
        await currentSampleSetDoc.update({
            "collectionID": importID,
            "mostRecentCollectionDate": mostRecentCollectionDate
        })
        functions.logger.log(`${writes.length} samples were imported.`);
        res.send("Samples were imported");
    }).catch(error => {
        // Fahhk - something went wrong
        functions.logger.log(error);
        res.send("Samples were not imported");
    });
});