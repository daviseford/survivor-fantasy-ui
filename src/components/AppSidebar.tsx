import {
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Settings,
  Sun,
  Swords,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { useUser } from "../hooks/useUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "./ui/sidebar";

const navItems = [
  { link: "/", label: "Home", icon: Home },
  { link: "/admin", label: "Admin", icon: Settings, adminOnly: true },
  { link: "/seasons", label: "Seasons", icon: LayoutDashboard },
  { link: "/competitions", label: "Competitions", icon: Swords },
];

function useColorScheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("color-scheme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("color-scheme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);

  return { isDark, toggle };
}

export function AppSidebar({
  onLoginClick,
  ...props
}: React.ComponentProps<typeof Sidebar> & { onLoginClick: () => void }) {
  const { pathname } = useLocation();
  const { slimUser } = useUser();
  const { isDark, toggle: toggleColorScheme } = useColorScheme();

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Swords className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Survivor Fantasy</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (!slimUser?.isAdmin && item.adminOnly) return null;

                const isActive =
                  (pathname.startsWith("/seasons") &&
                    item.link === "/seasons") ||
                  (pathname.startsWith("/competitions") &&
                    item.link === "/competitions") ||
                  (pathname.startsWith("/admin") &&
                    item.link === "/admin") ||
                  item.link === pathname;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.link}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleColorScheme}
              aria-label="Toggle color scheme"
            >
              {isDark ? <Sun /> : <Moon />}
              <span>{isDark ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {!slimUser && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onLoginClick}>
                <LogIn />
                <span>Login</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {slimUser && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="opacity-70">
                  <User />
                  <span>{slimUser.displayName}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="opacity-70">
                  <Mail />
                  <span className="truncate">{slimUser.email}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
