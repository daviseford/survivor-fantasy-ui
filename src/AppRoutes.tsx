import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import { App } from "./pages/App";
import { BrowserRouter as Router } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import { Signup } from "./pages/Signup";
import { Login } from "./pages/Login";
import { Logout } from "./pages/Logout";
import { Seasons } from "./pages/Seasons";
import { Admin } from "./pages/Admin";

export const AppRoutes = () => {
  return (
    <MantineProvider theme={theme}>
      <Router>
        <div>
          <section>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<Logout />} />

              {/* <Route path="/seasons/:season/:episode" element={<Seasons />} /> */}
              <Route path="/seasons" element={<Seasons />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </section>
        </div>
      </Router>
    </MantineProvider>
  );
};
