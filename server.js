const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI // You can set this to "http://localhost:3000"
);

oauth2Client.setCredentials({
  access_token: process.env.ACCESS_TOKEN,
  refresh_token: process.env.REFRESH_TOKEN,
  scope: 'https://www.googleapis.com/auth/drive.file',
  token_type: 'Bearer',
  expiry_date: true
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Upload or update chat file
app.post('/upload', upload.single('file'), async (req, res) => {
  const { fileName, folderId } = req.body;
  const buffer = req.file.buffer;

  try {
    // Check if file exists
    const fileList = await drive.files.list({
      q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
      fields: 'files(id, name)',
    });

    let fileId = fileList.data.files[0]?.id;

    if (fileId) {
      // Update existing file
      await drive.files.update({
        fileId: fileId,
        media: {
          mimeType: 'text/plain',
          body: buffer,
        },
      });
    } else {
      // Create new file
      await drive.files.create({
        resource: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType: 'text/plain',
          body: buffer,
        },
        fields: 'id',
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});
