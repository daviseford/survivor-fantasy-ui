import { useState } from "react";
import { QueryClientProvider } from "react-query";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AppSidebar } from "./components/AppSidebar";
import { AuthDialog } from "./components/Auth/AuthDialog";
import { Logout } from "./components/Auth/Logout";
import { Footer } from "./components/Footer";
import { Home } from "./components/Home/Home";
import { Separator } from "./components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { TooltipProvider } from "./components/ui/tooltip";
import { PROJECT_NAME } from "./consts";
import { Admin } from "./pages/Admin";
import { Competitions } from "./pages/Competitions";
import { DraftComponent } from "./pages/Draft";
import { SeasonAdmin } from "./pages/SeasonAdmin";
import { Seasons } from "./pages/Seasons";
import { SingleCompetition } from "./pages/SingleCompetition";
import { SingleSeason } from "./pages/SingleSeason";
import { queryClient } from "./queryClient";

export const AppRoutes = () => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar onLoginClick={() => setAuthDialogOpen(true)} />
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <Link
                  to="/"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-lg font-bold text-transparent"
                >
                  {PROJECT_NAME}
                </Link>
              </header>

              <main className="flex-1 p-4 pb-24">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/logout" element={<Logout />} />
                  <Route
                    path="/seasons/:seasonId/draft/:draftId"
                    element={<DraftComponent />}
                  />
                  <Route
                    path="/seasons/:seasonId/manage"
                    element={<SeasonAdmin />}
                  />
                  <Route
                    path="/seasons/:seasonId"
                    element={<SingleSeason />}
                  />
                  <Route path="/seasons" element={<Seasons />} />
                  <Route
                    path="/competitions/:competitionId"
                    element={<SingleCompetition />}
                  />
                  <Route path="/competitions" element={<Competitions />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </main>

              <Footer />
            </SidebarInset>
          </SidebarProvider>
          <AuthDialog
            open={authDialogOpen}
            onOpenChange={setAuthDialogOpen}
          />
        </TooltipProvider>
      </Router>
    </QueryClientProvider>
  );
};
