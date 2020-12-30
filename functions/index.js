const functions = require('firebase-functions');
const parse = require('csv-parse')


const admin = require('firebase-admin');
admin.initializeApp();

exports.importDataDump = functions.storage.object().onFinalize( async (file, context) => {

    // Human readable ID for our import job
    const importID = Date();

    // Root Collection for all sample imports
    const rootCollection = process.env.NODE_ENV == 'production' ? 'samples' : 'samplesUnitTests';
    const rootCollectionRef = admin.firestore().collection(rootCollection);

    // The collection for the current import
    const collectionRef = rootCollectionRef.doc( 'imported' ).collection( importID );

    // Where we reference the current sample set. Serves as a pointer later on.
    const currentSampleSetDoc = rootCollectionRef.doc('currentSampleSet');

    // Get the reference to the CSV file
    const fileRef = admin.storage().bucket().file(file.name);

    // Most recent collection date
    let mostRecentCollectionDate = "";

    //  Storage for all of the "write" promises.
    let writes = [];

    /**
     * Read and parse the CSV stream
     * 
     * @url https://csv.js.org/parse/api/stream/
     */
    const parser = fileRef.createReadStream().pipe(parse({
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
        console.log("Samples were imported");
    }).catch(error => {
        // Fahhk - something went wrong
        functions.logger.log(error);
    });
});