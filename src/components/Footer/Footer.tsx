const links = [
  {
    link: "https://github.com/daviseford/survivor-fantasy-ui/",
    label: "Github",
  },
  { link: "//daviseford.com", label: "daviseford.com" },
];

export const Footer = () => {
  return (
    <footer className="border-t">
      <div className="flex flex-col items-center justify-between gap-2 px-6 py-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <img src="/icons/probst.svg" alt="" className="h-7 w-7" />
          <p className="text-sm text-muted-foreground">Created by Davis Ford</p>
        </div>
        <div className="flex gap-4">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.link}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
