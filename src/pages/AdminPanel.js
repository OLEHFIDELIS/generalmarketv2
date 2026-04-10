import React, { useState, useEffect } from "react";
import axios from "axios";

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = `
body { margin: 0; font-family: "Poppins", sans-serif; background-color: #f6f6f6; }
.admin { display: flex; flex-direction: column; }
.admin-navbar { display: flex; align-items: center; justify-content: space-between; padding: 15px 60px; box-shadow: 0 1px 3px -2px #000; background: white; }
.admin-navbar img.nav-logo { width: 180px; }
.admin-body { display: flex; }
.sidebar { display: flex; flex-direction: column; padding-top: 30px; gap: 20px; width: 250px; min-height: 100vh; background: white; }
.sidebar-item { display: flex; align-items: center; margin: 0 20px; padding: 10px; border-radius: 6px; background: #f6f6f6; gap: 20px; cursor: pointer; font-family: Poppins; font-size: 15px; font-weight: 500; text-decoration: none; color: #333; }
.sidebar-item:hover { background: #ede8ff; color: #7d3cff; }
.admin-content { flex: 1; padding: 20px; }

/* Add Listing */
.add-listing-container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; }
.add-listing-container h2 { margin-bottom: 20px; color: #222; }
.form-section { margin-bottom: 25px; }
.form-section h3 { font-size: 1.1rem; margin-bottom: 10px; color: #333; }
.upload-box { border: 2px dashed #a97fff; border-radius: 10px; padding: 30px; text-align: center; background: #f9f6ff; }
.upload-box input[type="file"] { display: none; }
.upload-label { color: #7d3cff; cursor: pointer; font-weight: 500; }
.admin-content input, .admin-content select, .admin-content textarea { width: 100%; padding: 12px; margin-top: 10px; border-radius: 8px; border: 1px solid #ddd; font-size: 0.95rem; box-sizing: border-box; font-family: Poppins; }
.price-box { display: flex; align-items: center; gap: 10px; }
.price-box span { background: #eee; padding: 10px 15px; border-radius: 8px; margin-top: 10px; }
.two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.submit-btn { background: #7d3cff; color: #fff; border: none; padding: 14px; width: 100%; font-size: 1rem; border-radius: 8px; cursor: pointer; margin-top: 10px; }
.submit-btn:hover { background: #5a2ce3; }
.preview-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.preview-grid img { width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; }

/* List Product */
.list-product { background: white; border-radius: 6px; padding: 20px; }
.list-product h1 { margin-bottom: 20px; }
.listproduct-format-main { display: grid; grid-template-columns: 1fr 3fr 1fr 1fr 1fr 1fr; gap: 10px; padding: 15px 0; color: #454545; font-size: 15px; font-weight: 600; border-bottom: 2px solid #e2e2e2; }
.listproduct-format { display: grid; grid-template-columns: 1fr 3fr 1fr 1fr 1fr 1fr; gap: 10px; align-items: center; padding: 12px 0; font-weight: 500; border-bottom: 1px solid #eee; }
.listproduct-product-icon { height: 70px; object-fit: cover; border-radius: 4px; }
.listproduct-remove-icon { cursor: pointer; width: 22px; margin: auto; }

@media (max-width: 800px) {
  .admin-navbar { padding: 15px 20px; }
  .admin-navbar img.nav-logo { width: 130px; }
  .admin-body { flex-direction: column; }
  .sidebar { flex-direction: row; width: 100%; min-height: auto; padding: 10px; justify-content: center; }
  .two-column { grid-template-columns: 1fr; }
  .listproduct-format-main, .listproduct-format { grid-template-columns: 0.5fr 2fr 1fr 1fr; font-size: 12px; }
}
`;

// ─── Add Listing Component ────────────────────────────────────────────────────
const AddListing = () => {
  const [formData, setFormData] = useState({
    category: "", title: "", description: "", price: "",
    transaction: "", condition: "", region: "", city: "",
    address: "", zip: "", phone: "", email: "", images: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleImageUpload = (e) => setFormData({ ...formData, images: Array.from(e.target.files) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.images.length) { alert("Please upload at least one image."); return; }
    try {
      setIsSubmitting(true);
      const imageForm = new FormData();
      formData.images.forEach((img) => imageForm.append("images", img));
      const uploadRes = await axios.post("/api/upload", imageForm, { headers: { "Content-Type": "multipart/form-data" } });
      const imageUrls = uploadRes.data.urls || uploadRes.data;
      await axios.post("/api/addproduct", { ...formData, images: imageUrls }, { headers: { "Content-Type": "application/json" } });
      alert("✅ Listing submitted successfully!");
      setFormData({ category: "", title: "", description: "", price: "", transaction: "", condition: "", region: "", city: "", address: "", zip: "", phone: "", email: "", images: [] });
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Error submitting listing, please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-listing-container">
      <h2>Add a New Listing</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Photos</h3>
          <p>You can upload up to 12 pictures per listing.</p>
          <div className="upload-box">
            <label htmlFor="images" className="upload-label">📤 Click to Upload Images</label>
            <input type="file" id="images" name="images" multiple accept="image/*" onChange={handleImageUpload} />
          </div>
          {formData.images.length > 0 && (
            <div className="preview-grid">
              {formData.images.map((img, i) => <img key={i} src={URL.createObjectURL(img)} alt={`preview-${i}`} />)}
            </div>
          )}
        </div>
        <div className="form-section">
          <h3>About the Item</h3>
          <select name="category" value={formData.category} onChange={handleChange} required>
            <option value="">Select category</option>
            {["electronics","property","vehicles","home & furniture","fashion & beauty","hobbies & entertainment","services","garden & outdoor","jobs","agriculture & food","gadgets & accessories","baby & kids","misc & others","adult"].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <input type="text" name="title" placeholder="Listing title" value={formData.title} onChange={handleChange} required />
          <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} required rows={4} />
        </div>
        <div className="form-section">
          <h3>Pricing & Status</h3>
          <div className="price-box">
            <span>₦</span>
            <input type="number" name="price" placeholder="Price" value={formData.price} onChange={handleChange} required />
          </div>
          <div className="two-column">
            <select name="transaction" value={formData.transaction} onChange={handleChange}>
              <option value="">Any transaction</option>
              {["sell","buy","rent","exchange"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
            <select name="condition" value={formData.condition} onChange={handleChange}>
              <option value="">Any condition</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>
        <div className="form-section">
          <h3>Listing Location</h3>
          <select name="region" value={formData.region} onChange={handleChange}>
            <option value="">Select region</option>
            {["abia","adamawa","akwa-ibom","anambra","bauchi","bayelsa","benue","borno","cross-river","delta","ebonyi","edo","ekiti","enugu","gombe","imo","jigawa","kaduna","kano","katsina","kebbi","kogi","kwara","lagos","nasarawa","niger","ogun","ondo","osun","oyo","plateau","rivers","sokoto","taraba","yobe","zamfara","fct"].map(r => <option key={r} value={r}>{r === "fct" ? "Abuja" : r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </select>
          <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} />
          <div className="two-column">
            <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleChange} />
            <input type="text" name="zip" placeholder="ZIP" value={formData.zip} onChange={handleChange} />
          </div>
        </div>
        <div className="form-section">
          <h3>Seller's Details</h3>
          <input type="text" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} />
          <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
        </div>
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Listing"}
        </button>
      </form>
    </div>
  );
};

// ─── List Products Component ──────────────────────────────────────────────────
const ListProducts = () => {
  const [allProducts, setAllProducts] = useState([]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/allproduct");
      const data = await res.json();
      setAllProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const removeProduct = async (id) => {
    await fetch("/api/removeproduct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchProducts();
  };

  return (
    <div className="list-product">
      <h1>All Product List ({allProducts.length})</h1>
      <div className="listproduct-format-main">
        <p>Image</p><p>Title</p><p>Price</p><p>Category</p><p>Status</p><p>Remove</p>
      </div>
      {allProducts.map((product) => (
        <div key={product._id} className="listproduct-format">
          <img src={product.images?.[0] || "/no-image.png"} alt={product.title} className="listproduct-product-icon" onError={(e) => { e.target.src = "/no-image.png"; }} />
          <p>{product.title}</p>
          <p>₦{Number(product.price).toLocaleString()}</p>
          <p>{product.category}</p>
          <p style={{ color: product.available ? "green" : "red" }}>{product.available ? "Available" : "Unavailable"}</p>
          <span style={{ cursor: "pointer", color: "red", fontSize: 20 }} onClick={() => removeProduct(product._id)}>✕</span>
        </div>
      ))}
    </div>
  );
};

// ─── Admin Panel (main export) ────────────────────────────────────────────────
const AdminPanel = () => {
  const [page, setPage] = useState("add");

  return (
    <>
      <style>{styles}</style>
      <div className="admin">
        <div className="admin-navbar">
          <img src="/logo.png" alt="logo" className="nav-logo" onError={(e) => { e.target.style.display = "none"; }} />
          <span style={{ fontWeight: 700, fontSize: 18, color: "#7d3cff" }}>Admin Panel</span>
        </div>
        <div className="admin-body">
          <div className="sidebar">
            <div className={`sidebar-item${page === "add" ? " active" : ""}`} onClick={() => setPage("add")}>
              🛒 Add Listing
            </div>
            <div className={`sidebar-item${page === "list" ? " active" : ""}`} onClick={() => setPage("list")}>
              📋 Product List
            </div>
          </div>
          <div className="admin-content">
            {page === "add" ? <AddListing /> : <ListProducts />}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;
