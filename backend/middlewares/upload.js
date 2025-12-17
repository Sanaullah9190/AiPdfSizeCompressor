// middlewares/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // __dirname = .../backend/middlewares
    // '..' = .../backend
    // 'uploads' = .../backend/uploads

  
    const uploadPath = path.join(__dirname,'..', 'uploads');
    
    // Yahaan check bhi kar lo ki yeh folder hai ya nahi
    if (!require('fs').existsSync(uploadPath)) {
      // Agar nahi hai, toh bana do
      require('fs').mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });
module.exports = upload;