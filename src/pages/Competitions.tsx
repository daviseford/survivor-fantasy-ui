import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useCompetitions } from "../hooks/useCompetitions";
import { useIsMobile } from "../hooks/useIsMobile";
import { useMyCompetitions } from "../hooks/useMyCompetitions";
import { useUser } from "../hooks/useUser";

export const Competitions = () => {
  const { slimUser } = useUser();

  const isMobile = useIsMobile();

  const navigate = useNavigate();

  const { data: competitions, isLoading } = useMyCompetitions();
  const { data: allCompetitions } = useCompetitions();

  // prefer all comps if admin has access is in it
  const _comps =
    (allCompetitions?.length ? allCompetitions : competitions) || [];

  if (!slimUser) {
    return (
      <Alert>
        <AlertDescription>
          Please register or log in to view your competitions!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">Competitions</h2>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!isLoading && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Participants</TableHead>
                {!isMobile && (
                  <>
                    <TableHead>Creator</TableHead>
                    <TableHead>ID</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {_comps?.map((x) => (
                <TableRow
                  key={x.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/competitions/${x.id}`)}
                >
                  <TableCell>{x.competition_name}</TableCell>
                  <TableCell>{x.season_num}</TableCell>
                  <TableCell>
                    {x.participants
                      .map((x) => x.displayName ?? x.email)
                      .join(", ")}
                  </TableCell>
                  {!isMobile && (
                    <>
                      <TableCell>
                        {
                          x.participants.find((p) => p.uid === x.creator_uid)
                            ?.displayName
                        }
                      </TableCell>
                      <TableCell>{x.draft_id.slice(-4)}</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
