// Category tree + per-category rules. Single source of truth:
//   • GET /api/categories sends it to the Post Ad form (so the form is data-driven)
//   • cleanListing() uses the same rules to validate what is saved
//
// Product.category stays the lowercase TOP-level name (shop pages filter on it).
// Product.categoryPath holds the full path as display labels, e.g. ["Electronics","Phones & Tablets","Smartphones"].

// [top-level id, label, groups]; group = [label, leaves[]] or just a label (group with no leaves is itself selectable)
const TREE_DEF = [
  ["electronics", "Electronics", [
    ["Gaming Consoles", ["PlayStation", "Xbox", "Nintendo"]],
    ["Computers", ["Laptops", "Desktops", "Computer Accessories"]],
    ["Phones & Tablets", ["Smartphones", "Smart Watches", "Tablets", "Phone Accessories"]],
    ["TV & Audio", ["LED TVs", "Home Theater Systems", "Speakers & Headphones"]],
    ["Cameras", ["Digital Cameras", "Camera Accessories"]],
    ["Home Appliances", ["Microwaves & Ovens", "Refrigerators", "Washing Machines", "Air Conditioners"]],
  ]],
  ["property", "Property", [
    ["For Sale", ["Houses", "Apartments", "Lands & Plots"]],
    ["For Rent", ["Houses", "Apartments", "Shops & Offices", "Short Stay Accommodations"]],
    ["Commercial", ["Warehouses", "Office Spaces", "Shops"]],
  ]],
  ["vehicles", "Vehicles", [
    ["Cars", ["Saloon / Sedan", "SUV / Jeep", "Hatchback", "Pickup / Van", "Coupe / Convertible"]],
    ["Motorcycles & Tricycles", ["Motorcycles", "Tricycles (Keke)", "Bicycles"]],
    ["Trucks & Buses", ["Trucks", "Buses & Minibuses"]],
    ["Vehicle Parts & Accessories", ["Car Parts", "Tyres & Wheels", "Car Electronics"]],
  ]],
  ["home & furniture", "Home & Furniture", [
    ["Furniture", ["Tables & Chairs", "Bed & Mattresses", "Sofas & Couches"]],
    ["Home Decor", ["Curtains", "Wall Art", "Rugs & Carpets"]],
    ["Kitchen & Dining", ["Cookware", "Utensils", "Dining Sets"]],
  ]],
  ["fashion & beauty", "Fashion & Beauty", [
    ["Clothing", ["Men's Clothing", "Women's Clothing", "Children's Clothing"]],
    ["Shoes", ["Men's Shoes", "Women's Shoes", "Kid's Shoes"]],
    ["Bags & Accessories", ["Bags", "Watches", "Jewelry"]],
    ["Beauty & Personal Care", ["Makeup", "Haircare", "Perfumes", "Skin Care"]],
  ]],
  ["hobbies & entertainment", "Hobbies & Entertainment", [
    ["Sports & Fitness", ["Gym Equipment", "Sports Gear"]],
    ["Books", ["Novels", "Textbooks", "Stationery Supplies"]],
    ["Musical Instruments", ["Guitars", "Drums", "Keyboards"]],
    ["Toys & Games", ["Board Games", "Educational Toys", "Action Figures"]],
    ["Events & Tickets", ["Concert Tickets", "Event Rentals"]],
  ]],
  ["services", "Services", [
    ["Professional Services", ["IT Services", "Legal Services", "Tutoring & Training"]],
    ["Home Services", ["Carpentry", "Electrical Services", "Plumbing", "Cleaning Services"]],
    ["Events & Creative", ["Catering", "Photographers & Videographers", "Event Planners", "Tailoring Services"]],
    ["Auto Services", ["Car Repair", "Car Wash", "Auto Painting"]],
    ["Health & Wellness", ["Fitness Trainers", "Nutritionist", "Massage Therapist"]],
    ["Financial Services", ["Accounting", "Insurance", "Loan & Investments"]],
  ]],
  ["garden & outdoor", "Garden & Outdoor", [
    "Garden Tools & Equipment", "Plants & Flowers", "Outdoor Furniture", "Camping & Outdoor Gear",
  ]],
  ["jobs", "Jobs", [
    ["Job Openings", ["Full-Time Jobs", "Part-Time Jobs", "Freelance & Remote"]],
    ["Resumes & CVs", ["Resumes & CVs"]],
  ]],
  ["agriculture & food", "Agriculture & Food", [
    ["Crops", ["Vegetables", "Grains (Rice, Maize, Beans, etc.)", "Fruits"]],
    ["Livestock", ["Chickens", "Fish", "Goats & Cows"]],
    ["Farm Equipment", ["Farm Tools", "Tractors"]],
    ["Food & Drinks", ["Drinks", "Packaged Food"]],
  ]],
  ["business & industrial", "Business & Industrial", [
    ["Office Supplies", ["Office Furniture", "Printers", "Stationery"]],
    ["Business for Sale", ["Franchises", "Small Businesses"]],
    ["Raw Materials", ["Chemicals", "Construction Materials"]],
    ["Industrial Equipment", ["Generators", "Machinery", "Tools"]],
  ]],
  ["gadgets & accessories", "Gadgets & Accessories", [
    "Chargers & Cables", "Power Banks", "Phone Cases & Screen Protectors", "Other Gadgets",
  ]],
  ["baby & kids", "Baby & Kids", [
    "Baby Gear & Strollers", "Baby Clothing", "Kids' Furniture", "Feeding & Nursing",
  ]],
  ["misc & others", "Misc & Others", []],
  ["adult", "Adult", []],
];

// ── Rules ────────────────────────────────────────────────────────────────────
// A rule applies when its `at` path is a prefix of the chosen path (case-insensitive).
// Rules are applied shallow → deep. `fields` are added (a deeper rule with the same key replaces it);
// `reset` drops everything inherited so far; `hide` removes "condition"/"transaction"; `priceLabel` renames the price.
const YEAR = new Date().getFullYear();
const years = Array.from({ length: YEAR - 1979 }, (_, i) => String(YEAR - i));
const nums = (a, b, extra = []) => [...Array.from({ length: b - a + 1 }, (_, i) => String(a + i)), ...extra];

const RULES = [
  { at: ["electronics"], fields: [{ key: "brand", label: "Brand", type: "text" }] },
  { at: ["electronics", "Phones & Tablets"], fields: [
    { key: "model", label: "Model", type: "text" },
    { key: "storage", label: "Storage", type: "select", options: ["8GB", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] },
    { key: "color", label: "Color", type: "text" },
  ] },
  { at: ["electronics", "Computers"], fields: [
    { key: "processor", label: "Processor", type: "text", placeholder: "e.g. Core i5 10th Gen" },
    { key: "ram", label: "RAM", type: "select", options: ["2GB", "4GB", "8GB", "16GB", "32GB", "64GB"] },
    { key: "storage", label: "Storage", type: "select", options: ["128GB", "256GB", "512GB", "1TB", "2TB or more"] },
    { key: "screen", label: "Screen size", type: "text", placeholder: "e.g. 15.6 inch" },
  ] },

  { at: ["property"], hide: ["condition"], fields: [
    { key: "bedrooms", label: "Bedrooms", type: "select", options: nums(1, 10, ["More than 10"]) },
    { key: "bathrooms", label: "Bathrooms", type: "select", options: nums(1, 8, ["More than 8"]) },
    { key: "furnishing", label: "Furnishing", type: "select", options: ["Furnished", "Semi-furnished", "Unfurnished"] },
    { key: "size", label: "Size", type: "number", unit: "sqm" },
  ] },
  { at: ["property", "For Rent"], priceLabel: "Rent (₦)", fields: [
    { key: "rentPeriod", label: "Rent is paid", type: "select", required: true, options: ["Per year", "Per month", "Per week", "Per day"] },
  ] },
  { at: ["property", "For Sale", "Lands & Plots"], reset: true, hide: ["condition"], fields: [
    { key: "size", label: "Plot size", type: "number", unit: "sqm" },
    { key: "titleDoc", label: "Title document", type: "select", options: ["C of O", "Governor's Consent", "Deed of Assignment", "Survey Plan", "Gazette", "Other"] },
  ] },
  { at: ["property", "Commercial"], reset: true, hide: ["condition"], fields: [
    { key: "size", label: "Size", type: "number", unit: "sqm" },
    { key: "furnishing", label: "Furnishing", type: "select", options: ["Furnished", "Semi-furnished", "Unfurnished"] },
  ] },

  { at: ["vehicles"], fields: [
    { key: "make", label: "Make", type: "text", required: true, placeholder: "e.g. Toyota" },
    { key: "model", label: "Model", type: "text", required: true, placeholder: "e.g. Camry" },
    { key: "year", label: "Year", type: "select", required: true, options: years },
    { key: "origin", label: "Registration / origin", type: "select", options: ["Foreign used (Tokunbo)", "Nigerian used", "Brand new"] },
    { key: "mileage", label: "Mileage", type: "number", unit: "km" },
    { key: "fuel", label: "Fuel", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric", "CNG / LPG"] },
    { key: "transmission", label: "Transmission", type: "select", options: ["Automatic", "Manual"] },
    { key: "color", label: "Color", type: "text" },
  ] },
  { at: ["vehicles", "Motorcycles & Tricycles"], fields: [{ key: "year", label: "Year", type: "select", options: years }] },
  { at: ["vehicles", "Vehicle Parts & Accessories"], reset: true, fields: [
    { key: "brand", label: "Brand", type: "text" },
    { key: "fits", label: "Fits (make / model / year)", type: "text" },
  ] },

  { at: ["home & furniture"], fields: [
    { key: "material", label: "Material", type: "text" },
    { key: "color", label: "Color", type: "text" },
    { key: "dimensions", label: "Dimensions", type: "text", placeholder: "e.g. 180 x 90 cm" },
  ] },

  { at: ["fashion & beauty"], fields: [{ key: "brand", label: "Brand", type: "text" }] },
  { at: ["fashion & beauty", "Clothing"], fields: [
    { key: "size", label: "Size", type: "text", placeholder: "e.g. M, 42" },
    { key: "color", label: "Color", type: "text" },
  ] },
  { at: ["fashion & beauty", "Shoes"], fields: [
    { key: "size", label: "Size", type: "text", placeholder: "e.g. 43" },
    { key: "color", label: "Color", type: "text" },
  ] },

  { at: ["services"], hide: ["condition"], priceLabel: "Starting price (₦)", fields: [
    { key: "serviceArea", label: "Area served", type: "text", placeholder: "e.g. Lagos Mainland" },
    { key: "experience", label: "Experience", type: "number", unit: "years" },
    { key: "availability", label: "Availability", type: "select", options: ["Anytime", "Weekdays", "Weekends", "By appointment"] },
  ] },

  { at: ["jobs"], hide: ["condition", "transaction"], priceLabel: "Salary (₦)" },
  { at: ["jobs", "Job Openings"], fields: [
    { key: "company", label: "Company", type: "text", required: true },
    { key: "jobType", label: "Job type", type: "select", required: true, options: ["Full-time", "Part-time", "Contract", "Internship", "Remote", "Freelance"] },
    { key: "level", label: "Experience level", type: "select", options: ["Entry level", "Mid level", "Senior", "Manager / Director"] },
    { key: "deadline", label: "Application deadline", type: "date" },
  ] },
  { at: ["jobs", "Resumes & CVs"], fields: [
    { key: "level", label: "Experience level", type: "select", options: ["Entry level", "Mid level", "Senior", "Manager / Director"] },
    { key: "skills", label: "Key skills", type: "text" },
  ] },

  { at: ["agriculture & food"], hide: ["condition"], fields: [
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "unit", label: "Sold per", type: "select", options: ["kg", "bag", "tonne", "crate", "basket", "piece", "litre"] },
  ] },

  { at: ["baby & kids"], fields: [
    { key: "ageRange", label: "Age range", type: "select", options: ["0–6 months", "6–12 months", "1–3 years", "3–6 years", "6–12 years", "12+ years"] },
  ] },

  { at: ["business & industrial", "Business for Sale"], hide: ["condition"], fields: [
    { key: "yearsOperating", label: "Years in operation", type: "number", unit: "years" },
  ] },
];

// ── Build tree with ids ──────────────────────────────────────────────────────
const norm = (s) => String(s || "").trim().toLowerCase();

function buildTree() {
  return TREE_DEF.map(([id, label, groups]) => ({
    id, label,
    children: groups.map((g) => {
      if (typeof g === "string") return { label: g };
      const [gl, leaves] = g;
      return { label: gl, children: (leaves || []).map((l) => ({ label: l })) };
    }),
  }));
}
const TREE = buildTree();
const TOP_IDS = TREE.map((t) => t.id);

// Resolve the rules for a path of labels → { fields, hide, priceLabel }
function specFor(path) {
  const lower = path.map(norm);
  let fields = [];
  let hide = [];
  let priceLabel = "Price (₦)";
  for (const r of RULES) {
    if (r.at.length > lower.length) continue;
    if (!r.at.every((seg, i) => norm(seg) === lower[i])) continue;
    if (r.reset) fields = [];
    for (const f of r.fields || []) {
      const i = fields.findIndex((x) => x.key === f.key);
      if (i >= 0) fields[i] = f; else fields.push(f);
    }
    if (r.hide) hide = [...new Set([...hide, ...r.hide])];
    if (r.priceLabel) priceLabel = r.priceLabel;
  }
  return { fields, hide, priceLabel };
}

// Walk the tree: returns { path (canonical labels), top (lowercase id), leaf (bool) } or null
function walk(inputPath) {
  if (!Array.isArray(inputPath) || !inputPath.length || inputPath.length > 3) return null;
  const top = TREE.find((t) => norm(t.label) === norm(inputPath[0]) || t.id === norm(inputPath[0]));
  if (!top) return null;
  const path = [top.label];
  let node = top;
  for (const seg of inputPath.slice(1)) {
    const next = (node.children || []).find((c) => norm(c.label) === norm(seg));
    if (!next) return null;
    path.push(next.label);
    node = next;
  }
  return { path, top: top.id, leaf: !(node.children && node.children.length) };
}

// Public payload for the form. Identical specs are sent once and referenced by index (`s`).
function publicTree() {
  const specs = [];
  const seen = new Map();
  const ref = (path) => {
    const spec = specFor(path);
    const k = JSON.stringify(spec);
    if (!seen.has(k)) { seen.set(k, specs.length); specs.push(spec); }
    return seen.get(k);
  };
  const walkNode = (node, path) => {
    const p = [...path, node.label];
    const out = { label: node.label };
    if (node.children && node.children.length) out.children = node.children.map((c) => walkNode(c, p));
    else out.s = ref(p);
    return out;
  };
  return { tree: TREE.map((t) => walkNode(t, [])), specs };
}

// ── Attribute validation ─────────────────────────────────────────────────────
// Returns { attributes: [{key,label,value,unit?}] } or { error }
function cleanAttributes(spec, input) {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const out = [];
  for (const f of spec.fields) {
    let v = src[f.key];
    v = v === undefined || v === null ? "" : String(v).trim().slice(0, 80);
    if (!v) {
      if (f.required) return { error: `${f.label} is required.` };
      continue;
    }
    if (f.type === "select" && !f.options.includes(v)) return { error: `${f.label}: choose one of the listed options.` };
    if (f.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1e9) return { error: `${f.label} must be a valid number.` };
      v = String(n);
    }
    if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: `${f.label} must be a valid date.` };
    out.push({ key: f.key, label: f.label, value: v, ...(f.unit ? { unit: f.unit } : {}) });
  }
  return { attributes: out };
}

module.exports = { TREE, TOP_IDS, specFor, walk, publicTree, cleanAttributes };