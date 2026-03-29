import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Card, CardContent } from "../components/ui/card";
import { useSeason } from "../hooks/useSeason";
import { Player } from "../types";

export const Players = () => {
  const { data: season } = useSeason();

  if (!season) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {season.players.map((x) => (
        <PlayerCard {...x} key={x.name} />
      ))}
    </div>
  );
};

const PlayerCard = (props: Player) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center pt-6">
        <Avatar className="h-28 w-28">
          <AvatarImage src={props.img} alt={props.name} />
          <AvatarFallback>{props.name[0]}</AvatarFallback>
        </Avatar>
        <p className="mt-3 text-center text-lg font-medium">{props.name}</p>
        <p className="text-center text-sm text-muted-foreground">
          Season {props.season_num}
        </p>
      </CardContent>
    </Card>
  );
};
