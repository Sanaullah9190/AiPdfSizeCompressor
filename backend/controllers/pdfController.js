const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile); 
const fs = require('fs').promises; 
const path = require('path');
const fsSync = require('fs');
const { analyzePdf } = require('../services/aiService');


const qualitySettings = [
  '-dPDFSETTINGS=/printer', 
  '-dPDFSETTINGS=/ebook',   
  '-dPDFSETTINGS=/screen'   
];


const cleanupFiles = (...files) => {
  files.forEach((file) => {
    if (file && fsSync.existsSync(file)) {
      fsSync.unlinkSync(file);
    }
  });
  console.log('Temporary files delete kar di.');
};


const compressPdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Koi file upload nahi hui.');
  }

  const inputPath = req.file.path;
  const targetSizeMB = Number(req.body.targetSize); 
  const targetSizeInBytes = targetSizeMB * 1024 * 1024;

  console.log(`File receive hui: ${req.file.originalname}`);
  console.log(`Target Size: ${targetSizeMB} MB (${targetSizeInBytes} bytes)`);

  // --- AI BLOCK ---
  let originalSizeMB = 0;
  try {
    // 'fs' ab defined 
    const stats = await fs.stat(inputPath);
    originalSizeMB = stats.size / (1024 * 1024); 
  } catch (statError) {
    console.error('File size nahi mil raha:', statError);
  }

  try {
    console.log('AI se analysis shuru...');
    const analysisResult = await analyzePdf(inputPath, originalSizeMB); 
    console.log('AI Analysis Result:', analysisResult);

    if (analysisResult.type === 'Image' && targetSizeMB < analysisResult.minSize) {
      console.log('Warning: Target size AI ke recommended size se kam hai.');
      // 'cleanupFiles' 
      cleanupFiles(inputPath); 
      return res.status(400).json({
        message: `AI Warning: This PDF seems to contain images. For good quality, we recommend a target size above ${analysisResult.minSize} MB. Your target of ${targetSizeMB} MB is too low and will result in blurry images.`
      });
    }
  } catch (aiError) {
    console.error("AI analysis step mein error:", aiError);
  }
  // --- END OF AI BLOCK ---

  
  // --- Compression Loop 
  const gsCommandName = process.platform === 'win32' ? 'gswin64c' : 'gs';
  let bestOutputFile = null; 
  let smallestSize = Infinity;
  let targetMet = false;

  try {
    for (const setting of qualitySettings) {
      const outputFilename = `compressed-${setting.replace('/', '')}-${req.file.originalname}`;
      const outputPath = path.join(__dirname, '..', 'compressed', outputFilename);
      
      const gsArgs = [
        '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', setting, 
        '-dNOPAUSE', '-dQUIET', '-dBATCH',
        `-sOutputFile=${outputPath}`, inputPath
      ];

      console.log(`Trying compression with setting: ${setting}...`);
      await execFilePromise(gsCommandName, gsArgs);
      
      if (!fsSync.existsSync(outputPath)) {
          console.log(`Setting ${setting} ne koi file nahi banayi.`);
          continue;
      }

      const stats = await fs.stat(outputPath);
      console.log(`File bani: ${outputFilename}, Size: ${stats.size} bytes`);

      if (stats.size < smallestSize) {
        smallestSize = stats.size;
        bestOutputFile = outputPath;
      }

      if (stats.size <= targetSizeInBytes) {
        console.log('Target size achieve ho gaya!');
        targetMet = true;
        break; 
      }
    }
    
    if (bestOutputFile) {
      if(targetMet) {
        console.log(`Target achieve ho gaya! Bhej rahe hain: ${bestOutputFile}`);
      } else {
        console.log(`Target achieve nahi hua. Sabse chhoti file bhej rahe hain: ${bestOutputFile}`);
      }
      
      res.download(bestOutputFile, path.basename(bestOutputFile), (downloadError) => {
        if (downloadError) {
          console.error('Download Error:', downloadError);
        }
        // Saari temporary files ko delete karna
        cleanupFiles(inputPath, 
            path.join(__dirname, '..', 'compressed', `compressed--dPDFSETTINGS=printer-${req.file.originalname}`),
            path.join(__dirname, '..', 'compressed', `compressed--dPDFSETTINGS=ebook-${req.file.originalname}`),
            path.join(__dirname, '..', 'compressed', `compressed--dPDFSETTINGS=screen-${req.file.originalname}`)
        );
      });
    } else {
      throw new Error('Compression fail ho gayi, koi output file nahi bani.');
    }

  } catch (error) {
    console.error('Compression Logic Error:', error);
    cleanupFiles(inputPath); 
    res.status(500).send('File compress karne mein error aaya.');
  }
};

module.exports = {
  compressPdf,
};