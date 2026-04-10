const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    id:{ 
        type: Number, 
        required: true 
    },
    category: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true
    },
    price:{
        type: Number,
        required: true 
    },
    transaction:{
        type: String,
    },
    condition:{
        type: String,
    },
    region:{
        type: String,
    },
    city:{
        type: String,
    },
    address: {
        type: String,
    },
    zip:{
        type: String,
    },
    phone:{
        type: String,
    },
    email:{
        type: String,
    },
    images: {
        type: [String],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    available: {
        type: Boolean,
        default: true
    }
});

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;



