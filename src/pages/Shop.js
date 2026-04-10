import React from "react"
import Hero from "../components/Hero"
import Popular from "../components/Popular"
import Offers from "../components/Offers"
import NewCollections from "../components/NewCollections"
import NewsLetter from "../components/NewsLetter"
import Category from "../components/Categories"
import Footer from "../components/Footer"
import Search from "../components/Search"
import Welcome from "../components/Welcome"

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