const express = require("express");
const router = express.Router();
const { getRelatedProducts } = require("../controllers/ProductController");

router.get("/products/:id/related", getRelatedProducts);

module.exports = router;