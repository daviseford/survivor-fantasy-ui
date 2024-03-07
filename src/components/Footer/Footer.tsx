import { Anchor, Avatar, Container, Group, Text } from "@mantine/core";

import classes from "./Footer.module.css";

const links = [
  {
    link: "https://github.com/daviseford/survivor-fantasy-ui/",
    label: "Github",
  },
  { link: "//daviseford.com", label: "daviseford.com" },
];

export const Footer = () => {
  const items = links.map((link) => (
    <Anchor
      c="dimmed"
      key={link.label}
      href={link.link}
      // onClick={(event) => event.preventDefault()}
      size="sm"
      target="_blank"
    >
      {link.label}
    </Anchor>
  ));

  return (
    <div className={classes.footer}>
      <Container className={classes.inner}>
        <Avatar src={"/icons/probst.svg"} size={28} />
        <Text c="dimmed" size="sm">
          Created by Davis Ford
        </Text>
        <Group className={classes.links}>{items}</Group>
      </Container>
    </div>
  );
};
