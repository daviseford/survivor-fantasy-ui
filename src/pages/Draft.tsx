import { ref, update } from "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import { shuffle, uniqBy } from "lodash-es";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 } from "uuid";
import { DraftTable } from "../components/DraftTable";
import { MyDraftedPlayers } from "../components/MyPlayers/MyDraftedPlayers";
import { PostDraftPropBetTable } from "../components/PropBetTables/PostDraftPropBetTable";
import { ScoringLegendTable } from "../components/ScoringTables";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { PropBetsQuestions } from "../data/propbets";
import { db, rt_db } from "../firebase";
import { useCompetition } from "../hooks/useCompetition";
import { useDraft } from "../hooks/useDraft";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import {
  Competition,
  Draft,
  PropBetsEntry,
  PropBetsFormData,
  Season,
} from "../types";

export const DraftComponent = () => {
  const navigate = useNavigate();

  const { slimUser } = useUser();
  const { data: season } = useSeason();

  const { draft } = useDraft();
  const { data: competition } = useCompetition(draft?.competiton_id);

  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [playerDetailOpen, setPlayerDetailOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  console.log({ slimUser, draft, competition });

  const userHasSubmittedPropBets = Boolean(
    draft?.prop_bets?.find((x) => x.user_uid === slimUser?.uid),
  );

  const allPlayersDoneWithPropBets =
    draft?.prop_bets &&
    draft?.prop_bets?.length === draft?.participants?.length;

  const showPropBets = draft?.finished && !userHasSubmittedPropBets;

  const isInvalidNumberOfPlayers = !draft
    ? false
    : draft.total_players % draft.participants.length !== 0;

  const addPropBetsToDraft = async (values: PropBetsFormData) => {
    if (!draft || !slimUser || userHasSubmittedPropBets) return;

    const propBetEntry = {
      id: `propbet_${v4()}`,
      user_uid: slimUser?.uid,
      user_name: slimUser.displayName || slimUser.uid,
      values,
    } satisfies PropBetsEntry;

    const _propBets = [...(draft?.prop_bets || []), propBetEntry];

    const _draft = { ...draft, prop_bets: _propBets } satisfies Draft;

    await updateDraft(_draft);
  };

  const createCompetition = async (competition_name: string) => {
    if (!season || !draft) return;

    const comp = {
      id: draft.competiton_id,
      competition_name,
      draft_id: draft.id,
      season_id: season?.id,
      season_num: season?.order,
      creator_uid: draft.creator_uid,
      participant_uids: draft.participants.map((x) => x.uid),
      participants: draft?.participants,
      draft_picks: draft.draft_picks,
      prop_bets: draft.prop_bets,
      finished: false,
      started: false,
      current_episode: null,
    } satisfies Competition;

    console.log("CREATING A COMPETITION: ", comp);
    await setDoc(doc(db, "competitions", comp.id), comp);
  };

  const updateDraft = async (_draft: Draft) => {
    if (!draft?.id) return;
    await update(ref(rt_db), { ["drafts/" + draft.id]: _draft });
  };

  const userIsParticipant = useMemo(() => {
    if (!slimUser || !draft?.participants) return false;
    return draft?.participants.some((x) => x.uid === slimUser?.uid);
  }, [draft, slimUser]);

  const joinDraft = async () => {
    if (!draft || !slimUser?.uid) return;
    await updateDraft({
      ...draft,
      participants: uniqBy([...draft.participants, slimUser], (x) => x.uid),
    });
  };

  const startDraft = async () => {
    console.log("START DRAFT");
    if (!draft || !slimUser?.uid) return;

    const _draftOrder = shuffle(draft.participants);

    const _draft = {
      ...draft,
      started: true,
      current_pick_number: 1,
      current_picker: _draftOrder[0],
      pick_order: _draftOrder,
    } satisfies Draft;

    console.log({ _draftOrder, isInvalidNumberOfPlayers, _draft });

    await updateDraft(_draft);
  };

  const draftPlayer = async (playerName: string) => {
    console.log("Selected " + playerName);

    if (!season || !draft || !slimUser?.uid) return;

    const finished = draft.current_pick_number >= draft.total_players;

    const pickOrderIdxOfLastPicker = draft.pick_order.findIndex(
      (x) => x.uid === draft.current_picker?.uid,
    );

    const nextCurrentPicker = finished
      ? null
      : draft.pick_order?.[pickOrderIdxOfLastPicker + 1] ?? draft.pick_order[0];

    const _draft = {
      ...draft,
      finished,
      current_pick_number: finished
        ? draft?.current_pick_number
        : draft?.current_pick_number + 1,
      current_picker: nextCurrentPicker,
      draft_picks: [
        ...(draft?.draft_picks || []),
        {
          season_id: season.id,
          season_num: season.order,
          order: draft.current_pick_number,
          user_uid: slimUser.uid,
          user_name: slimUser.displayName || slimUser.email || slimUser.uid,
          player_name: playerName,
        },
      ],
    } satisfies Draft;

    if (finished) {
      _draft.current_picker = null;
    }

    console.log(_draft);

    await updateDraft(_draft);
  };

  useEffect(() => {
    if (
      !draft?.finished ||
      competition ||
      draft.creator_uid !== slimUser?.uid ||
      !allPlayersDoneWithPropBets
    )
      return;

    setNameDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition, draft, slimUser?.uid]);

  useEffect(() => {
    if (competition) {
      setNameDialogOpen(false);
    }
  }, [competition]);

  const isPlayerDrafted = (name: string) => {
    if (!draft?.draft_picks) return false;
    return draft.draft_picks.some((x) => x.player_name === name);
  };

  const isCurrentDrafter =
    draft?.started &&
    !draft.finished &&
    draft.current_picker?.uid === slimUser?.uid;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Import AuthDialog lazily to avoid circular deps
  const handleLoginClick = () => {
    setAuthDialogOpen(true);
  };

  if (!season) return <div>Error: Missing data</div>;

  const selectedPlayer = season.players.find(
    (p) => p.name === playerDetailOpen,
  );

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {season && !slimUser && (
          <Button onClick={handleLoginClick}>Log in to join this draft</Button>
        )}

        {draft && !userIsParticipant && slimUser && (
          <Button onClick={joinDraft}>Join Draft</Button>
        )}

        {draft &&
          !draft?.started &&
          draft.creator_uid === slimUser?.uid &&
          !isInvalidNumberOfPlayers && (
            <Button
              onClick={startDraft}
              disabled={draft.participants.length < 2}
            >
              Start Draft
              {draft.participants.length < 2
                ? " (waiting for more players)"
                : ""}
            </Button>
          )}

        {draft && !draft?.started && draft.creator_uid !== slimUser?.uid && (
          <Button disabled>Waiting for host to start the draft</Button>
        )}

        {draft && !draft?.started && (
          <Button variant="outline" onClick={handleCopyUrl}>
            {copied
              ? "Copied url"
              : "Invite friends to join this draft (send them this url)"}
          </Button>
        )}

        {draft?.finished && allPlayersDoneWithPropBets && competition && (
          <Button
            onClick={() => navigate(`/competitions/${draft.competiton_id}`)}
          >
            Go to your newly created competition to get started
          </Button>
        )}
      </div>

      {/* Invalid players warning */}
      {draft && isInvalidNumberOfPlayers && (
        <Alert variant="destructive">
          <AlertDescription>
            You cannot draft evenly with this number of players. Please invite a
            friend or start over.
          </AlertDescription>
        </Alert>
      )}

      {/* Status breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
        <span>Draft ID: ...{draft?.id.slice(-4)}</span>
        <span className="text-muted-foreground">|</span>
        <span>
          Status:{" "}
          {!draft
            ? "Not created"
            : draft.finished
              ? "Finished"
              : draft?.started
                ? "Started"
                : "Not started"}
        </span>
        <span className="text-muted-foreground">|</span>
        <span>
          Participants:{" "}
          {draft?.participants
            .map((x) => x.displayName || x.email || x.uid)
            .join(", ")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
        {Boolean(draft?.current_pick_number) && (
          <>
            <span>Current Pick: {draft?.current_pick_number}</span>
            <span className="text-muted-foreground">|</span>
          </>
        )}
        {draft?.current_picker && (
          <>
            <span>
              Picking:{" "}
              {draft?.current_picker?.displayName ||
                draft?.current_picker?.email}
            </span>
            <span className="text-muted-foreground">|</span>
          </>
        )}
        {draft?.draft_picks && (
          <>
            <span>
              Remaining Picks:{" "}
              {draft?.total_players - (draft?.draft_picks?.length || 0)}
            </span>
            <span className="text-muted-foreground">|</span>
          </>
        )}
        {draft?.pick_order && (
          <span>
            Draft Order:{" "}
            {draft.pick_order.map((x) => x.displayName || x.email).join(", ")}
          </span>
        )}
      </div>

      {/* My drafted players */}
      {Boolean(draft?.draft_picks?.length) && (
        <div className="flex justify-center p-4">
          <MyDraftedPlayers />
        </div>
      )}

      {/* Current picker status */}
      {draft?.current_picker && (
        <div className="py-6 text-center">
          <h2
            className={`text-3xl font-bold ${draft.current_picker.uid === slimUser?.uid ? "text-blue-500" : "text-muted-foreground"}`}
          >
            {draft.current_picker.uid === slimUser?.uid
              ? "You are up!"
              : `${draft.current_picker.displayName || draft.current_picker.email} is picking`}
          </h2>
        </div>
      )}
      {draft?.finished && (
        <div className="py-6 text-center">
          <h2 className="text-3xl font-bold text-blue-500">Finished!</h2>
        </div>
      )}

      {/* Prop bets form */}
      {season && showPropBets && (
        <div className="space-y-2 p-4">
          <h3 className="text-lg font-semibold">Place your bets!</h3>
          <p className="text-muted-foreground">
            You can pick any player for these answers, even ones you haven't
            drafted.
          </p>
          <PropBets season={season} onSubmit={addPropBetsToDraft} />
        </div>
      )}

      {/* Post-draft prop bets */}
      {draft?.finished && userHasSubmittedPropBets && (
        <div className="p-4">
          <h2 className="text-center text-2xl font-bold">Prop Bets</h2>
          <PostDraftPropBetTable />
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {season.players.map((p) => {
          const isDrafted = isPlayerDrafted(p.name);

          const draftedBy = !isDrafted
            ? null
            : draft?.draft_picks.find((x) => x.player_name === p.name);
          return (
            <Card
              key={p.name + "-grid"}
              className={isDrafted ? "bg-muted" : ""}
            >
              <CardContent className="flex flex-col items-center pt-6">
                <Avatar
                  className="h-28 w-28 cursor-pointer"
                  onClick={() => setPlayerDetailOpen(p.name)}
                >
                  <AvatarImage src={p.img} />
                  <AvatarFallback>{p.name[0]}</AvatarFallback>
                </Avatar>
                <p className="mt-3 text-center text-lg font-medium">
                  {p.name}
                </p>
                {p.description && (
                  <p className="text-center text-sm text-muted-foreground">
                    {p.description.split(" | ").map((x, i) => (
                      <span key={i}>
                        {x}
                        <br />
                      </span>
                    ))}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap justify-center gap-1">
                  <Badge variant="secondary">Season {season.order}</Badge>
                  {draftedBy && (
                    <Badge>Drafted by {draftedBy.user_name}</Badge>
                  )}
                  <Badge variant={isDrafted ? "destructive" : "outline"}>
                    {isDrafted ? "Drafted" : "Available"}
                  </Badge>
                </div>

                {!isDrafted && (
                  <Button
                    className="mt-3 w-full"
                    onClick={() => draftPlayer(p.name)}
                    disabled={
                      !draft?.started ||
                      draft.finished ||
                      !isCurrentDrafter ||
                      isDrafted
                    }
                  >
                    Draft Me
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Draft results table */}
      {draft?.started && (
        <div className="p-4">
          <h2 className="mb-4 text-center text-2xl font-bold">
            Draft Results
          </h2>
          <DraftTable
            draft_picks={draft.draft_picks}
            participants={draft.participants}
            players={season.players}
          />
        </div>
      )}

      <div className="p-4">
        <h2 className="mb-4 text-center text-2xl font-bold">Scoring Legend</h2>
        <ScoringLegendTable />
      </div>

      {/* Name your competition dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>What should we call your Competition?</DialogTitle>
          </DialogHeader>
          <NameYourCompetition
            onSubmit={async (values) => {
              setNameDialogOpen(false);
              await createCompetition(values.name);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Player detail dialog */}
      <Dialog
        open={!!playerDetailOpen}
        onOpenChange={() => setPlayerDetailOpen(null)}
      >
        <DialogContent>
          {selectedPlayer && (
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl font-bold">{selectedPlayer.name}</h2>
              <img
                src={selectedPlayer.img}
                alt={selectedPlayer.name}
                className="w-full rounded-lg"
              />
              {selectedPlayer.description && (
                <p className="text-center text-lg text-muted-foreground">
                  {selectedPlayer.description.split(" | ").map((x, i) => (
                    <span key={i}>
                      {x}
                      <br />
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auth dialog for draft page */}
      {authDialogOpen && (
        <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log in to join this draft</DialogTitle>
            </DialogHeader>
            <AuthDialogInline onSuccess={() => setAuthDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Inline auth for the draft page to avoid importing from AppRoutes
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Login } from "../components/Auth/Login";
import { Register } from "../components/Auth/Register";

const AuthDialogInline = ({ onSuccess }: { onSuccess: () => void }) => (
  <Tabs defaultValue="login">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="login">Login</TabsTrigger>
      <TabsTrigger value="register">Register</TabsTrigger>
    </TabsList>
    <TabsContent value="login">
      <Login onSuccess={onSuccess} />
    </TabsContent>
    <TabsContent value="register">
      <Register onSuccess={onSuccess} />
    </TabsContent>
  </Tabs>
);

const NameYourCompetition = ({
  onSubmit,
}: {
  onSubmit: (values: { name: string }) => void;
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Do a fun name :)");
      return;
    }
    setError("");
    onSubmit({ name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name your competition</Label>
        <Input
          placeholder="Jeff Probst Lovers"
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      <Button type="submit" className="w-full">
        Submit
      </Button>
    </form>
  );
};

type PropBetsProps = {
  season: Season;
  onSubmit: (values: PropBetsFormData) => void;
};

const propBetKeys: (keyof PropBetsFormData)[] = [
  "propbet_winner",
  "propbet_first_vote",
  "propbet_idols",
  "propbet_immunities",
  "propbet_ftc",
  "propbet_medical_evac",
];

const PropBets = ({ season, onSubmit }: PropBetsProps) => {
  const [values, setValues] = useState<PropBetsFormData>({
    propbet_first_vote: "",
    propbet_ftc: "",
    propbet_idols: "",
    propbet_immunities: "",
    propbet_medical_evac: "",
    propbet_winner: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PropBetsFormData, string>>>({});

  const players = season?.players.map((x) => x.name);

  const propBetFields: { key: keyof PropBetsFormData; data: string[] }[] = [
    { key: "propbet_winner", data: players },
    { key: "propbet_first_vote", data: players },
    { key: "propbet_idols", data: players },
    { key: "propbet_immunities", data: players },
    { key: "propbet_ftc", data: players },
    { key: "propbet_medical_evac", data: ["Yes", "No"] },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof PropBetsFormData, string>> = {};
    for (const key of propBetKeys) {
      if (!values[key]) newErrors[key] = "Enter an answer";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit(values);
  };

  const updateField = (key: keyof PropBetsFormData, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {propBetFields.map(({ key, data }) => (
        <div key={key} className="space-y-1">
          <Label>{PropBetsQuestions[key].description}</Label>
          <p className="text-xs text-muted-foreground">
            {PropBetsQuestions[key].point_value} points
          </p>
          <Select
            value={values[key]}
            onValueChange={(val) => updateField(key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {data.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors[key] && (
            <p className="text-sm text-destructive">{errors[key]}</p>
          )}
        </div>
      ))}

      <Button type="submit">Submit Prop Bets</Button>
    </form>
  );
};
