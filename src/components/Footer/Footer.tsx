import { Anchor, Avatar, Container, Group, Text } from "@mantine/core";
import { useLocation } from "react-router-dom";

import classes from "./Footer.module.css";

const links = [
  {
    link: "https://github.com/daviseford/survivor-fantasy-ui/",
    label: "Github",
  },
  { link: "//daviseford.com", label: "daviseford.com" },
];

export const Footer = () => {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  const items = links.map((link) => (
    <Anchor
      c="dimmed"
      key={link.label}
      href={link.link}
      size="sm"
      target="_blank"
    >
      {link.label}
    </Anchor>
  ));

  return (
    <div className={`${classes.footer} ${!isHome ? classes.hideOnMobile : ""}`}>
      <Container className={classes.inner}>
        <Avatar src={"/icons/probst.svg"} size={28} alt="" />
        <Text c="dimmed" size="sm">
          Created by Davis Ford
        </Text>
        <Group className={classes.links}>{items}</Group>
      </Container>
    </div>
  );
};
