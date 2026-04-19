import React from "react";
import Hero from "../components/Hero";
import Welcome from "../components/Welcome";
import Popular from "../components/Popular";
import BrowseCategories from "../components/Categories";
import NewCollections from "../components/NewCollections";
import NewsLetter from "../components/NewsLetter";

const Shop = () => {
  return (
    <div>
      <Hero />
      <Welcome />
      <Popular />
      <BrowseCategories />
      <NewCollections />
      <NewsLetter />
    </div>
  );
};

export default Shop;