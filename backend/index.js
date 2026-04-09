const express = require("express");
const app = express();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();
const port = process.env.PORT || 4000;
const jwt = require("jsonwebtoken");

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const Product = require("./schema/product");
const User = require("./schema/user");

// --------------------------------------------------
// CORS - Allow frontend and admin domains
// --------------------------------------------------
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean)
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// --------------------------------------------------
// Middleware
// --------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/images", express.static("uploads/images"));

// --------------------------------------------------
// Connect to MongoDB
// --------------------------------------------------
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASWORD}@cluster0.1fb4jph.mongodb.net/e-commerce`
  )
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// --------------------------------------------------
// JWT Secret (use env variable, fallback for dev only)
// --------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || "secret_ecom_dev_only";

// --------------------------------------------------
// MULTER & CLOUDINARY SETUP
// --------------------------------------------------
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "generalmarket",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }]
  }
});

const upload = multer({ storage });

// --------------------------------------------------
// UPLOAD IMAGES (CLOUDINARY)
// --------------------------------------------------
app.post("/upload", upload.array("images", 12), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    const imageUrls = req.files.map((file) => file.path);
    return res.json({ success: true, urls: imageUrls });
  } catch (error) {
    console.error("Upload Error:", error);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// --------------------------------------------------
// CREATE PRODUCT
// --------------------------------------------------
app.post("/addproduct", async (req, res) => {
  try {
    const products = await Product.find({});
    const newId = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const {
      category, title, description, price, transaction,
      condition, region, city, address, zip, phone, email, images
    } = req.body;

    const product = new Product({
      id: newId, category, title, description, price,
      transaction, condition, region, city, address,
      zip, phone, email, images,
      createdAt: new Date(),
      available: true
    });

    await product.save();
    res.json({ success: true, message: "Product created successfully", product });
  } catch (err) {
    console.error("❌ Error creating product:", err.message);
    res.status(500).json({ success: false });
  }
});

// --------------------------------------------------
// DELETE PRODUCT
// --------------------------------------------------
app.post("/removeproduct", async (req, res) => {
  try {
    const { id } = req.body;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.cloudinary_id) {
      await cloudinary.uploader.destroy(product.cloudinary_id);
    }

    await Product.findByIdAndDelete(id);
    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("REMOVE PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

// --------------------------------------------------
// GET ALL PRODUCTS
// --------------------------------------------------
app.get("/allproduct", async (req, res) => {
  let products = await Product.find({});
  res.send(products);
});

// --------------------------------------------------
// SIGNUP
// --------------------------------------------------
app.post("/signup", async (req, res) => {
  let check = await User.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({ success: false, errors: "email address already exist" });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) { cart[i] = 0; }

  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    cart: cart
  });

  await user.save();
  const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET);
  res.json({ success: true, token });
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------
app.post("/login", async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (user) {
    const passMatch = req.body.password === user.password;
    if (passMatch) {
      const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, error: "Password or Username is Incorrect" });
    }
  } else {
    res.json({ success: false, error: "Wrong Email or Password" });
  }
});

// --------------------------------------------------
// NEW COLLECTION
// --------------------------------------------------
app.get("/newcollection", async (req, res) => {
  let product = await Product.find({});
  let newcollection = product.slice(1).slice(-8);
  res.send(newcollection);
});

// --------------------------------------------------
// POPULAR PRODUCTS
// --------------------------------------------------
app.get("/popular", async (req, res) => {
  let popularProducts = await Product.find({}).limit(8);
  res.send(popularProducts);
});

// --------------------------------------------------
// AUTH MIDDLEWARE
// --------------------------------------------------
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    return res.status(401).send({ errors: "Please Authenticate using Valid Token" });
  }
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).send({ errors: "Please authenticate using a valid token" });
  }
};

// --------------------------------------------------
// CART ENDPOINTS
// --------------------------------------------------
app.post("/addtocart", fetchUser, async (req, res) => {
  let userData = await User.findOne({ _id: req.user.id });
  userData.cart[req.body.itemId] += 1;
  await User.findOneAndUpdate({ _id: req.user.id }, { cart: userData.cart });
  res.send("Added");
});

app.post("/removefromcart", fetchUser, async (req, res) => {
  let userData = await User.findOne({ _id: req.user.id });
  if (userData.cart[req.body.itemId]) userData.cart[req.body.itemId] -= 1;
  await User.findOneAndUpdate({ _id: req.user.id }, { cart: userData.cart });
  res.send("Removed");
});

app.get("/getcart", fetchUser, async (req, res) => {
  try {
    let userData = await User.findOne({ _id: req.user.id });
    res.json({ cartData: userData.cart });
  } catch (error) {
    res.status(500).json({ error: "Server error fetching cart" });
  }
});

// --------------------------------------------------
// RELATED PRODUCTS
// --------------------------------------------------
app.get("/related-products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const category = product.category.trim();
    const price = product.price;
    const minPrice = price * 0.8;
    const maxPrice = price * 1.2;

    let relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: { $regex: `^${category}$`, $options: "i" },
      price: { $gte: minPrice, $lte: maxPrice }
    }).limit(6);

    if (relatedProducts.length === 0) {
      relatedProducts = await Product.find({
        _id: { $ne: product._id },
        category: { $regex: `^${category}$`, $options: "i" }
      }).limit(6);
    }

    if (relatedProducts.length === 0) {
      relatedProducts = await Product.find({ _id: { $ne: product._id } }).limit(6);
    }

    res.json(relatedProducts);
  } catch (error) {
    console.error("Related products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------------------------------
// Serve React frontend build (production only)
// --------------------------------------------------
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
  });
}

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
app.listen(port, (error) => {
  if (!error) {
    console.log(`✅ Server running on port ${port}`);
  } else {
    console.log("Error: " + error);
  }
});
