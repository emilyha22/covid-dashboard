const functions = require('firebase-functions');
const parse = require('csv-parse')


const admin = require('firebase-admin');
admin.initializeApp();

exports.importDataDump = functions.storage.object().onFinalize(async (file, context) => {

    // Human readable ID for our import job
    const importID = Date();

    // Root Collection for all sample imports
    const rootCollection = 'samples';
    const rootCollectionRef = admin.firestore().collection(rootCollection);

    // The collection for the current import
    const collectionRef = rootCollectionRef.doc( 'imported' ).collection( importID );

    // Where we reference the current sample set. Serves as a pointer later on.
    const currentSampleSetDoc = rootCollectionRef.doc('currentSampleSet');

    // Get the reference to the CSV file
    const fileRef = admin.storage().bucket().file(file.name);

    // Read and parse the CSV stream
    const parser = fileRef.createReadStream().pipe(parse({
        columns: true,
        trim: true
    }));

    //  Storage for all of the "write" promises.
    let writes = [];

    // Iterate over each record/row in the CSV
    parser.on('readable', function(){
        while (record = parser.read()) {
           
            // use empty column name as "id"
            let id = record[''];
            delete record[''];
  

            /**
             * I would batch these, but there's a limit of
             * 500 records, so we'd have to split everything into
             * separate batches. Future me.
             * 
             * @todo Split writes into batches
             */
            writes.push(collectionRef.doc(id).set(record));          
        }
    });

    /**
     * Now we find out if all of the writes were successful.
     * If they aren't, we don't update the pointer to our import.
     */
    parser.on('end', function(){
        Promise.all(writes).then( async (values) => {
            /**
             * Success! Update the reference to the current data set
             * so everyone can find it among our collections
             */ 
            await currentSampleSetDoc.update({
                collectionID: importID
            })
            functions.logger.log(`${writes.length} samples were imported.`);
        }).catch(error => {
            // Fahhk - something went wrong
            functions.logger.log(error);
        });     
    })    

});