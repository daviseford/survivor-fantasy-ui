import {
  IconHome,
  IconKarate,
  IconLayoutBoard,
  IconLogin,
  IconLogout,
  IconMail,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
// import { MantineLogo } from '@mantinex/mantine-logo';
import { modals } from "@mantine/modals";
import { useLocation } from "react-router-dom";
import { auth } from "../../firebase";
import { useUser } from "../../hooks/useUser";
import classes from "./Navbar.module.css";

const data = [
  { link: "/", label: "Home", icon: IconHome },
  { link: "/admin", label: "Admin", icon: IconSettings, adminOnly: true },
  { link: "/seasons", label: "Seasons", icon: IconLayoutBoard },
  { link: "/competitions", label: "Competitions", icon: IconKarate },
];

export const Navbar = () => {
  const { pathname } = useLocation();

  const { slimUser } = useUser();

  const links = data.map((item) => {
    // Hide admin-only routes
    if (!slimUser?.isAdmin && item.adminOnly) return null;

    const isActive =
      (pathname.startsWith("/seasons") && item.link === "/seasons") ||
      (pathname.startsWith("/competitions") && item.link === "/competitions") ||
      item.link === pathname ||
      undefined;

    return (
      <a
        className={classes.link}
        data-active={isActive}
        href={item.link}
        key={item.label}
      >
        <item.icon className={classes.linkIcon} stroke={1.5} />
        <span>{item.label}</span>
      </a>
    );
  });

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        {/* <Group className={classes.header} justify="space-between"> */}
        {/* <Group className={classes.header}> */}
        {/* <MantineLogo size={28} /> */}
        {/* <h1>{PROJECT_NAME}</h1>
          <Code fw={700}>v0.0.0</Code> */}
        {/* </Group> */}
        {links}
      </div>

      <div className={classes.footer}>
        {!slimUser && (
          <>
            <a
              href="#"
              className={classes.link}
              onClick={() =>
                modals.openContextModal({
                  modal: "AuthModal",
                  innerProps: {},
                })
              }
            >
              <IconLogin className={classes.linkIcon} stroke={1.5} />
              <span>Login</span>
            </a>
          </>
        )}

        {slimUser && (
          <>
            <a
              href="#"
              className={classes["link-inactive"]}
              onClick={(e) => e.preventDefault()}
            >
              <IconUser className={classes.linkIcon} stroke={1.5} />
              <span>{slimUser.displayName}</span>
            </a>

            <a
              href="#"
              className={classes["link-inactive"]}
              onClick={(e) => e.preventDefault()}
            >
              <IconMail className={classes.linkIcon} stroke={1.5} />
              <span>{slimUser.email}</span>
            </a>

            <a href="#" className={classes.link} onClick={() => handleLogout()}>
              <IconLogout className={classes.linkIcon} stroke={1.5} />
              <span>Logout</span>
            </a>
          </>
        )}
      </div>
    </nav>
  );
};
