const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2; // <-- New Cloudinary Package
const fs = require('fs'); // To delete the temporary local file after upload
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Setup Multer to temporarily save files before sending to Cloudinary
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// Updated Database Schema (Now includes the Cloudinary Download URL)
const OrderSchema = new mongoose.Schema({
    infill: String,
    material: String,
    color: String,
    originalFileName: String,
    fileUrl: String, // <-- Link to download the 3D model
    orderDate: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// Existing Installer Schema
const InstallerSchema = new mongoose.Schema({
    originalFileName: String,
    path: String,
    uploadDate: { type: Date, default: Date.now }
});
const Installer = mongoose.model('Installer', InstallerSchema);

// API Route: Receive customer order & Upload to Cloudinary
app.post('/api/orders', upload.single('modelFile'), async (req, res) => {
    try {
        let fileDownloadUrl = "No file attached";

        if (req.file) {
            // Upload the file to Cloudinary as a 'raw' file (required for .stl and .obj)
            const cloudResult = await cloudinary.uploader.upload(req.file.path, {
                resource_type: "raw",
                folder: "CA_3D_Orders"
            });
            fileDownloadUrl = cloudResult.secure_url;

            // Delete the temporary file from the server to save space
            fs.unlinkSync(req.file.path); 
        }

        const newOrder = new Order({
            infill: req.body.infill,
            material: req.body.material,
            color: req.body.color,
            originalFileName: req.file ? req.file.originalname : "Unknown",
            fileUrl: fileDownloadUrl
        });
        
        await newOrder.save();
        res.status(201).json({ message: "Order saved successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save the order" });
    }
});

// NEW API Route: Get all orders for the Admin Dashboard
app.get('/api/orders', async (req, res) => {
    try {
        // Find all orders and sort by newest first
        const orders = await Order.find().sort({ orderDate: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const userPassword = req.body.password;
    if (userPassword === process.env.ADMIN_PASSWORD) {
        res.status(200).json({ success: true, message: "Access Granted" });
    } else {
        res.status(401).json({ success: false, message: "Access Denied" });
    }
});

// Desktop Installer routes
app.post('/api/admin/installer', upload.single('setupFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        await Installer.deleteMany({}); 
        const newInstaller = new Installer({ originalFileName: req.file.originalname, path: req.file.path });
        await newInstaller.save();
        res.status(200).json({ message: "Installer uploaded successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to upload installer" });
    }
});
app.get('/api/installer/download', async (req, res) => {
    try {
        const latest = await Installer.findOne().sort({ uploadDate: -1 });
        if (!latest) return res.status(404).json({ error: "No installer available" });
        res.download(path.resolve(latest.path), latest.originalFileName);
    } catch (err) {
        res.status(500).json({ error: "Failed to download installer" });
    }
});

app.get('/', (req, res) => res.send("C & A Backend is Live"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));