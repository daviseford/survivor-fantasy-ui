import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

export const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl py-20 sm:py-32">
      <h1 className="text-4xl font-black leading-tight sm:text-6xl">
        Live out your{" "}
        <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
          Survivor Fantasy
        </span>{" "}
        from your couch
      </h1>

      <p className="mt-6 text-lg text-muted-foreground sm:text-2xl">
        Just like fantasy football, but with a twist, Survivor Fantasy lets you
        assemble your dream team of Survivor contestants and watch as they
        outwit, outplay, and outlast their way to victory.
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <Button
          size="lg"
          className="bg-gradient-to-r from-blue-500 to-cyan-500 px-8 text-lg text-white"
          onClick={() => navigate("/seasons")}
        >
          Get started
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="px-8 text-lg"
          onClick={() =>
            window.open(
              "https://github.com/daviseford/survivor-fantasy-ui/",
              "_blank",
            )
          }
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          GitHub
        </Button>
      </div>
    </div>
  );
};
