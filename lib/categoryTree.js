// Single source of truth for the "Post an ad" form AND server-side validation.
// The form loads this from GET /api/categories. Edit here to add categories, subcategories or fields.
//
// Node: { name, children?, attrs?, priceLabel?, noCondition?, noTransaction? }
//  - a listing must be posted in a LEAF (a node without children)
//  - attrs, priceLabel and the no* flags are inherited by every descendant
// Attr: { key, label, type: "select"|"text"|"number", options?, required?, min?, max?, placeholder?, unit? }

const thisYear = () => new Date().getFullYear();
const N = (name, children, opts = {}) => ({ name, ...(children && children.length ? { children } : {}), ...opts });
const leaves = (...names) => names.map((n) => N(n));
const sel = (key, label, options, required = false) => ({ key, label, type: "select", options, required });
const txt = (key, label, required = false, placeholder = "") => ({ key, label, type: "text", required, placeholder });
const num = (key, label, extra = {}) => ({ key, label, type: "number", ...extra });

const BRANDS_PHONE = ["Apple", "Samsung", "Tecno", "Infinix", "Itel", "Xiaomi", "Oppo", "Huawei", "Nokia", "Google", "Realme", "Other"];
const BRANDS_LAPTOP = ["HP", "Dell", "Lenovo", "Apple", "Asus", "Acer", "Microsoft", "Toshiba", "Samsung", "Other"];
const STORAGE = ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"];
const COUNT = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

const vehicleAttrs = () => [
  txt("make", "Make", true, "e.g. Toyota"),
  txt("model", "Model", false, "e.g. Camry"),
  num("year", "Year of manufacture", { required: true, min: 1950, max: thisYear() + 1 }),
  num("mileage", "Mileage", { min: 0, max: 5000000, unit: "km" }),
  sel("fuel", "Fuel type", ["Petrol", "Diesel", "Hybrid", "Electric", "Gas (CNG/LPG)"]),
  sel("transmission", "Transmission", ["Automatic", "Manual"]),
  sel("registration", "Registration", ["Nigerian registered", "Foreign used (Tokunbo)", "Brand new", "Unregistered"]),
];
const homeAttrs = () => [
  sel("bedrooms", "Bedrooms", COUNT, true),
  sel("bathrooms", "Bathrooms", COUNT),
  sel("furnishing", "Furnishing", ["Furnished", "Semi-furnished", "Unfurnished"]),
  num("sizeSqm", "Size", { min: 1, max: 1000000, unit: "sqm" }),
];
const landAttrs = () => [
  num("sizeSqm", "Plot size", { required: true, min: 1, max: 100000000, unit: "sqm" }),
  sel("titleDoc", "Title document", ["C of O", "Governor's consent", "Deed of assignment", "Survey plan", "Gazette", "Other"]),
];
const commercialAttrs = () => [num("sizeSqm", "Size", { min: 1, max: 1000000, unit: "sqm" }), sel("furnishing", "Furnishing", ["Furnished", "Semi-furnished", "Unfurnished"])];
const rentPeriod = (opts) => sel("rentPeriod", "Rent is paid", opts, true);

const buildTree = () => [
  N("Electronics", [
    N("Gaming Consoles", leaves("Playstation", "Xbox", "Nintendo")),
    N("Computers", [
      N("Laptops", null, { attrs: [sel("brand", "Brand", BRANDS_LAPTOP, true), sel("ram", "RAM", ["4GB", "8GB", "16GB", "32GB", "64GB"]), txt("storage", "Storage", false, "e.g. 512GB SSD"), txt("processor", "Processor", false, "e.g. Core i7")] }),
      N("Desktops"), N("Computer Accessories"),
    ]),
    N("Mobile Phones", [
      N("Smartphones", null, { attrs: [sel("brand", "Brand", BRANDS_PHONE, true), txt("model", "Model", false, "e.g. iPhone 13"), sel("storage", "Storage", STORAGE)] }),
      N("Smart Watches"),
      N("Tablets", null, { attrs: [sel("brand", "Brand", BRANDS_PHONE), sel("storage", "Storage", STORAGE)] }),
      N("Accessories"),
    ]),
    N("TV & Audio", [N("LED TVs", null, { attrs: [txt("brand", "Brand"), num("screenSize", "Screen size", { min: 10, max: 150, unit: "inches" })] }), N("Home Theater Systems"), N("Speakers & Headphones")]),
    N("Cameras", leaves("Digital Cameras", "Camera Accessories")),
    N("Home Appliances", leaves("Microwaves & Ovens", "Refrigerators", "Washing Machines", "Air Conditioners")),
  ]),

  N("Property", [
    N("For Sale", [N("Houses", null, { attrs: homeAttrs() }), N("Apartments", null, { attrs: homeAttrs() }), N("Lands & Plots", null, { attrs: landAttrs() })], { priceLabel: "Sale price (₦)" }),
    N("For Rent", [
      N("Houses", null, { attrs: [...homeAttrs(), rentPeriod(["Per year", "Per month"])] }),
      N("Apartments", null, { attrs: [...homeAttrs(), rentPeriod(["Per year", "Per month"])] }),
      N("Shops & Offices", null, { attrs: [...commercialAttrs(), rentPeriod(["Per year", "Per month"])] }),
      N("Short Stay Accommodations", null, { attrs: [...homeAttrs(), rentPeriod(["Per night", "Per week"])] }),
    ], { priceLabel: "Rent (₦)" }),
    N("Commercial", [N("Warehouses", null, { attrs: commercialAttrs() }), N("Office Spaces", null, { attrs: commercialAttrs() }), N("Shops", null, { attrs: commercialAttrs() })]),
  ], { noCondition: true, noTransaction: true }),

  N("Vehicles", [
    N("Cars", null, { attrs: vehicleAttrs() }),
    N("Buses & Vans", null, { attrs: vehicleAttrs() }),
    N("Trucks", null, { attrs: vehicleAttrs() }),
    N("Motorcycles", null, { attrs: vehicleAttrs().filter((a) => a.key !== "transmission") }),
    N("Auto Parts & Accessories"),
    N("Boats"),
  ]),

  N("Home & Furniture", [
    N("Furniture", leaves("Tables & Chairs", "Bed & Mattresses", "Sofas & Couches")),
    N("Home Decor", leaves("Curtains", "Wall Art", "Rugs & Carpets")),
    N("Kitchen & Dining", leaves("Cookware", "Utensils", "Dining Sets")),
  ]),

  N("Fashion & Beauty", [
    N("Clothing", [N("Men's Clothing"), N("Women's Clothing"), N("Children's Clothing")], { attrs: [sel("size", "Size", SIZES), txt("brand", "Brand")] }),
    N("Shoes", [N("Men's Shoes"), N("Women's Shoes"), N("Kid's Shoes")], { attrs: [num("size", "Size (EU)", { min: 15, max: 55 }), txt("brand", "Brand")] }),
    N("Bags & Accessories", leaves("Bags", "Watches", "Jewelry")),
    N("Beauty & Personal Care", leaves("Makeup", "Haircare", "Perfumes", "Skin Care")),
  ]),

  N("Hobbies & Entertainment", [
    N("Sports & Fitness", leaves("Gym Equipment", "Sports Gear")),
    N("Books", leaves("Novels", "Textbooks", "Stationery Supplies")),
    N("Musical Instruments", leaves("Guitars", "Drums", "Keyboards")),
    N("Toys & Games", leaves("Board Games", "Educational Toys", "Action Figures")),
    N("Events & Tickets", leaves("Concert Tickets", "Event Rentals")),
  ]),

  N("Services", [
    N("Professional Services", leaves("IT Services", "Legal Services", "Tutoring & Training")),
    N("Home Services", leaves("Carpentry", "Electrical Services", "Plumbing", "Cleaning Services")),
    N("Events & Creative", leaves("Catering", "Photographers & Videographers", "Event Planners", "Tailoring Services")),
    N("Automotive Services", leaves("Car Repair", "Car Wash", "Auto Painting")),
    N("Health & Wellness", leaves("Fitness Trainers", "Nutritionist", "Massage Therapist")),
    N("Finance", leaves("Accounting", "Insurance", "Loan & Investments")),
  ], { noCondition: true, noTransaction: true, priceLabel: "Starting price (₦)", attrs: [num("experience", "Years of experience", { min: 0, max: 60 }), sel("availability", "Availability", ["Weekdays", "Weekends", "Every day", "By appointment"])] }),

  N("Garden & Outdoor", leaves("Plants & Flowers", "Garden Tools", "Outdoor Furniture", "Camping & Hiking")),

  N("Jobs", [
    N("Full-Time Jobs"), N("Part-Time Jobs"), N("Freelance & Remote"), N("Resumes & CVs", null, { attrs: [] }),
  ], { noCondition: true, noTransaction: true, priceLabel: "Salary (₦ per month)", attrs: [txt("company", "Company"), sel("experienceLevel", "Experience level", ["Entry level", "Mid level", "Senior"]), sel("workplace", "Workplace", ["On-site", "Remote", "Hybrid"])] }),

  N("Agriculture & Food", [
    N("Crops", leaves("Vegetables", "Grains (Rice, Maize, Beans, etc.)", "Fruits")),
    N("Livestock", leaves("Chickens", "Fish", "Goats & Cows")),
    N("Farm Equipment", leaves("Farm Tools", "Tractors")),
    N("Food & Drinks", leaves("Drinks", "Packaged Food")),
  ], { attrs: [txt("quantity", "Quantity available", false, "e.g. 50 bags")] }),

  N("Gadgets & Accessories", leaves("Phone Accessories", "Chargers & Power Banks", "Earphones & Headphones", "Smart Watches & Bands", "Other Gadgets")),

  N("Baby & Kids", leaves("Baby Clothing", "Strollers & Car Seats", "Toys", "Feeding & Nursery")),

  N("Misc & Others", [
    N("Business & Industrial", [
      N("Office Supplies", leaves("Office Furniture", "Printers", "Stationery")),
      N("Business for Sale", leaves("Franchises", "Small Businesses")),
      N("Industrial Supplies", leaves("Chemicals", "Construction Materials")),
      N("Industrial Equipment", leaves("Generators", "Machinery", "Tools")),
    ]),
    N("Other"),
  ]),

  N("Adult"),
];

const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

// Resolve ["Electronics","Mobile Phones","Smartphones"] (case-insensitive) → array of nodes, or null
function resolve(names, tree = buildTree()) {
  if (!Array.isArray(names) || !names.length) return null;
  const out = [];
  let level = tree;
  for (const name of names) {
    const node = (level || []).find((n) => same(n.name, name));
    if (!node) return null;
    out.push(node);
    level = node.children;
  }
  return out;
}

// For a legacy single category string with no path: valid only when that category has no children
const topLevelNames = () => buildTree().map((n) => n.name);

// Inherited settings for a path of nodes
function effective(nodes) {
  const e = { attrs: [], priceLabel: "Price (₦)", noCondition: false, noTransaction: false };
  for (const n of nodes) {
    if (n.attrs) { // a deeper node replaces same-key attrs of its ancestors, others accumulate
      const keys = new Set(n.attrs.map((a) => a.key));
      e.attrs = [...e.attrs.filter((a) => !keys.has(a.key)), ...n.attrs];
    }
    if (n.priceLabel) e.priceLabel = n.priceLabel;
    if (n.noCondition) e.noCondition = true;
    if (n.noTransaction) e.noTransaction = true;
  }
  return e;
}

// Validate submitted attribute values against the path's definitions.
// input: { [key]: value }  → returns { value: [{key,label,value}] } or { error }
function validateAttributes(nodes, input) {
  const defs = effective(nodes).attrs;
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const out = [];
  for (const a of defs) {
    let v = src[a.key];
    v = v === undefined || v === null ? "" : String(v).trim();
    if (!v) {
      if (a.required) return { error: `${a.label} is required.` };
      continue;
    }
    if (a.type === "select" && !a.options.includes(v)) return { error: `${a.label}: choose one of the options.` };
    if (a.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n) || (a.min !== undefined && n < a.min) || (a.max !== undefined && n > a.max))
        return { error: `${a.label}: enter a valid number${a.min !== undefined ? ` between ${a.min} and ${a.max}` : ""}.` };
      v = String(n);
    }
    if (a.type === "text") v = v.slice(0, 80);
    out.push({ key: a.key, label: a.label, value: a.unit ? `${v} ${a.unit}` : v });
  }
  return { value: out };
}

module.exports = { buildTree, resolve, effective, validateAttributes, topLevelNames };