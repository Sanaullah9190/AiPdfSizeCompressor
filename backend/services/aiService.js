// services/aiService.js

const { pipeline } = require('@xenova/transformers');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

let classifier = null;

const initializeClassifier = async () => {
  if (!classifier) {
    console.log('AI Service (Local): Model ko pehli baar load kar raha hoon...');
    classifier = await pipeline(
      'text-classification', 
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );
    console.log('AI Service (Local): Model successfully load ho gaya hai.');
  }
  return classifier;
};


const analyzePdf = async (pdfPath, originalSizeMB) => {
  try {
    console.log('AI Service (Local): PDF padh raha hoon...');
    
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text.trim();

    // --- NEW: Humara "Smart" Logic ---

    // 1. Minimum Recommended Size Calculate karna
    // Logic: Kam se kam original size ka 15% rakho
    let recommendedMinSize = originalSizeMB * 0.15; // 15%

    // Lekin 1.5 MB se kam toh kabhi recommend mat karo
    if (recommendedMinSize < 1.5) {
      recommendedMinSize = 1.5;
    }
    // Aur 10 MB se zyada bhi recommend mat karo (max limit)
    if (recommendedMinSize > 10) {
      recommendedMinSize = 10;
    }

    // Isse 1 decimal place tak round kar lo (jaise 2.3)
    const finalMinSize = Number(recommendedMinSize.toFixed(1));

    // ---

    // 2. Ab 'Image' vs 'Text' check karna
    if (pdfText.length < 100) {
      console.log('AI Service (Local): Bahut kam text mila. Ise "Image" maan raha hoon.');
      // Return "Image" aur "Recommended Size"
      return { type: 'Image', minSize: finalMinSize };
    }

    // 3. Text hai toh classify karo
    const textClassifier = await initializeClassifier();
    const textSample = pdfText.substring(0, 500);
    console.log('AI Service (Local): Text ka analysis kar raha hoon...');
    const result = await textClassifier(textSample);

    if (result[0].score < 0.6) {
      console.log('AI Service (Local): AI confident nahi hai. Ise "Image" maan raha hoon.');
      return { type: 'Image', minSize: finalMinSize };
    } else {
      console.log('AI Service (Local): Yeh "Text" file hai.');
      return { type: 'Text', minSize: 0 }; 
    }

  } catch (error) {
    console.error('AI Analysis (Local) mein error:', error);
    return { type: 'Text', minSize: 0 }; 
  }
};

module.exports = { analyzePdf };