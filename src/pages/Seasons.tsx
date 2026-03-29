import { useFirestoreQueryData } from "@react-query-firebase/firestore";
import { collection } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "../components/ui/card";
import { db } from "../firebase";
import { useUser } from "../hooks/useUser";
import { Season } from "../types";

export const Seasons = () => {
  const navigate = useNavigate();
  const { slimUser } = useUser();

  const ref = collection(db, "seasons");

  const { data: seasons } = useFirestoreQueryData<Season[], Season[]>(
    ["seasons"],
    // @ts-expect-error asd
    ref,
  );

  return (
    <div>
      <h3 className="p-4 text-lg text-muted-foreground">
        Pick your favorite season in order to learn more about the contestants
        and start a draft!
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {seasons?.map((x) => {
          console.log(x.name);
          if (
            x.name !== "Survivor 46" &&
            x.name !== "Survivor 50" &&
            !slimUser?.isAdmin
          )
            return null;

          return (
            <Card key={x.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <img
                  src={x.img}
                  alt={x.name}
                  className="h-[250px] w-full object-cover"
                />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{x.name}</p>
                  <Badge variant="secondary">Season {x.order}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/seasons/${x.id}`)}
                >
                  Select
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
