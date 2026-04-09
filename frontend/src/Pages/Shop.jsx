import React from "react"
import Hero from "../Components/Hero/Hero"
import Popular from "../Components/Popular/Popular"
import Offers from "../Components/Offers/Offers"
import NewCollections from "../Components/NewCollections/NewCollections"
import NewsLetter from "../Components/NewsLetter/NewsLetter"
import Category from "../Components/Categories/Category"
import Footer from "../Components/Footer/Footer"
import Search from "../Components/Search/Search"
import Welcome from "../Components/Welcome/Welcome"

const Shop = ()=> {
    return(
        <div>
           <Hero/>
           <Welcome/>
           <Popular/>
           <Category/>
           <NewCollections/>
           <NewsLetter/>
        </div>
    )
}

export default Shop