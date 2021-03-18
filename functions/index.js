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
        id: 'storrs',
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
});


/**
 * Using Express for the new endpoint
 * @url https://firebase.google.com/docs/functions/http-events#using_existing_express_apps
 */
const express = require('express');
const cors = require('cors');

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

app.get('/:setId', (req, res) => {

    // The requested data setId to retrieve. Currently: storrs or windham
    const setId = req.params.setId;

    // Set up our JSON response
    let json = {
        currentSampleSet: {
            "collectionID": setId,
            "mostRecentCollectionDate": ''
        },
        samples: []
    };

    // Determines which CSV file to fetch
    const csv = csvImports.filter(instance => instance.id === setId);

    // https://cloud.google.com/storage/docs/downloading-objects#storage-download-object-nodejs
    bucket.file(csv[0].ref).download().then(data =>{
        
        // Parse the CSV file
        const records = parse(data[0], {
            columns: true,
            skip_empty_lines: true,
            trim: true
        })

        // Clean the data before output
        records.forEach( (record, i, arr) => {

            // Assign an id
            record.id = record[''];
            delete record[''];

            // Rename locations in the Storrs csv only
            if(record['location']){
                record['location'] = mappings[record['location']];
            }

            // Keeps track of the most recent collection date
            if (record.date.replace('-', '') > json.currentSampleSet.mostRecentCollectionDate.replace('-', '') && record.date !== 'NA'){
                json.currentSampleSet.mostRecentCollectionDate = record.date;
            } 
        }); 

        // Add the cleansed records to our json response
        json.samples = records;

        // Request that the browser cache this request for 12 hours
        res.set('Cache-Control', 'public, max-age=43200, s-maxage=43200');

        return res.status(200).send(json);
    }).catch(error =>{
        return res.status(404).send(error);
    })

});
exports.samples = functions.https.onRequest(app);
