require('dotenv').config()
const functions = require('firebase-functions');
const parse = require('csv-parse/lib/sync');
const got = require('got');

const admin = require('firebase-admin');
admin.initializeApp();

// Firestore config
// @url https://firebase.google.com/docs/reference/js/firebase.firestore.Settings
const db = admin.firestore();
db.settings({
    ignoreUndefinedProperties: true
})

const bucket = admin.storage().bucket();

/**
 * Each CSV that we'll import
 */
const csvImports = [
    {
        id: 'imported',
        description: 'This holds the Storrs campus data',
        url: `https://${process.env.GITHUB_USER}:${process.env.GITHUB_TOKEN}@${process.env.RAW_WASTEWATER_URL}`,
        ref: 'samples/storrs.csv'
    },
    {
        id: 'windham',
        description: 'This holds the town of Windham data',
        url: `https://${process.env.GITHUB_USER}:${process.env.GITHUB_TOKEN}@${process.env.WINDHAM_WASTEWATER_URL}`,
        ref: 'samples/windham.csv'
    },
    
]   

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


exports.importWastewaterData = functions.https.onRequest( async (req, res) => {

    // Only accept post requests
    if(req.method !== 'POST') return res.status(403).send("Forbidden");


    let saveStatus = new Promise( (resolve, reject) => {
        csvImports.forEach( (csv, index, arr) => {

            // Get CSV Data
            got(csv.url).then( (response) => {
                return response.body;
            }).then(csvData => {
                // Save the csv file
                bucket.file(csv.ref).save(csvData).then(()=>{
                    if(index+1 === arr.length){
                        // if this was the last file, we resolve the promise
                        resolve('Samples were imported successfully.')
                    }
                }).catch(error => {
                    reject(error)
                })
            }).catch(error => {
                reject(error);
            });
        });
    })
 
    saveStatus.then((msg)=> {
        return res.status(200).send(msg);
    }).catch( error => {
        return res.status(404).send(error);
    });




    // // Human readable ID for our import job
    // const importID = Date();    

    // // Root Collection for all sample imports
    // const rootCollection = process.env.NODE_ENV === 'production' ? 'samples' : 'samplesUnitTests';
    // const rootCollectionRef = admin.firestore().collection(rootCollection); 

    // /**
    //  * Import each CSV files
    //  */
    // csvImports.forEach( async (csv) => {

    //     // The collection for the current import
    //     let collectionRef = rootCollectionRef.doc( csv.id ).collection( importID );      

    //     // Most recent collection date
    //     let mostRecentCollectionDate = "";


    //     /**
    //      * Read and parse the CSV
    //      * 
    //      * @url https://csv.js.org/parse/api/sync/
    //      */
    //     let csvData;
    //     try {
    //         let { body } = await got(csv.url);
    //         csvData = body;
    //     } catch (error) {
    //         return res.send(`Couldn't fetch CSV file: ${error}`)            
    //     }
    //     const records = parse(csvData, {
    //         columns: true,
    //         skip_empty_lines: true,
    //         trim: true
    //     })

    //     let chunks = chunkArray(records, 500);

    //     chunks.forEach( async (chunk, index) => {

    //         let batches = [];
    //         batches[index] = db.batch();

    //         // Iterate over each record/row in the CSV
    //         chunk.forEach( async (record) => {

                
    //             // use empty column name as "id"
    //             let id = record[''];
    //             delete record[''];

    //             // Rename locations in the Storrs csv only
    //             if(record['location']){
    //                 record['location'] = mappings[record['location']];
    //             }
                

    //             if (record.date.replace('-', '') > mostRecentCollectionDate.replace('-', '') && record.date !== 'NA'){
    //                 mostRecentCollectionDate = record.date;
    //             }

    //             batches[index].set(collectionRef.doc(id), record, {merge: true})


    //         });

    //         await batches[index].commit();

    //     });

    //     await rootCollectionRef.doc( csv.id ).set({
    //         "currentSampleSet": {
    //             "collectionID": importID,
    //             "mostRecentCollectionDate": mostRecentCollectionDate
    //         }
    //     }, {merge: true})         
        

    // });

});