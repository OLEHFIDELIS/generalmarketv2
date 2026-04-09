import React, { useState } from "react";
import axios from "axios";
import "./AddProductM.css";

const AddListing = () => {
  const [formData, setFormData] = useState({
    category: "",
    title: "",
    description: "",
    price: "",
    transaction: "",
    condition: "",
    region: "",
    city: "",
    address: "",
    zip: "",
    phone: "",
    email: "",
    images: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle basic input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle image file input
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, images: files });
  };

  // Submit handler with image upload logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.images.length) {
      alert("Please upload at least one image.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Step 1: Upload images
      const imageForm = new FormData();
      formData.images.forEach((img) => imageForm.append("images", img));

      const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL}/upload`, imageForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrls = uploadRes.data.urls || uploadRes.data;
      console.log("Uploaded image URLs:", imageUrls);

      // Step 2: Save product data
      const productData = { ...formData, images: imageUrls };

      await axios.post(`${import.meta.env.VITE_API_URL}/addproduct`, productData, {
        headers: { "Content-Type": "application/json" },
      });

      alert("✅ Listing submitted successfully!");
      setFormData({
        category: "",
        title: "",
        description: "",
        price: "",
        transaction: "",
        condition: "",
        region: "",
        city: "",
        address: "",
        zip: "",
        phone: "",
        email: "",
        images: [],
      });
    } catch (error) {
      console.error("Error submitting listing:", error);
      alert("❌ Error submitting listing, please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-listing-container">
      <h2>Add a New Listing</h2>

      <form className="listing-form" onSubmit={handleSubmit}>
        {/* Photos */}
        <div className="form-section">
          <h3>Photos</h3>
          <p>You can upload up to 12 pictures per listing.</p>
          <div className="upload-box ">
            <label htmlFor="images" className="upload-label">
              <i className="fas fa-cloud-upload-alt"></i>
              <p>Upload images</p>
            </label>
            <input
              type="file"
              id="images"
              name="images"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
          {/* Preview images */}
          {formData.images.length > 0 && (
            <div className="preview-grid upload-preview">
              {formData.images.map((img, index) => (
                <img
                  key={index}
                  src={URL.createObjectURL(img)}
                  alt={`preview-${index}`}
                  className="preview-img"
                />
              ))}
            </div>
          )}
        </div>

        {/* About the item */}
        <div className="form-section">
          <h3>About the Item</h3>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select category</option>
            <option value="electronics">Electronics</option>
            <option value="property">Property</option>
            <option value="vehicles">Vehicles</option>
            <option value="home & furniture">Home & Furniture</option>
            <option value="fashion & beauty">Fashion & Beauty</option>
            <option value="hobbies & entertainment">Hobbies & Entertainment</option>
            <option value="services">Services</option>
            <option value="garden & outdoor">Garden & Outdoor</option>
            <option value="jobs">Jobs</option>
            <option value="agriculture & food">Agriculture & Food</option>
            <option value="gadgets & accessories">Gadgets & Accessories</option>
            <option value="baby & kids">Baby & Kids</option>
            <option value="misc & others">Misc & Others</option>
            <option value="adult">Adult</option>
          </select>

          <input
            type="text"
            name="title"
            placeholder="Listing title"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            required
          ></textarea>
        </div>

        {/* Pricing */}
        <div className="form-section">
          <h3>Pricing & Status</h3>
          <div className="price-box">
            <span>₦</span>
            <input
              type="number"
              name="price"
              placeholder="Price"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="two-column">
            <select
              name="transaction"
              value={formData.transaction}
              onChange={handleChange}
            >
              <option value="">Any transaction</option>
              <option value="sell">Sell</option>
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
              <option value="exchange">Exchange</option>
            </select>

            <select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
            >
              <option value="">Any condition</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="form-section">
          <h3>Listing Location</h3>
          <select
            name="region"
            value={formData.region}
            onChange={handleChange}
          >
            <option value="">Select region</option>
            <option value="abia">Abia</option>
            <option value="adamawa">Adamawa</option>
            <option value="akwa-ibom">Akwa Ibom</option>
            <option value="anambra">Anambra</option>
            <option value="bauchi">Bauchi</option>
            <option value="bayelsa">Bayelsa</option>
            <option value="benue">Benue</option>
            <option value="borno">Borno</option>
            <option value="cross-river">Cross River</option>
            <option value="delta">Delta</option>
            <option value="ebonyi">Ebonyi</option>
            <option value="edo">Edo</option>
            <option value="ekiti">Ekiti</option>
            <option value="enugu">Enugu</option>
            <option value="gombe">Gombe</option>
            <option value="imo">Imo</option>
            <option value="jigawa">Jigawa</option>
            <option value="kaduna">Kaduna</option>
            <option value="kano">Kano</option>
            <option value="katsina">Katsina</option>
            <option value="kebbi">Kebbi</option>
            <option value="kogi">Kogi</option>
            <option value="kwara">Kwara</option>
            <option value="lagos">Lagos</option>
            <option value="nasarawa">Nasarawa</option>
            <option value="niger">Niger</option>
            <option value="ogun">Ogun</option>
            <option value="ondo">Ondo</option>
            <option value="osun">Osun</option>
            <option value="oyo">Oyo</option>
            <option value="plateau">Plateau</option>
            <option value="rivers">Rivers</option>
            <option value="sokoto">Sokoto</option>
            <option value="taraba">Taraba</option>
            <option value="yobe">Yobe</option>
            <option value="zamfara">Zamfara</option>
            <option value="fct">Abuja</option>
          </select>

          <input
            type="text"
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={handleChange}
          />

          <div className="two-column">
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
            />
            <input
              type="text"
              name="zip"
              placeholder="ZIP"
              value={formData.zip}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Seller Info */}
        <div className="form-section">
          <h3>Seller’s Details</h3>
          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* Submit */}
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
};

export default AddListing;
