require('dotenv').config()
const functions = require('firebase-functions');
const parse = require('csv-parse');
const got = require('got');

const admin = require('firebase-admin');
admin.initializeApp();

const mappings = {
    "HV"    : "QuarantineDorm",
    "NO"    : "DormComplex1",
    "NW"    : "DormComplex2",
    "SUB"   : "StudentUnion",
    "TW"    : "DormComplex3",
    "WWTP"  : "WastewaterTreatmentPlant",
    "MANS"  : "IsolationDorm1",
    "SO"    : "DormComplex4",
    "WOOD"  : "LibraryandCentralCampus",
    "STRC"  : "DormComplex5",
    "GARG"  : "ApartmentComplex1",
    "CHOK"  : "ApartmentComplex2",
    "ALUM"  : "ApartmentComplex3",
    "HILL"  : "ApartmentComplex4",
    "GRAD"  : "IsolationDorm2"
}

/**
 * TODO: Unit Tests
 */
exports.importWastewaterData = functions.https.onRequest( async (req, res) => {

    if(req.method !== 'POST') return res.status(403).send("Forbidden");

    // Wrap our work in a promise to control when we send the http response
    const allImportsFinished = new Promise( (resolve, reject) => {

        /**
         * Each CSV that we'll import
         */
        const csvImports = [
            {
                id: 'imported',
                description: 'This holds the Storrs campus data',
                url: `https://${process.env.GITHUB_USER}:${process.env.GITHUB_TOKEN}@${process.env.RAW_WASTEWATER_URL}`
            },
            {
                id: 'windham',
                description: 'This holds the town of Windham data',
                url: `https://${process.env.GITHUB_USER}:${process.env.GITHUB_TOKEN}@${process.env.WINDHAM_WASTEWATER_URL}`
            },
            
        ]    

        // Human readable ID for our import job
        const importID = Date();    

        // Root Collection for all sample imports
        const rootCollection = process.env.NODE_ENV == 'production' ? 'samples' : 'samplesUnitTests';
        const rootCollectionRef = admin.firestore().collection(rootCollection);    

        //  Storage for all of the "write" promises.
        let writes = {};

        // Counter for the number of imported CSV files
        let csvCounter = 0;

        /**
         * Import each CSV files
         */
        csvImports.forEach( async (csv) => {

            // The collection for the current import
            let collectionRef = rootCollectionRef.doc( csv.id ).collection( importID );

            // Where we reference the current sample set. Serves as a pointer later on.
            // let currentSampleSetDoc = rootCollectionRef.doc('currentSampleSet');        

            // Most recent collection date
            let mostRecentCollectionDate = "";

            // Namespace the "writes" by the csv id, to keep them separate from other writes
            writes[csv.id] = [];

            /**
             * Read and parse the CSV stream
             * 
             * @url https://csv.js.org/parse/api/stream/
             */
            let parser = got(csv.url, { isStream: true }).pipe(parse({
                columns: true,
                trim: true       
            }));

            // Iterate over each record/row in the CSV
            for await (const record of parser) {
                
                // use empty column name as "id"
                let id = record[''];
                delete record[''];

                // Rename locations in the Storrs csv only
                if(record['location']){
                    record['location'] = mappings[record['location']];
                }
                

                if (record.date.replace('-', '') > mostRecentCollectionDate.replace('-', '') && record.date !== 'NA'){
                    mostRecentCollectionDate = record.date;
                }

                /**
                 * I would batch these, but there's a limit of
                 * 500 records, so we'd have to split everything into
                 * separate batches. Future me.
                 * 
                 * TODO:  Split writes into batches
                 */
                writes[csv.id].push(collectionRef.doc(id).set(record, {merge: true}));           
            }
            
            // Handle the success or failure of our writes
            Promise.all(writes[csv.id]).then( async (values) => {
                /**
                 * Success! Update the reference to the current data set
                 * so everyone can find it among our collections
                 */ 
                await rootCollectionRef.doc( csv.id ).set({
                    "currentSampleSet": {
                        "collectionID": importID,
                        "mostRecentCollectionDate": mostRecentCollectionDate
                    }
                }, {merge: true})
                functions.logger.log(`${writes[csv.id].length} samples were imported.`);
                csvCounter++;
                
                // Again, this feels dumb, but..
                if(csvCounter === csvImports.length){
                    resolve()
                }
            }).catch(error => {
                // Fahhk - something went wrong
                functions.logger.log(error);
                reject()
            });

        });

    });


    /**
     * There's probably a better way to do this but...
     */
    allImportsFinished.then(val => {
        res.send("Samples were imported successfully.");
    }).catch(error => {
        res.send("Samples were not imported successfully.");
    });
});