const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors()); // Allows your GitHub website to communicate with this server
app.use(express.json()); // Allows the server to read the calculator data

// API Route: Receives the calculation data
app.post('/api/calculate', (req, res) => {
    try {
        const data = req.body;
        console.log("Calculation received:", data);
        
        // Since no database is used, we just acknowledge receipt
        res.status(200).json({ 
            status: "Success",
            message: "C & A Server received your quote request." 
        });
    } catch (error) {
        res.status(500).json({ error: "Server error processing request" });
    }
});

// Health check route for Railway
app.get('/', (req, res) => {
    res.send("C & A Backend is running (No Database Mode)");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is active on port ${PORT}`);
});