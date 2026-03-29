import {
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  Settings,
  Swords,
  User,
} from "lucide-react";
import { useLocation } from "react-router-dom";
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

export function AppSidebar({
  onLoginClick,
  ...props
}: React.ComponentProps<typeof Sidebar> & { onLoginClick: () => void }) {
  const { pathname } = useLocation();
  const { slimUser } = useUser();

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Swords className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Survivor Fantasy</span>
                </div>
              </a>
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
                  item.link === pathname;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <a href={item.link}>
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
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
