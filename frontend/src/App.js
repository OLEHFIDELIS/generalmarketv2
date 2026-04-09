import './App.css';
import { HashRouter, Routes, Route } from "react-router-dom";
import Shop from './Pages/Shop';
import ShopCategory from './Pages/ShopCategory';
import LoginSignup from './Pages/LoginSignup';
import Product from './Pages/Product';
import Cart from './Pages/Cart';
import Footer from './Components/Footer/Footer';
import NewNav from './Components/NewNav/NewNav';
import { categories } from "./data/categories";

function App() {
  return (
    <div>
      <HashRouter>
        <NewNav />

        <Routes>
          <Route path="/" element={<Shop />} />

          {/* Category routes */}
          {categories.map((cat, index) => (
            <Route
              key={index}
              path={`/category/${cat
                .toLowerCase()
                .replace(/ & /g, "-")
                .replace(/ /g, "-")}`}
              element={<ShopCategory category={cat} />}
            />
          ))}

          {/* Product routes */}
          <Route path="/product/:productId" element={<Product />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<LoginSignup />} />
        </Routes>

        <Footer />
      </HashRouter>
    </div>
  );
}

export default App;
