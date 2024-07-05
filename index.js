const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");

const app = express();
const port = 7000;


const allowedOrigins = [ 'http://localhost:3000','https://ukcareersponsor.com/']; // Add more origins as needed
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true // Allow cookies to be sent cross-origin
}));
// Set up MongoDB connection
mongoose.connect('mongodb+srv://tourism:abubaker@cluster0.ndjmmo0.mongodb.net/', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function () {
    console.log('Connected to MongoDB');
});

// Create a Resume model
const Resume = mongoose.model("Resume", {
    name: String,
    email: String,
    phone: String,
    content: Buffer, // Store PDF content as Buffer
    certificateNumber: String
});

// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint to upload resume PDF
app.post("/upload", upload.single("resume"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const buffer = req.file.buffer;
        const data = await pdfParse(buffer);
        const resumeData = {
            name: extractName(data.text),
            email: extractEmail(data.text),
            phone: extractPhone(data.text),
            content: buffer, // Store PDF content as Buffer
        };

        // Check if certificate number is provided
        if (req.body.certificateNumber) {
            resumeData.certificateNumber = req.body.certificateNumber;
        } else {
            return res.status(400).json({ error: "Certificate number is required" });
        }

        // Save the extracted data to MongoDB
        const savedResume = await new Resume(resumeData).save();

        res.json({ success: true, resume: savedResume });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

function extractName(text) {
    const nameRegex = /([a-zA-Z]+[a-zA-Z\s]+)/;
    const match = text.match(nameRegex);
    return match ? match[0] : "";
}

function extractEmail(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : "";
}

function extractPhone(text) {
    const phoneRegex = /(\+\d{1,2}\s?)?(\d{10,})/;
    const match = text.match(phoneRegex);
    return match ? match[0] : "";
}
app.get("/resume/:certificateNumber", async (req, res) => {
    try {
        const certificateNumber = req.params.certificateNumber;
        const resume = await Resume.findOne({ certificateNumber });

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        // Send PDF content as response
        res.contentType("application/pdf");
        res.send(resume.content);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})
app.get("/", async (req, res) => {
    res.send("Hello from backend UK");
  });
  
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
