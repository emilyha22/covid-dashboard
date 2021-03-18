# Cloud Functions for the Covid Dashboard

## Requirements
The firebase cli handle deployments and the local environment. When using the firestore emulator, you'll need to have [JDK installed](https://firebase.google.com/docs/emulator-suite/install_and_configure).

* [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
* [Java Runtime](https://www.oracle.com/java/) (`brew install openjdk`)

## Initial Setup
```bash
# Make sure you're in the functions directory
$ cd functions

# Copy the example env file (and edit the .env file!!!)
$ cp .env.example .env

# Install dependencies
$ npm install

# Run the local emulator
$ npm run serve
```
