import './App.css';
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Shop from './pages/Shop';
import ShopCategory from './pages/ShopCategory';
import LoginSignup from './pages/LoginSignup';
import Product from './pages/Product';
import Cart from './pages/Cart';
import AdminPanel from './pages/AdminPanel';
import AllListings from './pages/AllListings';
import DashboardLayout from './pages/Dashboard/DashboardLayout';
import Overview from './pages/Dashboard/Overview';
import MyItems from './pages/Dashboard/MyItems';
import PostAd from './pages/Dashboard/PostAd';
import Messages from './pages/Dashboard/Messages';
import Offers from './pages/Dashboard/Offers';
import Favorites from './pages/Dashboard/Favorites';
import SavedSearches from './pages/Dashboard/SavedSearches';
import Ratings from './pages/Dashboard/Ratings';
import Profile from './pages/Dashboard/Profile';
import BusinessProfile from './pages/Dashboard/BusinessProfile';
import Verification from './pages/Dashboard/Verification';
import Referrals from './pages/Dashboard/Referrals';
import { Promotions } from './pages/Dashboard/ComingSoon';
import Escrow from './pages/Dashboard/Escrow';
import EscrowOrder from './pages/Dashboard/EscrowOrder';
import Finance from './pages/Dashboard/Finance';
import Checkout from './pages/Checkout';
import SellerProfile from './pages/SellerProfile';
import Companies from './pages/Companies';
import Contact from './pages/Contact';
import NewNav from './components/NewNav';
import Footer from './components/Footer';
import { categories } from "./data/categories";

// HashRouter doesn't reset scroll on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        {/* Admin panel - no nav/footer */}
        <Route path="/admin/*" element={<AdminPanel />} />

        {/* Frontend - with nav and footer */}
        <Route path="/*" element={
          <div>
            <NewNav />
            <Routes>
              <Route path="/" element={<Shop />} />
              {categories.map((cat, index) => (
                <Route
                  key={index}
                  path={`/category/${cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                  element={<ShopCategory category={cat} />}
                />
              ))}
              <Route path="/product/:productId" element={<Product />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<LoginSignup />} />
              <Route path="/all" element={<AllListings />} />
              <Route path="/search" element={<AllListings />} />
              <Route path="/seller/:username" element={<SellerProfile />} />
              <Route path="/checkout/cart/:sellerId" element={<Checkout />} />
              <Route path="/checkout/:listingId" element={<Checkout />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/contact" element={<Contact />} />

              {/* Member area */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Overview />} />
                <Route path="items" element={<MyItems />} />
                <Route path="post" element={<PostAd />} />
                <Route path="post/:id" element={<PostAd />} />
                <Route path="messages" element={<Messages />} />
                <Route path="messages/:threadId" element={<Messages />} />
                <Route path="offers" element={<Offers />} />
                <Route path="favorites" element={<Favorites />} />
                <Route path="alerts" element={<SavedSearches />} />
                <Route path="ratings" element={<Ratings />} />
                <Route path="profile" element={<Profile />} />
                <Route path="business" element={<BusinessProfile />} />
                <Route path="verification" element={<Verification />} />
                <Route path="referrals" element={<Referrals />} />
                <Route path="promotions" element={<Promotions />} />
                <Route path="escrow" element={<Escrow />} />
                <Route path="escrow/:id" element={<EscrowOrder />} />
                <Route path="finance" element={<Finance />} />
              </Route>
            </Routes>
            <Footer />
          </div>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;
