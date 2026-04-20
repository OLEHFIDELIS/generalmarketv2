import './App.css';
import { HashRouter, Routes, Route } from "react-router-dom";
import Shop from './pages/Shop';
import ShopCategory from './pages/ShopCategory';
import LoginSignup from './pages/LoginSignup';
import Product from './pages/Product';
import Cart from './pages/Cart';
import AdminPanel from './pages/AdminPanel';
import AllListings from './pages/AllListings';
import NewNav from './components/NewNav';
import Footer from './components/Footer';
import { categories } from "./data/categories";

function App() {
  return (
    <HashRouter>
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
            </Routes>
            <Footer />
          </div>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;
