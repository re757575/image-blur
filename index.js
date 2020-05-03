// https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/master/functions/imagemagick

'use strict';

// [START functions_imagemagick_setup]
const gm = require('gm').subClass({ imageMagick: true });
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const vision = require('@google-cloud/vision');

const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const client = new vision.ImageAnnotatorClient();

// // local run
// const fileName = './zombie.jpg';
// (async () => {
//     const [result] = await client.safeSearchDetection(fileName);
//     const detections = result.safeSearchAnnotation || {};
//     console.log(detections);
// })();
// return 1;

const { BLURRED_BUCKET_NAME } = process.env;
// [END functions_imagemagick_setup]

// [START functions_imagemagick_analyze]
// Blurs uploaded images that are flagged as Adult or Violence.
exports.blurOffensiveImages = async (event) => {
    // This event represents the triggering Cloud Storage object.
    const object = event;

    const file = storage.bucket(object.bucket).file(object.name);
    const filePath = `gs://${object.bucket}/${object.name}`;

    console.log(`Analyzing ${file.name}.`);

    try {
        const [result] = await client.safeSearchDetection(filePath);
        const detections = result.safeSearchAnnotation || {};

        if (
            // Levels are defined in https://cloud.google.com/vision/docs/reference/rest/v1/AnnotateImageResponse#likelihood
            detections.adult === 'VERY_LIKELY' ||
            detections.violence === 'VERY_LIKELY'
        ) {
            console.log(`Detected ${file.name} as inappropriate.`);
            return await blurImage(file, BLURRED_BUCKET_NAME);
        } else {
            console.log(`Detected ${file.name} as OK.`);
        }
    } catch (err) {
        console.error(`Failed to analyze ${file.name}.`, err);
        throw err;
    }
};
// [END functions_imagemagick_analyze]

// [START functions_imagemagick_blur]
// Blurs the given file using ImageMagick, and uploads it to another bucket.
const blurImage = async (file, blurredBucketName) => {
    const tempLocalPath = `/tmp/${path.parse(file.name).base}`;

    // Download file from bucket.
    try {
        await file.download({ destination: tempLocalPath });

        console.log(`Downloaded ${file.name} to ${tempLocalPath}.`);
    } catch (err) {
        throw new Error(`File download failed: ${err}`);
    }

    await new Promise((resolve, reject) => {
        gm(tempLocalPath)
            .blur(0, 16)
            .write(tempLocalPath, (err, stdout) => {
                if (err) {
                    console.error('Failed to blur image.', err);
                    reject(err);
                } else {
                    console.log(`Blurred image: ${file.name}`);
                    resolve(stdout);
                }
            });
    });

    // Upload result to a different bucket, to avoid re-triggering this function.
    const blurredBucket = storage.bucket(blurredBucketName);

    // Upload the Blurred image back into the bucket.
    const gcsPath = `gs://${blurredBucketName}/${file.name}`;
    try {
        await blurredBucket.upload(tempLocalPath, { destination: file.name });
        console.log(`Uploaded blurred image to: ${gcsPath}`);
    } catch (err) {
        throw new Error(`Unable to upload blurred image to ${gcsPath}: ${err}`);
    }

    // Delete the temporary file.
    const unlink = promisify(fs.unlink);
    return unlink(tempLocalPath);
};
// [END functions_imagemagick_blur]
