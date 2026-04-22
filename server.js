const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Setup Multer to handle file uploads (saves temporarily to an 'uploads' folder)
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// Define what a customer order looks like in the database
const OrderSchema = new mongoose.Schema({
    infill: String,
    material: String,
    color: String,
    originalFileName: String,
    fileSize: Number,
    orderDate: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

// API Route: Receive customer order from the frontend
app.post('/api/orders', upload.single('modelFile'), async (req, res) => {
    try {
        const newOrder = new Order({
            infill: req.body.infill,
            material: req.body.material,
            color: req.body.color,
            originalFileName: req.file ? req.file.originalname : "No file attached",
            fileSize: req.file ? req.file.size : 0
        });
        
        await newOrder.save();
        console.log("New order saved:", newOrder.originalFileName);
        
        res.status(201).json({ message: "Order saved successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save the order" });
    }
});

// Health check route for Railway deployment
app.get('/', (req, res) => res.send("C & A Backend is Live"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));