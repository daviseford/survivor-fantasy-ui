import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "../components/ui/card";
import { useSeasons } from "../hooks/useSeasons";

export const Seasons = () => {
  const navigate = useNavigate();

  const { data: seasons } = useSeasons();

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold">Seasons</h2>
        <p className="text-sm text-muted-foreground">
          Pick a season to see the contestants and start a draft with friends.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {seasons
          ?.slice()
          .sort((a, b) => b.order - a.order)
          .map((x) => (
            <Card
              key={x.id}
              className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
              onClick={() => navigate(`/seasons/${x.id}`)}
            >
              <CardHeader className="relative p-0">
                <img
                  src={x.img}
                  alt={x.name}
                  className="h-[220px] w-full object-cover"
                />
                <Badge className="absolute right-3 top-3" variant="secondary">
                  Season {x.order}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{x.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {x.players?.length ?? 0} contestants
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
              <CardFooter />
            </Card>
          ))}
      </div>
    </div>
  );
};
