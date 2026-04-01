import { createTheme, rem } from "@mantine/core";

export const theme = createTheme({
  headings: {
    sizes: {
      h2: { fontSize: rem(32), fontWeight: "700", lineHeight: "1.3" },
      h3: { fontSize: rem(22), fontWeight: "600", lineHeight: "1.4" },
      h4: { fontSize: rem(17), fontWeight: "600", lineHeight: "1.5" },
    },
  },
  components: {
    Badge: {
      styles: {
        label: {
          textBoxTrim: "none",
        },
      },
    },
  },
});
