import { App } from "./pages/App";
import { BrowserRouter as Router } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import { Signup } from "./pages/Signup";
import { Login } from "./pages/Login";
import { Logout } from "./pages/Logout";

export const AppRoutes = () => {
  return (
    <Router>
      <div>
        <section>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
          </Routes>
        </section>
      </div>
    </Router>
  );
};
