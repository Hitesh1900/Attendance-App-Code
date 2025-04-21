import fs from 'fs';
import path from 'path';
import { faceapi, canvas, MODEL_PATH } from '../utilis/faceApiSetup.js';

let modelsLoaded = false;
let cachedDescriptors = null;


async function loadModelsOnce() {
  if (!modelsLoaded) {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
    ]);
    modelsLoaded = true;
  }
}

function loadDescriptorsOnce() {
  if (!cachedDescriptors) {
    const descriptorPath = path.resolve('descriptors.json');
    const descriptorData = fs.readFileSync(descriptorPath);
    const parsed = JSON.parse(descriptorData);

    cachedDescriptors = parsed.map(d => ({
      filename: d.filename,
      descriptor: new Float32Array(d.descriptor),
    }));
  }
}

async function resizeImage(image, width = 320, height = 240) {
  const { createCanvas } = canvas;
  const resizedCanvas = createCanvas(width, height);
  const ctx = resizedCanvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  return resizedCanvas;
}

export async function compareWithAllUploadedImages(base64Image) {
  await loadModelsOnce();    
  loadDescriptorsOnce();    

  const buffer = Buffer.from(base64Image, 'base64');
  const capturedImage = await canvas.loadImage(buffer);
  const resizedImage = await resizeImage(capturedImage, 320, 320);

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 160,         
    scoreThreshold: 0.5,    
  });

  const capturedDetection = await faceapi
    .detectSingleFace(resizedImage, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!capturedDetection) {
    return { match: false, message: 'No face detected in captured image' };
  }

  const capturedDescriptor = capturedDetection.descriptor;

  for (const saved of cachedDescriptors) {
    const distance = faceapi.euclideanDistance(capturedDescriptor, saved.descriptor);
    if (distance < 0.6) {
      return {
        match: true,
        message: `Face matched with ${saved.filename}`,
        matchedFile: saved.filename,
        distance,
      };
    }
  }

  return { match: false, message: 'No matching face found' };
}
