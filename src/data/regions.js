// Same slugs the admin panel stores in Product.region
export const REGIONS = [
  "abia","adamawa","akwa-ibom","anambra","bauchi","bayelsa","benue","borno","cross-river","delta","ebonyi","edo","ekiti","enugu",
  "gombe","imo","jigawa","kaduna","kano","katsina","kebbi","kogi","kwara","lagos","nasarawa","niger","ogun","ondo","osun","oyo",
  "plateau","rivers","sokoto","taraba","yobe","zamfara","fct",
];
export const regionLabel = (r) => (r === "fct" ? "FCT (Abuja)" : r.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "));
